import { Redis } from "@upstash/redis";
import { createHash } from "node:crypto";
import { isIP } from "node:net";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimitStore {
  consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult>;
  inspect(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult>;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export class RateLimitConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitConfigurationError";
  }
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("The shared rate-limit store is unavailable.");
    this.name = "RateLimitUnavailableError";
  }
}

function validateArguments(key: string, limit: number, windowMs: number) {
  if (!key || key.length > 512) {
    throw new RateLimitConfigurationError(
      "Rate-limit keys must contain between 1 and 512 characters.",
    );
  }
  if (!Number.isSafeInteger(limit) || limit <= 0) {
    throw new RateLimitConfigurationError(
      "Rate-limit counts must be positive integers.",
    );
  }
  if (!Number.isSafeInteger(windowMs) || windowMs <= 0) {
    throw new RateLimitConfigurationError(
      "Rate-limit windows must be positive integer milliseconds.",
    );
  }
}

function scopedKey(key: string, limit: number, windowMs: number) {
  return limit + ":" + windowMs + ":" + key;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();
  private operations = 0;

  constructor(private readonly now: () => number = Date.now) {}

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    validateArguments(key, limit, windowMs);
    const now = this.now();
    const bucketKey = scopedKey(key, limit, windowMs);
    const existing = this.buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      this.buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
      this.removeExpiredBuckets(now);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    if (existing.count >= limit) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((existing.resetAt - now) / 1000),
        ),
      };
    }
    existing.count += 1;
    this.removeExpiredBuckets(now);
    return { allowed: true, retryAfterSeconds: 0 };
  }

  async inspect(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    validateArguments(key, limit, windowMs);
    const now = this.now();
    const bucketKey = scopedKey(key, limit, windowMs);
    const existing = this.buckets.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      if (existing) this.buckets.delete(bucketKey);
      return { allowed: true, retryAfterSeconds: 0 };
    }
    return existing.count >= limit
      ? {
          allowed: false,
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((existing.resetAt - now) / 1000),
          ),
        }
      : { allowed: true, retryAfterSeconds: 0 };
  }

  private removeExpiredBuckets(now: number) {
    this.operations += 1;
    if (this.operations % 500 !== 0) return;
    for (const [key, bucket] of this.buckets) {
      if (bucket.resetAt <= now) this.buckets.delete(key);
    }
  }
}

const fixedWindowScript = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then",
  "  redis.call('PEXPIRE', KEYS[1], ARGV[1])",
  "end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "if ttl < 0 then",
  "  redis.call('PEXPIRE', KEYS[1], ARGV[1])",
  "  ttl = tonumber(ARGV[1])",
  "end",
  "return {count, ttl}",
].join("\n");

const inspectFixedWindowScript = [
  "local count = redis.call('GET', KEYS[1])",
  "if not count then return {0, 0} end",
  "local ttl = redis.call('PTTL', KEYS[1])",
  "if ttl <= 0 then return {0, 0} end",
  "return {tonumber(count), ttl}",
].join("\n");

type RedisEvalClient = Pick<Redis, "eval">;

export class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private readonly client: RedisEvalClient,
    private readonly prefix = "vr360:rate-limit",
  ) {
    if (!/^[a-zA-Z0-9:_-]{1,80}$/.test(prefix)) {
      throw new RateLimitConfigurationError(
        "RATE_LIMIT_PREFIX contains unsupported characters.",
      );
    }
  }

  async consume(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    validateArguments(key, limit, windowMs);
    const digest = createHash("sha256")
      .update(scopedKey(key, limit, windowMs))
      .digest("hex");
    const redisKey = this.prefix + ":" + digest;

    try {
      const result = await this.client.eval<[string], unknown>(
        fixedWindowScript,
        [redisKey],
        [String(windowMs)],
      );
      if (!Array.isArray(result) || result.length < 2) {
        throw new RateLimitUnavailableError();
      }
      const count = Number(result[0]);
      const ttlMs = Number(result[1]);
      if (
        !Number.isSafeInteger(count) ||
        count <= 0 ||
        !Number.isFinite(ttlMs) ||
        ttlMs <= 0
      ) {
        throw new RateLimitUnavailableError();
      }
      return count > limit
        ? {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
          }
        : { allowed: true, retryAfterSeconds: 0 };
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) throw error;
      throw new RateLimitUnavailableError();
    }
  }

  async inspect(
    key: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitResult> {
    validateArguments(key, limit, windowMs);
    const digest = createHash("sha256")
      .update(scopedKey(key, limit, windowMs))
      .digest("hex");
    const redisKey = this.prefix + ":" + digest;

    try {
      const result = await this.client.eval<[], unknown>(
        inspectFixedWindowScript,
        [redisKey],
        [],
      );
      if (!Array.isArray(result) || result.length < 2) {
        throw new RateLimitUnavailableError();
      }
      const count = Number(result[0]);
      const ttlMs = Number(result[1]);
      if (
        !Number.isSafeInteger(count) ||
        count < 0 ||
        !Number.isFinite(ttlMs) ||
        ttlMs < 0 ||
        (count > 0 && ttlMs === 0)
      ) {
        throw new RateLimitUnavailableError();
      }
      return count >= limit
        ? {
            allowed: false,
            retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
          }
        : { allowed: true, retryAfterSeconds: 0 };
    } catch (error) {
      if (error instanceof RateLimitUnavailableError) throw error;
      throw new RateLimitUnavailableError();
    }
  }
}

type RateLimitEnvironment = Record<string, string | undefined>;

function requiredEnvironmentValue(
  environment: RateLimitEnvironment,
  key: string,
) {
  const value = environment[key]?.trim();
  if (!value) {
    throw new RateLimitConfigurationError(
      key + " is required when RATE_LIMIT_DRIVER=upstash.",
    );
  }
  return value;
}

function validatedUpstashUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new RateLimitConfigurationError(
      "UPSTASH_REDIS_REST_URL must be a valid HTTPS URL.",
    );
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new RateLimitConfigurationError(
      "UPSTASH_REDIS_REST_URL must be a credential-free HTTPS URL.",
    );
  }
  return value.replace(/\/+$/g, "");
}

export function createRateLimitStore(
  environment: RateLimitEnvironment = process.env,
): RateLimitStore {
  trustsProxyHeaders(environment);
  const configuredDriver = environment.RATE_LIMIT_DRIVER?.trim();
  const driver =
    configuredDriver ||
    (environment.NODE_ENV === "production" ? undefined : "memory");

  if (!driver) {
    throw new RateLimitConfigurationError(
      "RATE_LIMIT_DRIVER=upstash is required in production.",
    );
  }
  if (driver === "memory") {
    if (environment.NODE_ENV === "production") {
      throw new RateLimitConfigurationError(
        "In-memory rate limiting is disabled in production. Configure RATE_LIMIT_DRIVER=upstash.",
      );
    }
    return new MemoryRateLimitStore();
  }
  if (driver !== "upstash") {
    throw new RateLimitConfigurationError(
      "RATE_LIMIT_DRIVER must be memory or upstash.",
    );
  }

  const url = validatedUpstashUrl(
    requiredEnvironmentValue(environment, "UPSTASH_REDIS_REST_URL"),
  );
  const token = requiredEnvironmentValue(
    environment,
    "UPSTASH_REDIS_REST_TOKEN",
  );
  const prefix = environment.RATE_LIMIT_PREFIX?.trim() || "vr360:rate-limit";
  return new UpstashRateLimitStore(new Redis({ url, token }), prefix);
}

let rateLimitStore: RateLimitStore | undefined;

export function getRateLimitStore() {
  rateLimitStore ??= createRateLimitStore();
  return rateLimitStore;
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return getRateLimitStore().consume(key, limit, windowMs);
}

export async function inspectRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  return getRateLimitStore().inspect(key, limit, windowMs);
}

function trustsProxyHeaders(environment: RateLimitEnvironment): boolean {
  const configured = environment.TRUST_PROXY_HEADERS?.trim().toLowerCase();
  if (!configured || configured === "false") return false;
  if (configured === "true") return true;
  throw new RateLimitConfigurationError(
    "TRUST_PROXY_HEADERS must be true or false.",
  );
}

export function requestAddress(
  request: Request,
  environment: RateLimitEnvironment = process.env,
): string {
  if (!trustsProxyHeaders(environment)) return "local";

  const forwardedAddress = request.headers
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const realAddress = request.headers.get("x-real-ip")?.trim();
  if (forwardedAddress && isIP(forwardedAddress)) return forwardedAddress;
  if (realAddress && isIP(realAddress)) return realAddress;
  return "local";
}
