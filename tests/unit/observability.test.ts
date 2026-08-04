import { describe, expect, it, vi } from "vitest";

import { logOperationalFailure } from "@/lib/observability/operational-log";
import {
  getReleaseIdentifier,
  healthResponseHeaders,
} from "@/lib/observability/release";

describe("operational observability", () => {
  it("selects a safe release identifier", () => {
    expect(
      getReleaseIdentifier({
        APP_VERSION: "release-2026.08.04",
        VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
      }),
    ).toBe("release-2026.08.04");
    expect(
      getReleaseIdentifier({
        APP_VERSION: "invalid release value",
        VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
      }),
    ).toBe("abcdef123456");
  });

  it("marks health responses as non-cacheable and release-specific", () => {
    const headers = new Headers(healthResponseHeaders("release-123"));
    expect(headers.get("cache-control")).toContain("no-store");
    expect(headers.get("x-dn360-release")).toBe("release-123");
  });

  it("logs an error category without leaking the raw error message", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    logOperationalFailure(
      "readiness_database_failed",
      new Error("mysql://user:password@private-host/database"),
      { release: "release-123", dependency: "database" },
    );

    const entry = String(consoleError.mock.calls[0]?.[0]);
    expect(JSON.parse(entry)).toMatchObject({
      level: "error",
      event: "readiness_database_failed",
      errorType: "Error",
      release: "release-123",
      dependency: "database",
    });
    expect(entry).not.toContain("password");
    consoleError.mockRestore();
  });
});
