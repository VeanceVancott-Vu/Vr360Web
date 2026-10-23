import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  isSameOrigin: vi.fn(),
  floorPlanFindUnique: vi.fn(),
  sceneFindFirst: vi.fn(),
  markerCreate: vi.fn(),
  markerFindFirst: vi.fn(),
  markerUpdate: vi.fn(),
  markerDelete: vi.fn(),
  getMediaStorage: vi.fn(),
  storagePut: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAdminSession: routeMocks.getAdminSession,
  isSameOrigin: routeMocks.isSameOrigin,
}));

vi.mock("@/lib/database/client", () => ({
  prisma: {
    floorPlan: { findUnique: routeMocks.floorPlanFindUnique },
    scene: { findFirst: routeMocks.sceneFindFirst },
    floorPlanMarker: {
      create: routeMocks.markerCreate,
      findFirst: routeMocks.markerFindFirst,
      update: routeMocks.markerUpdate,
      delete: routeMocks.markerDelete,
    },
  },
}));

vi.mock("@/lib/media/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/media/storage")>();
  return {
    ...actual,
    getMediaStorage: routeMocks.getMediaStorage,
  };
});

import {
  DELETE as deleteMarker,
  PATCH as updateMarker,
  POST as createMarker,
} from "@/app/api/admin/floor-plans/[id]/markers/route";
import { POST as uploadFloorPlan } from "@/app/api/admin/upload/route";
import { MediaStorageConfigurationError } from "@/lib/media/storage";

const routeContext = { params: Promise.resolve({ id: "floor-plan-1" }) };
const markerPayload = {
  floorPlanId: "floor-plan-1",
  sceneId: "scene-1",
  x: 25,
  y: 75,
  labelVi: "Phòng khách",
  labelEn: "Living room",
  icon: "MapPin",
  colorTheme: "blue",
};

function jsonRequest(url: string, method: "POST" | "PATCH", body: unknown) {
  return new Request(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

function uploadRequest(bytes: number[], name: string, type: string) {
  const formData = new FormData();
  formData.append("file", new Blob([Uint8Array.from(bytes)], { type }), name);
  return new Request("http://localhost/api/admin/upload", {
    method: "POST",
    headers: { Origin: "http://localhost" },
    body: formData,
  });
}

function pngBytes(width = 1200, height = 800) {
  const bytes = Array<number>(33).fill(0);
  bytes.splice(0, 8, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  bytes.splice(8, 4, 0x00, 0x00, 0x00, 0x0d);
  bytes.splice(12, 4, 0x49, 0x48, 0x44, 0x52);
  bytes.splice(
    16,
    4,
    (width >>> 24) & 0xff,
    (width >>> 16) & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
  );
  bytes.splice(
    20,
    4,
    (height >>> 24) & 0xff,
    (height >>> 16) & 0xff,
    (height >>> 8) & 0xff,
    height & 0xff,
  );
  return bytes;
}

describe("protected floor-plan mutations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getAdminSession.mockResolvedValue({
      userId: "admin",
      email: "admin@example.test",
      role: "ADMIN",
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    });
    routeMocks.isSameOrigin.mockReturnValue(true);
    routeMocks.floorPlanFindUnique.mockResolvedValue({
      id: "floor-plan-1",
      tourId: "tour-1",
    });
    routeMocks.sceneFindFirst.mockResolvedValue({ id: "scene-1" });
    routeMocks.markerFindFirst.mockResolvedValue({ id: "marker-1" });
    routeMocks.markerCreate.mockResolvedValue({
      id: "marker-1",
      ...markerPayload,
    });
    routeMocks.markerUpdate.mockResolvedValue({
      id: "marker-1",
      ...markerPayload,
    });
    routeMocks.markerDelete.mockResolvedValue({ id: "marker-1" });
  });

  it("rejects cross-origin marker creation before database access", async () => {
    routeMocks.isSameOrigin.mockReturnValue(false);

    const response = await createMarker(
      jsonRequest(
        "http://localhost/api/admin/floor-plans/floor-plan-1/markers",
        "POST",
        markerPayload,
      ) as never,
      routeContext,
    );

    expect(response.status).toBe(403);
    expect(routeMocks.floorPlanFindUnique).not.toHaveBeenCalled();
  });

  it("rejects a marker payload for a different floor plan", async () => {
    const response = await createMarker(
      jsonRequest(
        "http://localhost/api/admin/floor-plans/floor-plan-1/markers",
        "POST",
        { ...markerPayload, floorPlanId: "floor-plan-2" },
      ) as never,
      routeContext,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "VALIDATION_ERROR" },
    });
    expect(routeMocks.markerCreate).not.toHaveBeenCalled();
  });

  it("rejects scenes that do not belong to the floor plan tour", async () => {
    routeMocks.sceneFindFirst.mockResolvedValue(null);

    const response = await createMarker(
      jsonRequest(
        "http://localhost/api/admin/floor-plans/floor-plan-1/markers",
        "POST",
        markerPayload,
      ) as never,
      routeContext,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_RELATION" },
    });
    expect(routeMocks.sceneFindFirst).toHaveBeenCalledWith({
      where: { id: "scene-1", tourId: "tour-1" },
      select: { id: true },
    });
    expect(routeMocks.markerCreate).not.toHaveBeenCalled();
  });

  it("creates a valid marker with the route floor plan", async () => {
    const response = await createMarker(
      jsonRequest(
        "http://localhost/api/admin/floor-plans/floor-plan-1/markers",
        "POST",
        markerPayload,
      ) as never,
      routeContext,
    );

    expect(response.status).toBe(201);
    expect(routeMocks.markerCreate).toHaveBeenCalledWith({
      data: markerPayload,
    });
  });

  it("rejects arbitrary fields in marker updates", async () => {
    const response = await updateMarker(
      jsonRequest(
        "http://localhost/api/admin/floor-plans/floor-plan-1/markers",
        "PATCH",
        { markerId: "marker-1", x: 50, createdAt: "2026-01-01" },
      ) as never,
      routeContext,
    );

    expect(response.status).toBe(422);
    expect(routeMocks.markerUpdate).not.toHaveBeenCalled();
  });

  it("does not update a marker owned by another floor plan", async () => {
    routeMocks.markerFindFirst.mockResolvedValue(null);

    const response = await updateMarker(
      jsonRequest(
        "http://localhost/api/admin/floor-plans/floor-plan-1/markers",
        "PATCH",
        { markerId: "marker-2", x: 50 },
      ) as never,
      routeContext,
    );

    expect(response.status).toBe(404);
    expect(routeMocks.markerFindFirst).toHaveBeenCalledWith({
      where: { id: "marker-2", floorPlanId: "floor-plan-1" },
      select: { id: true },
    });
    expect(routeMocks.markerUpdate).not.toHaveBeenCalled();
  });

  it("keeps the existing editor's complete marker update compatible", async () => {
    const response = await updateMarker(
      jsonRequest(
        "http://localhost/api/admin/floor-plans/floor-plan-1/markers",
        "PATCH",
        { markerId: "marker-1", ...markerPayload },
      ) as never,
      routeContext,
    );

    expect(response.status).toBe(200);
    expect(routeMocks.markerUpdate).toHaveBeenCalledWith({
      where: { id: "marker-1" },
      data: {
        sceneId: markerPayload.sceneId,
        x: markerPayload.x,
        y: markerPayload.y,
        labelVi: markerPayload.labelVi,
        labelEn: markerPayload.labelEn,
        icon: markerPayload.icon,
        colorTheme: markerPayload.colorTheme,
      },
    });
  });

  it("does not delete a marker owned by another floor plan", async () => {
    routeMocks.markerFindFirst.mockResolvedValue(null);
    const request = new Request(
      "http://localhost/api/admin/floor-plans/floor-plan-1/markers?markerId=marker-2",
      { method: "DELETE", headers: { Origin: "http://localhost" } },
    );

    const response = await deleteMarker(request as never, routeContext);

    expect(response.status).toBe(404);
    expect(routeMocks.markerDelete).not.toHaveBeenCalled();
  });
});

describe("floor-plan upload validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getAdminSession.mockResolvedValue({
      userId: "admin",
      email: "admin@example.test",
      role: "ADMIN",
      expiresAt: Math.floor(Date.now() / 1000) + 600,
    });
    routeMocks.isSameOrigin.mockReturnValue(true);
    routeMocks.storagePut.mockResolvedValue({
      url: "https://cdn.example.test/uploads/floor-plans/stored.png",
    });
    routeMocks.getMediaStorage.mockReturnValue({
      put: routeMocks.storagePut,
      remove: vi.fn(),
    });
  });

  it("rejects cross-origin uploads before reading the form", async () => {
    routeMocks.isSameOrigin.mockReturnValue(false);
    const response = await uploadFloorPlan(
      uploadRequest([0x89, 0x50], "plan.png", "image/png") as never,
    );

    expect(response.status).toBe(403);
    expect(routeMocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects SVG uploads", async () => {
    const response = await uploadFloorPlan(
      uploadRequest(
        [0x3c, 0x73, 0x76, 0x67],
        "plan.svg",
        "image/svg+xml",
      ) as never,
    );

    expect(response.status).toBe(422);
    expect(routeMocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects oversized multipart requests before parsing the file", async () => {
    const request = new Request("http://localhost/api/admin/upload", {
      method: "POST",
      headers: {
        Origin: "http://localhost",
        "Content-Length": String(12 * 1024 * 1024),
      },
    });

    const response = await uploadFloorPlan(request as never);

    expect(response.status).toBe(413);
    expect(routeMocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects image MIME types with mismatched file signatures", async () => {
    const response = await uploadFloorPlan(
      uploadRequest(
        [0x6e, 0x6f, 0x74, 0x2d, 0x70, 0x6e, 0x67, 0x21],
        "plan.png",
        "image/png",
      ) as never,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_FILE_CONTENT" },
    });
    expect(routeMocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects images with incomplete metadata", async () => {
    const response = await uploadFloorPlan(
      uploadRequest(
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
        "plan.png",
        "image/png",
      ) as never,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_FILE_CONTENT" },
    });
    expect(routeMocks.storagePut).not.toHaveBeenCalled();
  });

  it("rejects images with unsafe decompression dimensions", async () => {
    const response = await uploadFloorPlan(
      uploadRequest(
        pngBytes(20_000, 20_000),
        "huge-plan.png",
        "image/png",
      ) as never,
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "IMAGE_DIMENSIONS_TOO_LARGE" },
    });
    expect(routeMocks.storagePut).not.toHaveBeenCalled();
  });

  it("sends a verified PNG to storage under a generated safe filename", async () => {
    const response = await uploadFloorPlan(
      uploadRequest(pngBytes(), "My Floor Plan.png", "image/png") as never,
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.url).toBe(
      "https://cdn.example.test/uploads/floor-plans/stored.png",
    );
    expect(routeMocks.storagePut).toHaveBeenCalledWith(expect.anything(), {
      directory: "floor-plans",
      fileName: expect.stringMatching(/^[a-z0-9_-]+_[0-9a-f-]+\.png$/),
      contentType: "image/png",
    });
  });

  it("returns a service error when production storage is not configured", async () => {
    routeMocks.getMediaStorage.mockImplementationOnce(() => {
      throw new MediaStorageConfigurationError("Missing storage settings.");
    });

    const response = await uploadFloorPlan(
      uploadRequest(pngBytes(), "plan.png", "image/png") as never,
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "STORAGE_NOT_CONFIGURED" },
    });
    expect(routeMocks.storagePut).not.toHaveBeenCalled();
  });
});
