import { beforeEach, describe, expect, it } from "vitest";

import {
  analyticsSessionToken,
  getAnalyticsPreference,
  setAnalyticsPreference,
} from "@/lib/analytics/privacy";
import {
  AnalyticsConfigurationError,
  analyticsRateLimitKey,
  analyticsRetentionCutoff,
  getAnalyticsRetentionDays,
  hashAnalyticsSessionToken,
} from "@/lib/analytics/privacy.server";

function setPrivacySignals({
  globalPrivacyControl = false,
  doNotTrack = null,
}: {
  globalPrivacyControl?: boolean;
  doNotTrack?: string | null;
} = {}) {
  Object.defineProperty(navigator, "globalPrivacyControl", {
    configurable: true,
    value: globalPrivacyControl,
  });
  Object.defineProperty(navigator, "doNotTrack", {
    configurable: true,
    value: doNotTrack,
  });
  Object.defineProperty(window, "doNotTrack", {
    configurable: true,
    value: doNotTrack,
  });
}

describe("browser analytics privacy", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    setPrivacySignals();
  });

  it("does not create a session token before explicit consent", () => {
    expect(getAnalyticsPreference()).toBe("unknown");
    expect(analyticsSessionToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("creates a session-scoped token after consent and clears it on decline", () => {
    setAnalyticsPreference("granted");
    const first = analyticsSessionToken();

    expect(getAnalyticsPreference()).toBe("granted");
    expect(first).toMatch(/^[a-f0-9]{32,48}$/);
    expect(analyticsSessionToken()).toBe(first);

    setAnalyticsPreference("denied");
    expect(getAnalyticsPreference()).toBe("denied");
    expect(analyticsSessionToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });

  it("lets Global Privacy Control override a stored grant", () => {
    setAnalyticsPreference("granted");
    expect(analyticsSessionToken()).not.toBeNull();

    setPrivacySignals({ globalPrivacyControl: true });

    expect(getAnalyticsPreference()).toBe("privacy-signal");
    expect(analyticsSessionToken()).toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
});

describe("server analytics privacy", () => {
  const environment = {
    NODE_ENV: "production",
    ANALYTICS_HASH_SECRET: "a-secure-dedicated-analytics-secret-1234",
    ANALYTICS_RETENTION_DAYS: "30",
  };
  const firstDay = new Date("2026-08-04T10:30:00.000Z");
  const nextDay = new Date("2026-08-05T00:00:00.000Z");

  it("uses purpose-separated daily HMAC digests", () => {
    const token = "private-browser-session-token";
    const stored = hashAnalyticsSessionToken(token, environment, firstDay);
    const rateKey = analyticsRateLimitKey(token, environment, firstDay);

    expect(stored).toMatch(/^[a-f0-9]{64}$/);
    expect(stored).not.toContain(token);
    expect(rateKey).toMatch(/^analytics:[a-f0-9]{64}$/);
    expect(rateKey).not.toContain(token);
    expect(rateKey.slice("analytics:".length)).not.toBe(stored);
    expect(hashAnalyticsSessionToken(token, environment, firstDay)).toBe(
      stored,
    );
    expect(hashAnalyticsSessionToken(token, environment, nextDay)).not.toBe(
      stored,
    );
  });

  it("computes and validates the retention cutoff", () => {
    expect(getAnalyticsRetentionDays(environment)).toBe(30);
    expect(analyticsRetentionCutoff(firstDay, environment).toISOString()).toBe(
      "2026-07-05T10:30:00.000Z",
    );
    expect(() =>
      getAnalyticsRetentionDays({
        ...environment,
        ANALYTICS_RETENTION_DAYS: "0",
      }),
    ).toThrow(AnalyticsConfigurationError);
  });

  it("requires a dedicated production hashing secret", () => {
    expect(() =>
      hashAnalyticsSessionToken("token", {
        NODE_ENV: "production",
        ANALYTICS_RETENTION_DAYS: "90",
      }),
    ).toThrow(AnalyticsConfigurationError);
  });
});
