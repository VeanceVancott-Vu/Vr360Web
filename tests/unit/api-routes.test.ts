import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  listPublishedTours: vi.fn(),
  getPublishedTour: vi.fn(),
  getAdminSession: vi.fn(),
  isSameOrigin: vi.fn(),
  createAdminResource: vi.fn(),
  listAdminResources: vi.fn(),
}));

vi.mock("@/lib/repositories/tour-repository", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/repositories/tour-repository")>();
  return {
    ...actual,
    listPublishedTours: routeMocks.listPublishedTours,
    getPublishedTour: routeMocks.getPublishedTour,
  };
});

vi.mock("@/lib/auth/session", () => ({
  getAdminSession: routeMocks.getAdminSession,
  isSameOrigin: routeMocks.isSameOrigin,
}));

vi.mock("@/lib/admin/crud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/admin/crud")>();
  return {
    ...actual,
    createAdminResource: routeMocks.createAdminResource,
    listAdminResources: routeMocks.listAdminResources,
  };
});

import {
  GET as listAdminRecords,
  POST as createAdminRecord,
} from "@/app/api/admin/[resource]/route";
import { GET as getTour } from "@/app/api/tours/[slug]/route";
import { GET as listTours } from "@/app/api/tours/route";
import { PublicDataUnavailableError } from "@/lib/repositories/tour-repository";

describe("REST route handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getAdminSession.mockResolvedValue(null);
    routeMocks.isSameOrigin.mockReturnValue(true);
  });

  it("returns structured validation errors for invalid pagination", async () => {
    const response = await listTours(
      new Request("http://localhost/api/tours?page=0&pageSize=200"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(routeMocks.listPublishedTours).not.toHaveBeenCalled();
  });

  it("returns 404 for a valid but missing public tour", async () => {
    routeMocks.getPublishedTour.mockResolvedValue(null);

    const response = await getTour(new Request("http://localhost"), {
      params: Promise.resolve({ slug: "missing-tour" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });

  it("returns 503 instead of demo data when the database is unavailable", async () => {
    routeMocks.listPublishedTours.mockRejectedValueOnce(
      new PublicDataUnavailableError(
        "test tour listing",
        new Error("database offline"),
      ),
    );

    const response = await listTours(new Request("http://localhost/api/tours"));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "DATA_SOURCE_UNAVAILABLE" },
    });
  });

  it("rejects unauthenticated administrator reads", async () => {
    const response = await listAdminRecords(new Request("http://localhost"), {
      params: Promise.resolve({ resource: "scenes" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "UNAUTHORIZED" },
    });
  });

  it("maps duplicate administrator records to 409", async () => {
    routeMocks.getAdminSession.mockResolvedValue({
      userId: "admin",
      email: "admin@example.test",
      role: "ADMIN",
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    });
    routeMocks.createAdminResource.mockRejectedValue({ code: "P2002" });

    const response = await createAdminRecord(
      new Request("http://localhost/api/admin/tours", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://localhost",
        },
        body: JSON.stringify({ slug: "duplicate" }),
      }),
      { params: Promise.resolve({ resource: "tours" }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "DUPLICATE_RECORD" },
    });
  });
});
