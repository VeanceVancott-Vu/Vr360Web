import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import TourMapModal from "@/components/tour/map/TourMapModal";
import { demoTour } from "@/lib/demo-data";
import { getDictionary } from "@/lib/i18n/dictionaries";

vi.mock("@/components/tour/map/MiniMap", () => ({
  MiniMap: ({ label }: { label: string }) => (
    <div data-testid="street-map">{label}</div>
  ),
}));

describe("TourMapModal", () => {
  it("supports arrow-key tab selection and Escape", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <TourMapModal
        scenes={demoTour.scenes}
        floorPlan={demoTour.floorPlans?.[0] ?? null}
        activeSceneId={demoTour.scenes[0]!.id}
        language="en"
        dictionary={getDictionary("en")}
        onSelect={vi.fn()}
        onClose={onClose}
      />,
    );

    const floorTab = screen.getByRole("tab", { name: "Floor plan" });
    const streetTab = screen.getByRole("tab", { name: "Street map" });
    expect(floorTab).toHaveAttribute("aria-selected", "true");
    expect(floorTab).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(streetTab).toHaveAttribute("aria-selected", "true");
    expect(streetTab).toHaveFocus();
    expect(screen.getByTestId("street-map")).toHaveTextContent("All locations");

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("opens the street map directly when the tour has no floor plan", () => {
    render(
      <TourMapModal
        scenes={demoTour.scenes}
        floorPlan={null}
        activeSceneId={demoTour.scenes[0]!.id}
        language="en"
        dictionary={getDictionary("en")}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.queryByRole("tab", { name: "Floor plan" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Street map" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("street-map")).toHaveTextContent("All locations");
  });
});
