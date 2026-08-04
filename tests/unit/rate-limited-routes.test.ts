import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  requestAddress: vi.fn(),
  isSameOrigin: vi.fn(),
  setAdminSession: vi.fn(),
  userFindUnique: vi.fn(),
  analyticsCreate: vi.fn(),
  compare: vi.fn(),
  getPublicDataMode: vi.fn(),
}));

vi.mock("@/lib/rate-limit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/rate-limit")>();
  return {
    ...actual,
    checkRateLimit: routeMocks.checkRateLimit,
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
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.isSameOrigin.mockReturnValue(true);
    routeMocks.requestAddress.mockReturnValue("203.0.113.5");
    routeMocks.checkRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 0,
    });
    routeMocks.getPublicDataMode.mockReturnValue("database");
  });

  it("preserves the login threshold and 429 response", async () => {
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
      "login:203.0.113.5",
      5,
      15 * 60_000,
    );
    expect(routeMocks.userFindUnique).not.toHaveBeenCalled();
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
