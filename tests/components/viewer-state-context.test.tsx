import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ViewerStateProvider,
  ViewerStatusAnnouncer,
} from "@/components/tour/context/ViewerStateContext";

describe("ViewerStateContext", () => {
  it("announces the active scene in the selected language", () => {
    const { rerender } = render(
      <ViewerStateProvider
        value={{
          activeSceneId: "scene-overview",
          activeSceneTitle: "Da Nang Overview",
          language: "en",
          transitioning: false,
        }}
      >
        <ViewerStatusAnnouncer />
      </ViewerStateProvider>,
    );

    expect(
      screen.getByText("Scene changed to Da Nang Overview"),
    ).toHaveAttribute("aria-live", "polite");

    rerender(
      <ViewerStateProvider
        value={{
          activeSceneId: "scene-overview",
          activeSceneTitle: "Tổng quan Đà Nẵng",
          language: "vi",
          transitioning: false,
        }}
      >
        <ViewerStatusAnnouncer />
      </ViewerStateProvider>,
    );

    expect(screen.getByText("Đã chuyển đến Tổng quan Đà Nẵng")).toBeVisible();
  });
});
