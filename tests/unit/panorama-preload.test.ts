import { describe, expect, it } from "vitest";

import { demoTour } from "@/lib/demo-data";
import {
  allowsPreviewPrefetch,
  panoramaAssetUrls,
} from "@/lib/pannellum/preload";
import type { SceneDto } from "@/lib/types";

describe("panorama resource prioritization", () => {
  it("deduplicates the preview when it is also a cubemap face", () => {
    const scene = demoTour.scenes[0]!;
    const urls = panoramaAssetUrls(scene);

    expect(urls).toEqual(scene.cubemapUrls);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("warms an equirectangular preview and panorama only", () => {
    const scene = {
      ...demoTour.scenes[0]!,
      panoramaType: "EQUIRECTANGULAR",
      previewImageUrl: "/preview.jpg",
      panoramaUrl: "/panorama.jpg",
      cubemapUrls: null,
    } satisfies SceneDto;

    expect(panoramaAssetUrls(scene)).toEqual(["/preview.jpg", "/panorama.jpg"]);
  });

  it("leaves multiresolution tile selection to Pannellum", () => {
    const scene = {
      ...demoTour.scenes[0]!,
      panoramaType: "MULTIRES",
      previewImageUrl: "/preview.jpg",
      panoramaUrl: null,
      cubemapUrls: null,
      multiresConfig: {
        path: "/tiles/%l/%s%y_%x",
        maxLevel: 4,
      },
    } satisfies SceneDto;

    expect(panoramaAssetUrls(scene)).toEqual(["/preview.jpg"]);
  });

  it("disables speculative previews for data saver and slow links", () => {
    expect(allowsPreviewPrefetch()).toBe(true);
    expect(allowsPreviewPrefetch({ effectiveType: "4g" })).toBe(true);
    expect(allowsPreviewPrefetch({ effectiveType: "2g" })).toBe(false);
    expect(allowsPreviewPrefetch({ saveData: true })).toBe(false);
    expect(allowsPreviewPrefetch(undefined, true)).toBe(false);
  });
});
