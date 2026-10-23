import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  inspectRateLimit: vi.fn(),
  requestAddress: vi.fn(),
  isSameOrigin: vi.fn(),
  setAdminSession: vi.fn(),
  userFindUnique: vi.fn(),
  sceneFindFirst: vi.fn(),
  analyticsCreate: vi.fn(),
  compare: vi.fn(),
  getPublicDataMode: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    checkRateLimit: routeMocks.checkRateLimit,
    inspectRateLimit: routeMocks.inspectRateLimit,
    requestAddress: routeMocks.requestAddress,
  };
});

vi.mock("@/lib/auth/session", () => ({
  isSameOrigin: routeMocks.isSameOrigin,
  setAdminSession: routeMocks.setAdminSession,
}));

vi.mock("@/lib/database/client", () => ({
  prisma: {
    user: { findUnique: routeMocks.userFindUnique },
    scene: { findFirst: routeMocks.sceneFindFirst },
    tourViewEvent: { create: routeMocks.analyticsCreate },
  },
}));

vi.mock("bcryptjs", () => ({
  compare: routeMocks.compare,
}));

vi.mock("@/lib/env.server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/env.server")>();
  return {
    ...actual,
    getPublicDataMode: routeMocks.getPublicDataMode,
  };
});

import { POST as recordAnalytics } from "@/app/api/analytics/events/route";
import { POST as login } from "@/app/api/auth/login/route";
import { RateLimitUnavailableError } from "@/lib/rate-limit";

function postRequest(path: string, body: unknown) {
  return new Request("http://localhost" + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
      "X-Forwarded-For": "203.0.113.5",
    },
    body: JSON.stringify(body),
  });
}

describe("rate-limited API routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.isSameOrigin.mockReturnValue(true);
    routeMocks.requestAddress.mockReturnValue("203.0.113.5");
    routeMocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    routeMocks.inspectRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    routeMocks.getPublicDataMode.mockReturnValue("database");
    routeMocks.sceneFindFirst.mockResolvedValue({ id: "scene-1" });
  });

  it("applies the broader IP login threshold and 429 response", async () => {
    routeMocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 42,
    });

    const response = await login(
      postRequest("/api/auth/login", {
        email: "admin@example.test",
        password: "irrelevant",
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many login attempts. Retry in 42 seconds.",
      },
    });
    expect(routeMocks.checkRateLimit).toHaveBeenCalledWith(
      "login:ip:203.0.113.5",
      20,
      15 * 60_000,
    );
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
    expect(routeMocks.inspectRateLimit).not.toHaveBeenCalled();
  });

  it("rate-limits failed logins by normalized account without exposing email", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://configured");
    routeMocks.userFindUnique.mockResolvedValue(null);

    const response = await login(
      postRequest("/api/auth/login", {
        email: "  Admin@Example.Test  ",
        password: "irrelevant",
      }),
    );

    expect(response.status).toBe(401);
    expect(routeMocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.test" },
    });
    const accountKey =
      "login:account:" +
      createHash("sha256").update("admin@example.test").digest("hex");
    expect(routeMocks.inspectRateLimit).toHaveBeenCalledWith(
      accountKey,
      5,
      15 * 60_000,
    );
    expect(routeMocks.compare).toHaveBeenCalledWith(
      "irrelevant",
      expect.stringMatching(/^\$2b\$12\$/),
    );
    expect(routeMocks.checkRateLimit).toHaveBeenCalledTimes(2);
    expect(routeMocks.checkRateLimit).toHaveBeenNthCalledWith(
      2,
      accountKey,
      5,
      15 * 60_000,
    );
  });

  it("blocks a failed account window before database and bcrypt work", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://configured");
    routeMocks.inspectRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 35,
    });

    const response = await login(
      postRequest("/api/auth/login", {
        email: "blocked@example.test",
        password: "irrelevant",
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many login attempts. Retry in 35 seconds.",
      },
    });
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
    expect(routeMocks.compare).not.toHaveBeenCalled();
    expect(routeMocks.checkRateLimit).toHaveBeenCalledOnce();
  });

  it("returns the same generic throttle response for an account failure limit", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://configured");
    routeMocks.userFindUnique.mockResolvedValue(null);
    routeMocks.checkRateLimit
      .mockResolvedValueOnce({ allowed: true, retryAfterSeconds: 0 })
      .mockResolvedValueOnce({ allowed: false, retryAfterSeconds: 35 });

    const response = await login(
      postRequest("/api/auth/login", {
        email: "missing@example.test",
        password: "irrelevant",
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many login attempts. Retry in 35 seconds.",
      },
    });
  });

  it("does not consume the failed-account limit after successful login", async () => {
    vi.stubEnv("DATABASE_URL", "mysql://configured");
    routeMocks.userFindUnique.mockResolvedValue({
      id: "admin-1",
      email: "admin@example.test",
      passwordHash: "hash",
      role: "ADMIN",
    });
    routeMocks.compare.mockResolvedValue(true);
    routeMocks.setAdminSession.mockResolvedValue(undefined);

    const response = await login(
      postRequest("/api/auth/login", {
        email: "admin@example.test",
        password: "correct-password",
      }),
    );

    expect(response.status).toBe(200);
    expect(routeMocks.checkRateLimit).toHaveBeenCalledOnce();
    expect(routeMocks.inspectRateLimit).toHaveBeenCalledOnce();
  });

  it("preserves the analytics threshold and 429 response", async () => {
    routeMocks.checkRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 7,
    });

    const response = await recordAnalytics(
      postRequest("/api/analytics/events", {
        tourId: "tour-1",
        sceneId: "scene-1",
        eventType: "SCENE_OPENED",
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many events. Retry in 7 seconds.",
      },
    });
    const analyticsKey = routeMocks.checkRateLimit.mock.calls[0]?.[0];
    expect(analyticsKey).toMatch(/^analytics:[a-f0-9]{64}$/);
    expect(analyticsKey).not.toContain("203.0.113.5");
    expect(routeMocks.checkRateLimit).toHaveBeenCalledWith(
      analyticsKey,
      60,
      60_000,
    );
    expect(routeMocks.analyticsCreate).not.toHaveBeenCalled();
  });

  it.each(["SCENE_OPENED", "HOTSPOT_CLICKED", "AUDIO_PLAYED"] as const)(
    "rejects %s analytics without a scene",
    async (eventType) => {
      const response = await recordAnalytics(
        postRequest("/api/analytics/events", {
          tourId: "tour-1",
          eventType,
          sessionToken: "browser-session-token-1234567890",
        }),
      );

      expect(response.status).toBe(422);
      expect(routeMocks.analyticsCreate).not.toHaveBeenCalled();
    },
  );

  it("rejects a scene identifier on TOUR_OPENED analytics", async () => {
    const response = await recordAnalytics(
      postRequest("/api/analytics/events", {
        tourId: "tour-1",
        sceneId: "scene-1",
        eventType: "TOUR_OPENED",
        sessionToken: "browser-session-token-1234567890",
      }),
    );

    expect(response.status).toBe(422);
    expect(routeMocks.sceneFindFirst).not.toHaveBeenCalled();
    expect(routeMocks.analyticsCreate).not.toHaveBeenCalled();
  });

  it("rejects analytics scenes that do not belong to the supplied tour", async () => {
    routeMocks.sceneFindFirst.mockResolvedValue(null);

    const response = await recordAnalytics(
      postRequest("/api/analytics/events", {
        tourId: "tour-1",
        sceneId: "scene-from-another-tour",
        eventType: "SCENE_OPENED",
        sessionToken: "browser-session-token-1234567890",
      }),
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_RELATION" },
    });
    expect(routeMocks.sceneFindFirst).toHaveBeenCalledWith({
      where: { id: "scene-from-another-tour", tourId: "tour-1" },
      select: { id: true },
    });
    expect(routeMocks.analyticsCreate).not.toHaveBeenCalled();
  });

  it("stores only a daily digest of an opted-in session token", async () => {
    const sessionToken = "browser-session-token-1234567890";

    const response = await recordAnalytics(
      postRequest("/api/analytics/events", {
        tourId: "tour-1",
        sceneId: "scene-1",
        eventType: "SCENE_OPENED",
        sessionToken,
      }),
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(routeMocks.sceneFindFirst).toHaveBeenCalledWith({
      where: { id: "scene-1", tourId: "tour-1" },
      select: { id: true },
    });
    expect(routeMocks.analyticsCreate).toHaveBeenCalledOnce();
    const data = routeMocks.analyticsCreate.mock.calls[0]?.[0]?.data;
    expect(data).toMatchObject({
      tourId: "tour-1",
      sceneId: "scene-1",
      eventType: "SCENE_OPENED",
    });
    expect(data).not.toHaveProperty("sessionToken");
    expect(data.anonymousSessionId).toMatch(/^[a-f0-9]{64}$/);
    expect(data.anonymousSessionId).not.toContain(sessionToken);
  });

  it("fails safely when shared request protection is unavailable", async () => {
    routeMocks.checkRateLimit.mockRejectedValue(
      new RateLimitUnavailableError(),
    );

    const response = await login(
      postRequest("/api/auth/login", {
        email: "admin@example.test",
        password: "irrelevant",
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "RATE_LIMIT_UNAVAILABLE" },
    });
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
  });

  it("still rejects cross-origin login before consuming a limit", async () => {
    routeMocks.isSameOrigin.mockReturnValue(false);

    const response = await login(
      postRequest("/api/auth/login", {
        email: "admin@example.test",
        password: "irrelevant",
      }),
    );

    expect(response.status).toBe(403);
    expect(routeMocks.checkRateLimit).not.toHaveBeenCalled();
  });
});
