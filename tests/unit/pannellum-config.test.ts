import { describe, expect, it, vi } from "vitest";

import { demoTour } from "@/lib/demo-data";
import {
  createHotspotConfig,
  createViewerConfig,
} from "@/lib/pannellum/config";

describe("Pannellum configuration conversion", () => {
  const scene = demoTour.scenes[0]!;

  it("maps equirectangular scene limits and preview data", () => {
    const config = createViewerConfig(scene, "en", vi.fn());
    expect(config).toMatchObject({
      type: scene.panoramaType.toLowerCase(),
      preview: scene.previewImageUrl,
      minHfov: 45,
      maxHfov: 120,
      showControls: false,
    });
    expect(config.hotSpots).toHaveLength(scene.hotspots.length);
  });

  it("localizes hotspot labels and keeps typed coordinates", () => {
    const hotspot = scene.hotspots[0]!;
    const config = createHotspotConfig(hotspot, "en", vi.fn());
    expect(config.pitch).toBe(hotspot.pitch);
    expect(config.yaw).toBe(hotspot.yaw);
    expect(config.createTooltipArgs).toEqual({ label: hotspot.labelEn });
  });
});
