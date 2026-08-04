import { describe, expect, it } from "vitest";

import { hotspotInputSchema, searchSchema } from "@/lib/validation/schemas";

const baseHotspot = {
  sceneId: "scene-1",
  pitch: 1,
  yaw: 2,
  labelVi: "Điểm",
  labelEn: "Point",
  contentVi: null,
  contentEn: null,
  icon: null,
  sortOrder: 0,
  isVisible: true,
};

describe("request validation", () => {
  it("rejects one-character search queries", () => {
    expect(searchSchema.safeParse({ q: "x" }).success).toBe(false);
  });

  it("requires a target for scene-link hotspots", () => {
    expect(
      hotspotInputSchema.safeParse({
        ...baseHotspot,
        type: "SCENE_LINK",
        targetSceneId: null,
      }).success,
    ).toBe(false);
  });

  it("rejects executable protocols for external hotspots", () => {
    expect(
      hotspotInputSchema.safeParse({
        ...baseHotspot,
        type: "EXTERNAL_LINK",
        externalUrl: "javascript:alert(1)",
      }).success,
    ).toBe(false);
  });
});
