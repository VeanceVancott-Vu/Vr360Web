import { createHmac } from "node:crypto";

type AnalyticsEnvironment = Record<string, string | undefined>;

const DEVELOPMENT_SECRET = "development-only-dn360-analytics-hash-secret";
const DEFAULT_RETENTION_DAYS = 90;

export class AnalyticsConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalyticsConfigurationError";
  }
}

function analyticsHashSecret(environment: AnalyticsEnvironment): string {
  const configured = environment.ANALYTICS_HASH_SECRET?.trim();
  if (configured && configured.length >= 32) return configured;
  if (configured) {
    throw new AnalyticsConfigurationError(
      "ANALYTICS_HASH_SECRET must contain at least 32 characters.",
    );
  }
  if (environment.NODE_ENV === "production") {
    throw new AnalyticsConfigurationError(
      "ANALYTICS_HASH_SECRET is required in production.",
    );
  }
  return DEVELOPMENT_SECRET;
}

export function getAnalyticsRetentionDays(
  environment: AnalyticsEnvironment = process.env,
): number {
  const configured = environment.ANALYTICS_RETENTION_DAYS?.trim();
  if (!configured) return DEFAULT_RETENTION_DAYS;
  const days = Number(configured);
  if (!Number.isSafeInteger(days) || days < 1 || days > 365) {
    throw new AnalyticsConfigurationError(
      "ANALYTICS_RETENTION_DAYS must be an integer between 1 and 365.",
    );
  }
  return days;
}

function utcDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dailyDigest(
  purpose: "rate-limit-address" | "session-token",
  value: string,
  environment: AnalyticsEnvironment,
  date: Date,
): string {
  return createHmac("sha256", analyticsHashSecret(environment))
    .update(purpose)
    .update("\0")
    .update(utcDay(date))
    .update("\0")
    .update(value)
    .digest("hex");
}

export function hashAnalyticsSessionToken(
  token: string,
  environment: AnalyticsEnvironment = process.env,
  date: Date = new Date(),
): string {
  return dailyDigest("session-token", token, environment, date);
}

export function analyticsRateLimitKey(
  address: string,
  environment: AnalyticsEnvironment = process.env,
  date: Date = new Date(),
): string {
  return (
    "analytics:" + dailyDigest("rate-limit-address", address, environment, date)
  );
}

export function analyticsRetentionCutoff(
  now: Date = new Date(),
  environment: AnalyticsEnvironment = process.env,
): Date {
  const cutoff = new Date(now);
  cutoff.setUTCDate(
    cutoff.getUTCDate() - getAnalyticsRetentionDays(environment),
  );
  return cutoff;
}

export function assertAnalyticsConfiguration(
  environment: AnalyticsEnvironment = process.env,
): void {
  analyticsHashSecret(environment);
  getAnalyticsRetentionDays(environment);
}
