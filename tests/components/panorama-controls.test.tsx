import { fireEvent, render, screen } from "@testing-library/react";
import type { RefObject } from "react";
import { describe, expect, it, vi } from "vitest";

import { PanoramaControls } from "@/components/vr/PanoramaControls";
import type { PanoramaViewerHandle } from "@/components/vr/PanoramaViewer";
import { getDictionary } from "@/lib/i18n/dictionaries";

describe("PanoramaControls", () => {
  it("requests device orientation and exposes its pressed state", () => {
    const toggleOrientation = vi.fn(() => true);
    const handle: PanoramaViewerHandle = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      toggleFullscreen: vi.fn(),
      startAutoRotate: vi.fn(),
      stopAutoRotate: vi.fn(),
      toggleOrientation,
      isOrientationActive: vi.fn(() => true),
      getView: vi.fn(() => null),
    };
    const viewerRef = { current: handle } as RefObject<PanoramaViewerHandle>;

    render(
      <PanoramaControls
        viewerRef={viewerRef}
        dictionary={getDictionary("en")}
      />,
    );

    const orientationButton = screen.getByRole("button", {
      name: "Device motion control",
    });
    expect(orientationButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(orientationButton);

    expect(toggleOrientation).toHaveBeenCalledOnce();
    expect(orientationButton).toHaveAttribute("aria-pressed", "true");
  });

  it("announces the action that will stop auto rotation", () => {
    const handle: PanoramaViewerHandle = {
      zoomIn: vi.fn(),
      zoomOut: vi.fn(),
      reset: vi.fn(),
      toggleFullscreen: vi.fn(),
      startAutoRotate: vi.fn(),
      stopAutoRotate: vi.fn(),
      toggleOrientation: vi.fn(() => false),
      isOrientationActive: vi.fn(() => false),
      getView: vi.fn(() => null),
    };
    const viewerRef = { current: handle } as RefObject<PanoramaViewerHandle>;
    render(
      <PanoramaControls
        viewerRef={viewerRef}
        dictionary={getDictionary("en")}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Auto rotate" }));

    expect(handle.startAutoRotate).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: "Stop auto rotate" }),
    ).toHaveAttribute("aria-pressed", "true");
  });
});
