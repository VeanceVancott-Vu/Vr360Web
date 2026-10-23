import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  isSameOrigin: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  getAdminSession: authMocks.getAdminSession,
  isSameOrigin: authMocks.isSameOrigin,
}));

import {
  GET as listResources,
  POST as createResource,
} from "@/app/api/admin/[resource]/route";
import {
  DELETE as deleteResource,
  GET as getResource,
  PATCH as updateResource,
} from "@/app/api/admin/[resource]/[id]/route";
import { POST as createFloorPlanMarker } from "@/app/api/admin/floor-plans/[id]/markers/route";
import { prisma } from "@/lib/database/client";

const runToken = randomUUID().replaceAll("-", "").slice(0, 16);
const slugPrefix = "integration-test-" + runToken;

let baselineTourCount = 0;
let sentinelTourId: string | undefined;
let tourId: string | undefined;
let categoryId: string | undefined;
let sceneId: string | undefined;
let floorPlanId: string | undefined;

function collectionContext(resource: string) {
  return { params: Promise.resolve({ resource }) };
}

function recordContext(resource: string, id: string) {
  return { params: Promise.resolve({ resource, id }) };
}

function jsonRequest(path: string, method: "POST" | "PATCH", body: unknown) {
  return new Request("http://localhost" + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      Origin: "http://localhost",
    },
    body: JSON.stringify(body),
  });
}

function deleteRequest(path: string) {
  return new Request("http://localhost" + path, {
    method: "DELETE",
    headers: { Origin: "http://localhost" },
  });
}

async function successData<T>(response: Response, status: number) {
  expect(response.status).toBe(status);
  const body = (await response.json()) as {
    success: boolean;
    data: T;
  };
  expect(body.success).toBe(true);
  return body.data;
}

beforeAll(async () => {
  authMocks.getAdminSession.mockResolvedValue({
    userId: "integration-admin",
    email: "integration-admin@example.test",
    role: "ADMIN",
    expiresAt: Math.floor(Date.now() / 1000) + 600,
  });
  authMocks.isSameOrigin.mockReturnValue(true);

  baselineTourCount = await prisma.tour.count();
  const sentinel = await prisma.tour.create({
    data: {
      slug: slugPrefix + "-sentinel",
      titleVi: "Tour kiem tra bao toan",
      titleEn: "Preservation sentinel tour",
      descriptionVi:
        "Ban ghi nay phai con nguyen ven sau khi kiem thu tich hop.",
      descriptionEn:
        "This unrelated record must remain after the integration workflow.",
      coverImageUrl: "/integration/sentinel-cover.jpg",
      welcomeImageUrl: "/integration/sentinel-welcome.jpg",
      isPublished: false,
    },
  });
  sentinelTourId = sentinel.id;
});

afterAll(async () => {
  try {
    if (floorPlanId) {
      await prisma.floorPlanMarker.deleteMany({ where: { floorPlanId } });
      await prisma.floorPlan.deleteMany({ where: { id: floorPlanId } });
    }
    if (sceneId) {
      await prisma.hotspot.deleteMany({
        where: { OR: [{ sceneId }, { targetSceneId: sceneId }] },
      });
      await prisma.media.deleteMany({ where: { sceneId } });
      await prisma.floorPlanMarker.deleteMany({ where: { sceneId } });
      await prisma.scene.deleteMany({ where: { id: sceneId } });
    }
    if (tourId) {
      await prisma.floorPlan.deleteMany({ where: { tourId } });
      await prisma.scene.deleteMany({ where: { tourId } });
      await prisma.tour.deleteMany({ where: { id: tourId } });
    }
    if (categoryId) {
      await prisma.category.deleteMany({ where: { id: categoryId } });
    }
    if (sentinelTourId) {
      await prisma.tour.deleteMany({ where: { id: sentinelTourId } });
    }
  } finally {
    await prisma.$disconnect();
  }
});

describe("authenticated administrator CRUD with MySQL", () => {
  it("preserves unrelated data while enforcing relationships", async () => {
    const tourInput = {
      slug: slugPrefix + "-tour",
      titleVi: "Tour tich hop",
      titleEn: "Integration tour",
      descriptionVi: "Noi dung tour danh cho kiem thu tich hop MySQL.",
      descriptionEn: "Tour content created only for MySQL integration testing.",
      coverImageUrl: "/integration/cover.jpg",
      welcomeImageUrl: "/integration/welcome.jpg",
      defaultSceneId: null,
      isPublished: false,
    };
    const createdTour = await successData<{ id: string }>(
      await createResource(
        jsonRequest("/api/admin/tours", "POST", tourInput),
        collectionContext("tours"),
      ),
      201,
    );
    tourId = createdTour.id;

    const duplicateResponse = await createResource(
      jsonRequest("/api/admin/tours", "POST", tourInput),
      collectionContext("tours"),
    );
    expect(duplicateResponse.status).toBe(409);
    await expect(duplicateResponse.json()).resolves.toMatchObject({
      success: false,
      error: { code: "DUPLICATE_RECORD" },
    });

    const categoryInput = {
      slug: slugPrefix + "-category",
      nameVi: "Danh muc tich hop",
      nameEn: "Integration category",
      icon: "MapPin",
      sortOrder: 9000,
    };
    const createdCategory = await successData<{ id: string }>(
      await createResource(
        jsonRequest("/api/admin/categories", "POST", categoryInput),
        collectionContext("categories"),
      ),
      201,
    );
    categoryId = createdCategory.id;

    const sceneInput = {
      tourId,
      categoryId,
      slug: slugPrefix + "-scene",
      titleVi: "Canh tich hop",
      titleEn: "Integration scene",
      shortDescriptionVi: "Mo ta ngan kiem thu.",
      shortDescriptionEn: "Short integration description.",
      fullDescriptionVi: "Mo ta day du cho kich ban kiem thu tich hop MySQL.",
      fullDescriptionEn:
        "Full scene description for the isolated MySQL integration workflow.",
      panoramaType: "EQUIRECTANGULAR",
      panoramaUrl: "/integration/panorama.jpg",
      previewImageUrl: "/integration/preview.jpg",
      multiresConfig: null,
      initialPitch: 0,
      initialYaw: 0,
      initialHfov: 90,
      minimumHfov: 45,
      maximumHfov: 120,
      latitude: 16.0544,
      longitude: 108.2022,
      narrationAudioVi: null,
      narrationAudioEn: null,
      attribution: "Integration test",
      sortOrder: 9000,
      isPublished: false,
    };
    const createdScene = await successData<{ id: string }>(
      await createResource(
        jsonRequest("/api/admin/scenes", "POST", sceneInput),
        collectionContext("scenes"),
      ),
      201,
    );
    sceneId = createdScene.id;

    const floorPlanInput = {
      tourId,
      titleVi: "So do tich hop",
      titleEn: "Integration floor plan",
      imageUrl: "/integration/floor-plan.jpg",
      isDefault: false,
      sortOrder: 9000,
    };
    const createdFloorPlan = await successData<{ id: string }>(
      await createResource(
        jsonRequest("/api/admin/floor-plans", "POST", floorPlanInput),
        collectionContext("floor-plans"),
      ),
      201,
    );
    floorPlanId = createdFloorPlan.id;

    const marker = await successData<{ id: string; sceneId: string }>(
      await createFloorPlanMarker(
        jsonRequest(
          "/api/admin/floor-plans/" + floorPlanId + "/markers",
          "POST",
          {
            floorPlanId,
            sceneId,
            x: 25,
            y: 75,
            labelVi: "Diem tich hop",
            labelEn: "Integration marker",
            icon: "MapPin",
            colorTheme: "blue",
          },
        ) as never,
        { params: Promise.resolve({ id: floorPlanId }) },
      ),
      201,
    );
    expect(marker.sceneId).toBe(sceneId);

    const floorPlan = await successData<{
      id: string;
      markers: Array<{ id: string; sceneId: string }>;
    }>(
      await getResource(
        new Request("http://localhost/api/admin/floor-plans/" + floorPlanId),
        recordContext("floor-plans", floorPlanId),
      ),
      200,
    );
    expect(floorPlan.markers).toEqual([
      expect.objectContaining({ id: marker.id, sceneId }),
    ]);

    const updatedScene = await successData<{ titleEn: string }>(
      await updateResource(
        jsonRequest("/api/admin/scenes/" + sceneId, "PATCH", {
          ...sceneInput,
          titleEn: "Updated integration scene",
        }),
        recordContext("scenes", sceneId),
      ),
      200,
    );
    expect(updatedScene.titleEn).toBe("Updated integration scene");

    const scenes = await successData<Array<{ id: string; titleEn: string }>>(
      await listResources(
        new Request("http://localhost/api/admin/scenes"),
        collectionContext("scenes"),
      ),
      200,
    );
    expect(scenes).toContainEqual(
      expect.objectContaining({
        id: sceneId,
        titleEn: "Updated integration scene",
      }),
    );

    const protectedCategoryResponse = await deleteResource(
      deleteRequest("/api/admin/categories/" + categoryId),
      recordContext("categories", categoryId),
    );
    expect(protectedCategoryResponse.status).toBe(422);
    await expect(protectedCategoryResponse.json()).resolves.toMatchObject({
      success: false,
      error: { code: "INVALID_RELATION" },
    });

    await successData<{ deleted: true }>(
      await deleteResource(
        deleteRequest("/api/admin/floor-plans/" + floorPlanId),
        recordContext("floor-plans", floorPlanId),
      ),
      200,
    );
    await successData<{ deleted: true }>(
      await deleteResource(
        deleteRequest("/api/admin/scenes/" + sceneId),
        recordContext("scenes", sceneId),
      ),
      200,
    );
    await successData<{ deleted: true }>(
      await deleteResource(
        deleteRequest("/api/admin/categories/" + categoryId),
        recordContext("categories", categoryId),
      ),
      200,
    );
    await successData<{ deleted: true }>(
      await deleteResource(
        deleteRequest("/api/admin/tours/" + tourId),
        recordContext("tours", tourId),
      ),
      200,
    );

    expect(
      await prisma.tour.findUnique({ where: { id: sentinelTourId } }),
    ).not.toBeNull();
    expect(await prisma.tour.count()).toBe(baselineTourCount + 1);
  });
});
