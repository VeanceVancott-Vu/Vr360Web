import type { FloorPlanDto } from "@/lib/types";

export function selectTourFloorPlan(
  floorPlans: FloorPlanDto[] | undefined,
): FloorPlanDto | null {
  if (!floorPlans?.length) return null;
  return floorPlans.find((floorPlan) => floorPlan.isDefault) ?? floorPlans[0]!;
}
