import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Viewer } from "pannellum";

import { demoTour } from "@/lib/demo-data";

const pannellumMocks = vi.hoisted(() => ({
  viewerFactory: vi.fn(),
}));

vi.mock("pannellum", () => ({
  viewer: pannellumMocks.viewerFactory,
}));

vi.mock("@/lib/pannellum/preload", () => ({
  warmActivePanorama: vi.fn(),
}));

import { PanoramaViewer } from "@/components/tour/viewer/PanoramaViewer";

type ViewerListener = (...args: unknown[]) => void;

describe("PanoramaViewer lifecycle", () => {
  let listeners: Map<string, ViewerListener[]>;
  let viewer: Viewer;
  let currentSceneId: string;

  beforeEach(() => {
    listeners = new Map();
    currentSceneId = demoTour.scenes[0]!.id;

    viewer = {
      on: vi.fn((event: string, listener: ViewerListener) => {
        listeners.set(event, [...(listeners.get(event) ?? []), listener]);
        return viewer;
      }),
      destroy: vi.fn(),
      getPitch: vi.fn(() => 1),
      getYaw: vi.fn(() => 2),
      getHfov: vi.fn(() => 80),
      setPitch: vi.fn(() => viewer),
      setYaw: vi.fn(() => viewer),
      setHfov: vi.fn(() => viewer),
      startAutoRotate: vi.fn(() => viewer),
      stopAutoRotate: vi.fn(() => viewer),
      toggleFullscreen: vi.fn(() => viewer),
      startOrientation: vi.fn(),
      stopOrientation: vi.fn(),
      isOrientationSupported: vi.fn(() => true),
      isOrientationActive: vi.fn(() => false),
      isLoaded: vi.fn(() => true),
      getScene: vi.fn(() => currentSceneId),
      loadScene: vi.fn((sceneId: string) => {
        currentSceneId = sceneId;
        return viewer;
      }),
      addScene: vi.fn(() => viewer),
    };
    pannellumMocks.viewerFactory.mockImplementation((_container, config) => {
      if ("default" in config) currentSceneId = config.default.firstScene;
      return viewer;
    });

    Object.defineProperty(window, "WebGLRenderingContext", {
      configurable: true,
      value: function WebGLRenderingContext() {},
    });
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: vi.fn(() => ({})),
    });
    Object.defineProperty(window, "pannellum", {
      configurable: true,
      value: { viewer: pannellumMocks.viewerFactory },
    });
  });

  afterEach(() => {
    pannellumMocks.viewerFactory.mockReset();
    Reflect.deleteProperty(window, "pannellum");
  });

  it("reuses one viewer while loading a different scene", async () => {
    const firstScene = demoTour.scenes[0]!;
    const secondScene = demoTour.scenes[1]!;
    const onLoad = vi.fn();
    const { rerender, unmount } = render(
      <PanoramaViewer
        scene={firstScene}
        language="en"
        onLoad={onLoad}
        onHotspotClick={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(pannellumMocks.viewerFactory).toHaveBeenCalledTimes(1),
    );
    const region = screen.getByRole("region", {
      name: firstScene.titleEn + " — 360°",
    });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveAttribute("aria-busy", "true");
    expect(region).toHaveAccessibleDescription(
      "Use the arrow keys to look around and the plus and minus keys to zoom.",
    );
    act(() => {
      for (const listener of listeners.get("load") ?? []) listener();
    });
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(region).toHaveAttribute("aria-busy", "false");

    rerender(
      <PanoramaViewer
        scene={secondScene}
        language="en"
        onLoad={onLoad}
        onHotspotClick={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(viewer.addScene).toHaveBeenCalledWith(
        secondScene.id,
        expect.objectContaining({
          preview: secondScene.previewImageUrl,
          type: "cubemap",
        }),
      ),
    );
    expect(viewer.loadScene).toHaveBeenCalledWith(
      secondScene.id,
      secondScene.initialPitch,
      secondScene.initialYaw,
      secondScene.initialHfov,
    );
    expect(pannellumMocks.viewerFactory).toHaveBeenCalledTimes(1);
    expect(viewer.destroy).not.toHaveBeenCalled();

    act(() => {
      for (const listener of listeners.get("load") ?? []) listener();
    });
    expect(onLoad).toHaveBeenCalledTimes(2);

    unmount();
    expect(viewer.destroy).toHaveBeenCalledTimes(1);
  });
});
