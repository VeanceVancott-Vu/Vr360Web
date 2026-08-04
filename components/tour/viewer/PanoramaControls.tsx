"use client";

import {
  Expand,
  LocateFixed,
  Minus,
  Plus,
  RotateCw,
  Smartphone,
} from "lucide-react";
import type { RefObject } from "react";
import { useEffect, useRef, useState } from "react";

import type { PanoramaViewerHandle } from "./PanoramaViewer";
import type { Dictionary } from "@/lib/i18n/dictionaries";

export function PanoramaControls({
  viewerRef,
  dictionary,
}: {
  viewerRef: RefObject<PanoramaViewerHandle | null>;
  dictionary: Dictionary;
}) {
  const [rotating, setRotating] = useState(false);
  const [orientationActive, setOrientationActive] = useState(false);
  const orientationTimerRef = useRef<number | null>(null);

  function toggleRotate() {
    if (rotating) viewerRef.current?.stopAutoRotate();
    else viewerRef.current?.startAutoRotate();
    setRotating((value) => !value);
  }

  useEffect(
    () => () => {
      if (orientationTimerRef.current)
        window.clearTimeout(orientationTimerRef.current);
    },
    [],
  );

  function toggleOrientation() {
    const requested = viewerRef.current?.toggleOrientation() ?? false;
    setOrientationActive(requested);
    if (orientationTimerRef.current)
      window.clearTimeout(orientationTimerRef.current);
    if (requested) {
      orientationTimerRef.current = window.setTimeout(() => {
        setOrientationActive(viewerRef.current?.isOrientationActive() ?? false);
      }, 800);
    }
  }
  const rotationLabel = rotating
    ? dictionary.stopAutoRotate
    : dictionary.autoRotate;

  return (
    <div
      className="panorama-controls glass"
      role="group"
      aria-label={dictionary.tourTools}
    >
      <button
        className="icon-button viewer-control viewer-control--zoom"
        type="button"
        title={dictionary.zoomIn}
        aria-label={dictionary.zoomIn}
        data-tooltip={dictionary.zoomIn}
        onClick={() => viewerRef.current?.zoomIn()}
      >
        <Plus size={17} aria-hidden="true" />
      </button>
      <button
        className="icon-button viewer-control viewer-control--zoom"
        type="button"
        title={dictionary.zoomOut}
        aria-label={dictionary.zoomOut}
        data-tooltip={dictionary.zoomOut}
        onClick={() => viewerRef.current?.zoomOut()}
      >
        <Minus size={17} aria-hidden="true" />
      </button>
      <button
        className="icon-button viewer-control"
        type="button"
        title={dictionary.resetView}
        aria-label={dictionary.resetView}
        data-tooltip={dictionary.resetView}
        onClick={() => viewerRef.current?.reset()}
      >
        <LocateFixed size={17} aria-hidden="true" />
      </button>
      <button
        className="icon-button viewer-control"
        type="button"
        title={rotationLabel}
        aria-label={rotationLabel}
        data-tooltip={rotationLabel}
        aria-pressed={rotating}
        onClick={toggleRotate}
      >
        <RotateCw size={17} aria-hidden="true" />
      </button>
      <button
        className="icon-button viewer-control orientation-control"
        type="button"
        title={dictionary.deviceOrientation}
        aria-label={dictionary.deviceOrientation}
        data-tooltip={dictionary.deviceOrientation}
        aria-pressed={orientationActive}
        onClick={toggleOrientation}
      >
        <Smartphone size={17} aria-hidden="true" />
      </button>
      <button
        className="icon-button viewer-control"
        type="button"
        title={dictionary.fullscreen}
        aria-label={dictionary.fullscreen}
        data-tooltip={dictionary.fullscreen}
        onClick={() => viewerRef.current?.toggleFullscreen()}
      >
        <Expand size={17} aria-hidden="true" />
      </button>
    </div>
  );
}
