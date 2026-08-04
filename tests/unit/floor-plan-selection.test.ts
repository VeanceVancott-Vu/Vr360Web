import { describe, expect, it } from "vitest";

import { demoFloorPlan } from "@/lib/demo-data";
import { selectTourFloorPlan } from "@/lib/floor-plans/select";

describe("selectTourFloorPlan", () => {
  it("prefers the default plan", () => {
    const olderPlan = {
      ...demoFloorPlan,
      id: "older-plan",
      isDefault: false,
    };

    expect(selectTourFloorPlan([olderPlan, demoFloorPlan])).toBe(demoFloorPlan);
  });

  it("falls back to the first plan and handles missing plans", () => {
    const plan = { ...demoFloorPlan, isDefault: false };

    expect(selectTourFloorPlan([plan])).toBe(plan);
    expect(selectTourFloorPlan([])).toBeNull();
    expect(selectTourFloorPlan(undefined)).toBeNull();
  });
});
