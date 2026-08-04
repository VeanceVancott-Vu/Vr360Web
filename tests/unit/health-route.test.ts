import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const healthMocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  getServerEnvironment: vi.fn(),
  getPublicDataMode: vi.fn(),
  createMediaStorage: vi.fn(),
  createRateLimitStore: vi.fn(),
  assertAnalyticsConfiguration: vi.fn(),
}));

vi.mock("@/lib/database/client", () => ({
  prisma: { $queryRaw: healthMocks.queryRaw },
}));

vi.mock("@/lib/env.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env.server")>();
  return {
    ...actual,
    getServerEnvironment: healthMocks.getServerEnvironment,
    getPublicDataMode: healthMocks.getPublicDataMode,
  };
});

vi.mock("@/lib/media/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/storage")>();
  return {
    ...actual,
    createMediaStorage: healthMocks.createMediaStorage,
  };
});

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    createRateLimitStore: healthMocks.createRateLimitStore,
  };
});

vi.mock("@/lib/analytics/privacy.server", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/analytics/privacy.server")>();
  return {
    ...actual,
    assertAnalyticsConfiguration: healthMocks.assertAnalyticsConfiguration,
  };
});

import { GET as health } from "@/app/api/health/route";
import { GET as liveness } from "@/app/api/health/live/route";
import { ServerEnvironmentError } from "@/lib/env.server";

beforeEach(() => {
  vi.stubEnv("APP_VERSION", "test-release");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readiness endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    healthMocks.getServerEnvironment.mockReturnValue({
      NODE_ENV: "test",
      DATABASE_URL: undefined,
    });
    healthMocks.getPublicDataMode.mockReturnValue("bundled-demo");
    healthMocks.queryRaw.mockResolvedValue([{ result: 1 }]);
  });

  it("reports local bundled-demo mode as ready without touching the database", async () => {
    const response = await health();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        readiness: "ready",
        environment: "test",
        database: "not-configured",
        dataSource: "bundled-demo",
      },
    });
    expect(healthMocks.queryRaw).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-dn360-release")).toBe("test-release");
  });

  it("checks the database in database mode", async () => {
    healthMocks.getPublicDataMode.mockReturnValue("database");

    const response = await health();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        readiness: "ready",
        database: "available",
        dataSource: "database",
      },
    });
    expect(healthMocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("validates storage, analytics, and shared throttling configuration in production", async () => {
    healthMocks.getServerEnvironment.mockReturnValue({
      NODE_ENV: "production",
      DATABASE_URL: "mysql://production",
    });
    healthMocks.getPublicDataMode.mockReturnValue("database");

    const response = await health();

    expect(response.status).toBe(200);
    expect(healthMocks.createMediaStorage).toHaveBeenCalledOnce();
    expect(healthMocks.createRateLimitStore).toHaveBeenCalledOnce();
    expect(healthMocks.assertAnalyticsConfiguration).toHaveBeenCalledOnce();
    expect(healthMocks.queryRaw).toHaveBeenCalledOnce();
  });

  it("returns 503 for invalid production configuration", async () => {
    healthMocks.getServerEnvironment.mockImplementationOnce(() => {
      throw new ServerEnvironmentError("Missing configuration.", [
        "DATABASE_URL",
      ]);
    });

    const response = await health();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "CONFIGURATION_ERROR" },
    });
    expect(healthMocks.queryRaw).not.toHaveBeenCalled();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("returns 503 when the configured database is unavailable", async () => {
    healthMocks.getPublicDataMode.mockReturnValue("database");
    healthMocks.queryRaw.mockRejectedValueOnce(new Error("database offline"));

    const response = await health();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "DATABASE_UNAVAILABLE" },
    });
  });
});

describe("liveness endpoint", () => {
  it("reports the process and release without checking dependencies", async () => {
    vi.clearAllMocks();

    const response = await liveness();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      data: {
        service: "ok",
        liveness: "alive",
        release: "test-release",
      },
    });
    expect(healthMocks.queryRaw).not.toHaveBeenCalled();
    expect(healthMocks.createMediaStorage).not.toHaveBeenCalled();
    expect(healthMocks.createRateLimitStore).not.toHaveBeenCalled();
  });
});
