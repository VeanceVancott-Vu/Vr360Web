import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TourFloorPlanCard } from "@/components/tour/map/TourFloorPlanCard";
import { demoFloorPlan, demoTour } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("TourFloorPlanCard", () => {
  it("shows the supplied uploaded plan and opens the full map", () => {
    const onOpen = vi.fn();
    const uploadedPlan = {
      ...demoFloorPlan,
      imageUrl: "/uploads/floor-plans/current-plan.jpg",
    };

    render(
      <TourFloorPlanCard
        floorPlan={uploadedPlan}
        activeScene={demoTour.scenes[0]!}
        language="en"
        dictionary={getDictionary("en")}
        expanded={false}
        onOpen={onOpen}
      />,
    );

    const button = screen.getByRole("button", {
      name: /Open floor plan/,
    });
    expect(button.querySelector("img")).toHaveAttribute(
      "src",
      "/uploads/floor-plans/current-plan.jpg",
    );

    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
