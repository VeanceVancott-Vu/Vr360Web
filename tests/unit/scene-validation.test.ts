import { describe, expect, it } from "vitest";

import { sceneInputSchema } from "@/lib/validation/schemas";

const baseScene = {
  tourId: "tour-1",
  categoryId: "category-1",
  slug: "valid-scene",
  titleVi: "Canh hop le",
  titleEn: "Valid scene",
  shortDescriptionVi: "Mo ta ngan hop le.",
  shortDescriptionEn: "A valid short description.",
  fullDescriptionVi: "Mo ta day du cho canh panorama hop le.",
  fullDescriptionEn: "A complete description for a valid panorama scene.",
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
  isPublished: false,
};

describe("scene panorama validation", () => {
  it("requires an equirectangular panorama URL", () => {
    const result = sceneInputSchema.safeParse({
      ...baseScene,
      panoramaUrl: null,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.panoramaUrl).toContain(
        "An equirectangular panorama URL is required.",
      );
    }
  });

  it("accepts exactly six valid cubemap faces", () => {
    expect(
      sceneInputSchema.safeParse({
        ...baseScene,
        panoramaType: "CUBEMAP",
        panoramaUrl: null,
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
      }).success,
    ).toBe(true);
  });

  it("returns normalized cubemap configuration", () => {
    const result = sceneInputSchema.parse({
      ...baseScene,
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

    expect(result.multiresConfig).toEqual({
      cubemapUrls: [
        "/cube/front.jpg",
        "/cube/right.jpg",
        "/cube/back.jpg",
        "/cube/left.jpg",
        "/cube/up.jpg",
        "/cube/down.jpg",
      ],
    });
  });

  it("rejects incomplete cubemap faces", () => {
    expect(
      sceneInputSchema.safeParse({
        ...baseScene,
        panoramaType: "CUBEMAP",
        panoramaUrl: null,
        multiresConfig: {
          cubemapUrls: [
            "/cube/front.jpg",
            "/cube/right.jpg",
            "/cube/back.jpg",
            "/cube/left.jpg",
            "/cube/up.jpg",
          ],
        },
      }).success,
    ).toBe(false);
  });

  it("requires the Pannellum multiresolution fields", () => {
    const validConfig = {
      basePath: "/panos/multires",
      path: "/%l/%s%y_%x",
      fallbackPath: "/fallback/%s",
      extension: "jpg",
      tileResolution: 512,
      maxLevel: 4,
      cubeResolution: 4096,
    };

    expect(
      sceneInputSchema.safeParse({
        ...baseScene,
        panoramaType: "MULTIRES",
        panoramaUrl: null,
        multiresConfig: validConfig,
      }).success,
    ).toBe(true);
    expect(
      sceneInputSchema.safeParse({
        ...baseScene,
        panoramaType: "MULTIRES",
        panoramaUrl: null,
        multiresConfig: { ...validConfig, cubeResolution: undefined },
      }).success,
    ).toBe(false);
  });

  it("returns normalized multiresolution configuration", () => {
    const result = sceneInputSchema.parse({
      ...baseScene,
      panoramaType: "MULTIRES",
      panoramaUrl: null,
      multiresConfig: {
        basePath: " /panos/multires ",
        path: " /%l/%s%y_%x ",
        fallbackPath: " /fallback/%s ",
        extension: " jpg ",
        tileResolution: 512,
        maxLevel: 4,
        cubeResolution: 4096,
        ignored: "value",
      },
    });

    expect(result.multiresConfig).toEqual({
      basePath: "/panos/multires",
      path: "/%l/%s%y_%x",
      fallbackPath: "/fallback/%s",
      extension: "jpg",
      tileResolution: 512,
      maxLevel: 4,
      cubeResolution: 4096,
    });
  });

  it("enforces minimumHfov <= initialHfov <= maximumHfov", () => {
    expect(
      sceneInputSchema.safeParse({
        ...baseScene,
        minimumHfov: 100,
        initialHfov: 90,
      }).success,
    ).toBe(false);
    expect(
      sceneInputSchema.safeParse({
        ...baseScene,
        initialHfov: 130,
        maximumHfov: 120,
      }).success,
    ).toBe(false);
    expect(sceneInputSchema.safeParse(baseScene).success).toBe(true);
  });
});
