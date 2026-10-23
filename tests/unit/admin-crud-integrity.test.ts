import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  tourFindUnique: vi.fn(),
  tourCreate: vi.fn(),
  tourUpdate: vi.fn(),
  sceneFindUnique: vi.fn(),
  sceneCount: vi.fn(),
  sceneCreate: vi.fn(),
  sceneUpdate: vi.fn(),
  sceneDelete: vi.fn(),
  hotspotCreate: vi.fn(),
  hotspotUpdate: vi.fn(),
  floorPlanCreate: vi.fn(),
  floorPlanFindUnique: vi.fn(),
  floorPlanUpdate: vi.fn(),
  floorPlanUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/database/client", () => ({
  prisma: {
    tour: {
      findUnique: databaseMocks.tourFindUnique,
      create: databaseMocks.tourCreate,
      update: databaseMocks.tourUpdate,
    },
    scene: {
      findUnique: databaseMocks.sceneFindUnique,
      count: databaseMocks.sceneCount,
      create: databaseMocks.sceneCreate,
      update: databaseMocks.sceneUpdate,
      delete: databaseMocks.sceneDelete,
    },
    hotspot: {
      create: databaseMocks.hotspotCreate,
      update: databaseMocks.hotspotUpdate,
    },
    floorPlan: {
      create: databaseMocks.floorPlanCreate,
      findUnique: databaseMocks.floorPlanFindUnique,
      update: databaseMocks.floorPlanUpdate,
      updateMany: databaseMocks.floorPlanUpdateMany,
    },
    $transaction: databaseMocks.transaction,
  },
}));

import {
  createAdminResource,
  deleteAdminResource,
  updateAdminResource,
} from "@/lib/admin/crud";

const hotspotInput = {
  sceneId: "source-scene",
  type: "SCENE_LINK" as const,
  pitch: 0,
  yaw: 0,
  labelVi: "Canh tiep theo",
  labelEn: "Next scene",
  contentVi: null,
  contentEn: null,
  icon: "MoveUpRight",
  targetSceneId: "target-scene",
  imageUrl: null,
  audioUrl: null,
  externalUrl: null,
  sortOrder: 0,
  isVisible: true,
};

const tourInput = {
  slug: "test-tour",
  titleVi: "Tour kiem thu",
  titleEn: "Test tour",
  descriptionVi: "Noi dung day du cho tour kiem thu.",
  descriptionEn: "Complete description for the test tour.",
  coverImageUrl: "/images/cover.jpg",
  welcomeImageUrl: "/images/welcome.jpg",
  defaultSceneId: "default-scene",
  isPublished: true,
};

const sceneInput = {
  tourId: "tour-1",
  categoryId: "category-1",
  slug: "test-scene",
  titleVi: "Canh kiem thu",
  titleEn: "Test scene",
  shortDescriptionVi: "Mo ta ngan hop le.",
  shortDescriptionEn: "A valid short description.",
  fullDescriptionVi: "Mo ta day du cho canh kiem thu.",
  fullDescriptionEn: "A complete description for the test scene.",
  panoramaType: "EQUIRECTANGULAR" as const,
  panoramaUrl: "/panos/scene.jpg",
  previewImageUrl: "/panos/preview.jpg",
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
  attribution: null,
  sortOrder: 0,
  isPublished: true,
};

const floorPlanInput = {
  tourId: "tour-1",
  titleVi: "So do mac dinh",
  titleEn: "Default floor plan",
  imageUrl: "/images/floor-plan.jpg",
  isDefault: true,
  sortOrder: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  databaseMocks.floorPlanFindUnique.mockResolvedValue({ tourId: "tour-1" });
  databaseMocks.transaction.mockImplementation(
    async (
      callback: (transaction: {
        floorPlan: {
          create: typeof databaseMocks.floorPlanCreate;
          update: typeof databaseMocks.floorPlanUpdate;
          updateMany: typeof databaseMocks.floorPlanUpdateMany;
        };
      }) => Promise<unknown>,
    ) =>
      callback({
        floorPlan: {
          create: databaseMocks.floorPlanCreate,
          update: databaseMocks.floorPlanUpdate,
          updateMany: databaseMocks.floorPlanUpdateMany,
        },
      }),
  );
});

describe("administrator relationship validation", () => {
  it("accepts a scene-link hotspot within the same tour", async () => {
    databaseMocks.sceneFindUnique
      .mockResolvedValueOnce({ tourId: "tour-1" })
      .mockResolvedValueOnce({ tourId: "tour-1" });
    databaseMocks.hotspotCreate.mockResolvedValue({ id: "hotspot-1" });

    await expect(
      createAdminResource("hotspots", hotspotInput),
    ).resolves.toMatchObject({ id: "hotspot-1" });
    expect(databaseMocks.hotspotCreate).toHaveBeenCalledOnce();
  });

  it("rejects a scene-link hotspot across tours", async () => {
    databaseMocks.sceneFindUnique
      .mockResolvedValueOnce({ tourId: "tour-1" })
      .mockResolvedValueOnce({ tourId: "tour-2" });

    await expect(
      createAdminResource("hotspots", hotspotInput),
    ).rejects.toMatchObject({
      code: "INVALID_RELATION",
      fields: { targetSceneId: expect.any(Array) },
    });
    expect(databaseMocks.hotspotCreate).not.toHaveBeenCalled();
  });

  it("accepts a published same-tour default scene", async () => {
    databaseMocks.tourFindUnique.mockResolvedValue({ id: "tour-1" });
    databaseMocks.sceneFindUnique.mockResolvedValue({
      tourId: "tour-1",
      isPublished: true,
    });
    databaseMocks.sceneCount.mockResolvedValue(1);
    databaseMocks.tourUpdate.mockResolvedValue({ id: "tour-1" });

    await expect(
      updateAdminResource("tours", "tour-1", tourInput),
    ).resolves.toMatchObject({ id: "tour-1" });
  });

  it("rejects a default scene from another tour", async () => {
    databaseMocks.tourFindUnique.mockResolvedValue({ id: "tour-1" });
    databaseMocks.sceneFindUnique.mockResolvedValue({
      tourId: "tour-2",
      isPublished: true,
    });
    databaseMocks.sceneCount.mockResolvedValue(1);

    await expect(
      updateAdminResource("tours", "tour-1", tourInput),
    ).rejects.toMatchObject({
      code: "INVALID_RELATION",
      fields: { defaultSceneId: expect.any(Array) },
    });
    expect(databaseMocks.tourUpdate).not.toHaveBeenCalled();
  });

  it("rejects a missing default scene", async () => {
    databaseMocks.tourFindUnique.mockResolvedValue({ id: "tour-1" });
    databaseMocks.sceneFindUnique.mockResolvedValue(null);
    databaseMocks.sceneCount.mockResolvedValue(1);

    await expect(
      updateAdminResource("tours", "tour-1", tourInput),
    ).rejects.toMatchObject({
      code: "INVALID_RELATION",
      fields: { defaultSceneId: expect.any(Array) },
    });
  });
});

describe("administrator publication rules", () => {
  it("rejects publishing a tour without a default scene", async () => {
    databaseMocks.tourFindUnique.mockResolvedValue({ id: "tour-1" });

    await expect(
      updateAdminResource("tours", "tour-1", {
        ...tourInput,
        defaultSceneId: null,
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { defaultSceneId: expect.any(Array) },
    });
    expect(databaseMocks.tourUpdate).not.toHaveBeenCalled();
  });

  it("rejects publishing a tour without a published scene", async () => {
    databaseMocks.tourFindUnique.mockResolvedValue({ id: "tour-1" });
    databaseMocks.sceneFindUnique.mockResolvedValue({
      tourId: "tour-1",
      isPublished: true,
    });
    databaseMocks.sceneCount.mockResolvedValue(0);

    await expect(
      updateAdminResource("tours", "tour-1", tourInput),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { isPublished: expect.any(Array) },
    });
  });

  it("rejects an unpublished default scene when publishing", async () => {
    databaseMocks.tourFindUnique.mockResolvedValue({ id: "tour-1" });
    databaseMocks.sceneFindUnique.mockResolvedValue({
      tourId: "tour-1",
      isPublished: false,
    });
    databaseMocks.sceneCount.mockResolvedValue(1);

    await expect(
      updateAdminResource("tours", "tour-1", tourInput),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { defaultSceneId: expect.any(Array) },
    });
  });

  it("rejects changing an existing scene's tour", async () => {
    databaseMocks.sceneFindUnique.mockResolvedValue({
      tourId: "tour-1",
      isPublished: true,
      tour: { isPublished: false, defaultSceneId: null },
    });

    await expect(
      updateAdminResource("scenes", "scene-1", {
        ...sceneInput,
        tourId: "tour-2",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_RELATION",
      fields: { tourId: expect.any(Array) },
    });
    expect(databaseMocks.sceneUpdate).not.toHaveBeenCalled();
  });

  it("rejects deleting a published tour's default scene", async () => {
    databaseMocks.sceneFindUnique.mockResolvedValue({
      tourId: "tour-1",
      isPublished: true,
      tour: { isPublished: true, defaultSceneId: "scene-1" },
    });

    await expect(
      deleteAdminResource("scenes", "scene-1"),
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      fields: { sceneId: expect.any(Array) },
    });
    expect(databaseMocks.sceneCount).not.toHaveBeenCalled();
    expect(databaseMocks.sceneDelete).not.toHaveBeenCalled();
  });
});

describe("scene panorama persistence", () => {
  it("persists the normalized cubemap configuration", async () => {
    databaseMocks.sceneCreate.mockResolvedValue({ id: "scene-1" });

    await createAdminResource("scenes", {
      ...sceneInput,
      panoramaType: "CUBEMAP",
      panoramaUrl: null,
      multiresConfig: {
        cubemapUrls: [
          " /cube/front.jpg ",
          "/cube/right.jpg",
          "/cube/back.jpg",
          "/cube/left.jpg",
          "/cube/up.jpg",
          "/cube/down.jpg",
        ],
        ignored: "value",
      },
    });

    expect(databaseMocks.sceneCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        multiresConfig: {
          cubemapUrls: [
            "/cube/front.jpg",
            "/cube/right.jpg",
            "/cube/back.jpg",
            "/cube/left.jpg",
            "/cube/up.jpg",
            "/cube/down.jpg",
          ],
        },
      }),
    });
  });
});

describe("default floor-plan transactions", () => {
  it("rejects changing an existing floor plan's tour", async () => {
    databaseMocks.floorPlanFindUnique.mockResolvedValue({ tourId: "tour-2" });

    await expect(
      updateAdminResource("floor-plans", "plan-2", floorPlanInput),
    ).rejects.toMatchObject({
      code: "INVALID_RELATION",
      fields: { tourId: expect.any(Array) },
    });
    expect(databaseMocks.floorPlanUpdateMany).not.toHaveBeenCalled();
    expect(databaseMocks.floorPlanUpdate).not.toHaveBeenCalled();
  });

  it("clears the previous default before creating a new default", async () => {
    databaseMocks.floorPlanCreate.mockResolvedValue({ id: "plan-2" });

    await createAdminResource("floor-plans", floorPlanInput);

    expect(databaseMocks.floorPlanUpdateMany).toHaveBeenCalledWith({
      where: { tourId: "tour-1" },
      data: { isDefault: false },
    });
    expect(databaseMocks.floorPlanCreate).toHaveBeenCalledWith({
      data: floorPlanInput,
    });
    expect(
      databaseMocks.floorPlanUpdateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(databaseMocks.floorPlanCreate.mock.invocationCallOrder[0]!);
  });

  it("clears the previous default before promoting an existing plan", async () => {
    databaseMocks.floorPlanUpdate.mockResolvedValue({ id: "plan-2" });

    await updateAdminResource("floor-plans", "plan-2", floorPlanInput);

    expect(databaseMocks.floorPlanUpdateMany).toHaveBeenCalledWith({
      where: { tourId: "tour-1" },
      data: { isDefault: false },
    });
    expect(databaseMocks.floorPlanUpdate).toHaveBeenCalledWith({
      where: { id: "plan-2" },
      data: floorPlanInput,
    });
    expect(
      databaseMocks.floorPlanUpdateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(databaseMocks.floorPlanUpdate.mock.invocationCallOrder[0]!);
  });
});
