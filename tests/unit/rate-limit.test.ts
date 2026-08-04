import type { Redis } from "@upstash/redis";
import { describe, expect, it, vi } from "vitest";

import {
  createRateLimitStore,
  MemoryRateLimitStore,
  RateLimitConfigurationError,
  RateLimitUnavailableError,
  requestAddress,
  UpstashRateLimitStore,
} from "@/lib/rate-limit";

describe("memory rate limiting", () => {
  it("preserves fixed-window limits and resets after expiry", async () => {
    let now = 1_000;
    const store = new MemoryRateLimitStore(() => now);

    await expect(store.consume("login:visitor", 2, 10_000)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    await expect(store.consume("login:visitor", 2, 10_000)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
    await expect(store.consume("login:visitor", 2, 10_000)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 10,
    });

    now = 11_000;
    await expect(store.consume("login:visitor", 2, 10_000)).resolves.toEqual({
      allowed: true,
      retryAfterSeconds: 0,
    });
  });

  it("rejects invalid limiter settings", async () => {
    const store = new MemoryRateLimitStore();
    await expect(store.consume("", 1, 1_000)).rejects.toBeInstanceOf(
      RateLimitConfigurationError,
    );
    await expect(store.consume("key", 0, 1_000)).rejects.toBeInstanceOf(
      RateLimitConfigurationError,
    );
  });
});

describe("Upstash rate limiting", () => {
  it("uses one atomic script and returns the shared TTL", async () => {
    const evaluate = vi.fn().mockResolvedValue([6, 61_001]);
    const store = new UpstashRateLimitStore(
      { eval: evaluate } as unknown as Pick<Redis, "eval">,
      "test:limits",
    );

    await expect(
      store.consume("login:203.0.113.10", 5, 900_000),
    ).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 62,
    });

    expect(evaluate).toHaveBeenCalledOnce();
    expect(evaluate).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('INCR', KEYS[1])"),
      [expect.stringMatching(/^test:limits:[a-f0-9]{64}$/)],
      ["900000"],
    );
    expect(evaluate.mock.calls[0]?.[1]?.[0]).not.toContain("203.0.113.10");
  });

  it("fails safely when Redis returns an invalid response", async () => {
    const store = new UpstashRateLimitStore({
      eval: vi.fn().mockResolvedValue(null),
    } as unknown as Pick<Redis, "eval">);

    await expect(
      store.consume("analytics:visitor", 60, 60_000),
    ).rejects.toBeInstanceOf(RateLimitUnavailableError);
  });
});

describe("rate-limit configuration", () => {
  it("uses memory by default outside production", () => {
    expect(createRateLimitStore({ NODE_ENV: "development" })).toBeInstanceOf(
      MemoryRateLimitStore,
    );
  });

  it("requires shared Redis in production", () => {
    expect(() => createRateLimitStore({ NODE_ENV: "production" })).toThrow(
      RateLimitConfigurationError,
    );
    expect(() =>
      createRateLimitStore({
        NODE_ENV: "production",
        RATE_LIMIT_DRIVER: "memory",
      }),
    ).toThrow(/disabled in production/i);
  });

  it("creates the shared adapter from complete production settings", () => {
    expect(
      createRateLimitStore({
        NODE_ENV: "production",
        RATE_LIMIT_DRIVER: "upstash",
        UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret-token",
        RATE_LIMIT_PREFIX: "tour:limits",
      }),
    ).toBeInstanceOf(UpstashRateLimitStore);
  });

  it("rejects an insecure Redis endpoint", () => {
    expect(() =>
      createRateLimitStore({
        NODE_ENV: "production",
        RATE_LIMIT_DRIVER: "upstash",
        UPSTASH_REDIS_REST_URL: "http://example.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "secret-token",
      }),
    ).toThrow(/HTTPS URL/i);
  });
});

describe("request addresses", () => {
  it("uses the first forwarded address", () => {
    const request = new Request("http://localhost", {
      headers: {
        "X-Forwarded-For": "203.0.113.5, 10.0.0.2",
        "X-Real-IP": "10.0.0.3",
      },
    });

    expect(requestAddress(request)).toBe("203.0.113.5");
  });

  it("falls back without throwing when proxy headers are absent", () => {
    expect(requestAddress(new Request("http://localhost"))).toBe("local");
  });
});
