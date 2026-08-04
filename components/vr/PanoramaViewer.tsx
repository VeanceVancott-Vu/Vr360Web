"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { Viewer } from "pannellum";

import { PanoramaErrorState } from "@/components/vr/PanoramaErrorState";
import { PanoramaLoadingOverlay } from "@/components/vr/PanoramaLoadingOverlay";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createViewerConfig } from "@/lib/pannellum/config";
import { warmActivePanorama } from "@/lib/pannellum/preload";
import type { HotspotDto, Language, SceneDto } from "@/lib/types";

type PannellumWindow = Window & {
  pannellum?: { viewer: (typeof import("pannellum"))["viewer"] };
};

export interface PanoramaView {
  pitch: number;
  yaw: number;
  hfov: number;
}

export interface PanoramaViewerHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  toggleFullscreen: () => void;
  startAutoRotate: () => void;
  stopAutoRotate: () => void;
  toggleOrientation: () => boolean;
  isOrientationActive: () => boolean;
  getView: () => PanoramaView | null;
}

interface PanoramaViewerProps {
  scene: SceneDto;
  language: Language;
  onReady?: () => void;
  onLoad?: () => void;
  onSceneChange?: (scene: SceneDto) => void;
  onHotspotClick: (hotspot: HotspotDto) => void;
  onViewChange?: (view: PanoramaView) => void;
  onError?: (error: Error) => void;
}

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

export const PanoramaViewer = forwardRef<
  PanoramaViewerHandle,
  PanoramaViewerProps
>(function PanoramaViewer(
  {
    scene,
    language,
    onReady,
    onLoad,
    onSceneChange,
    onHotspotClick,
    onViewChange,
    onError,
  },
  forwardedRef,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const instructionsId = useId();
  const dictionary = getDictionary(language);
  const desiredSceneRef = useRef(scene);
  const desiredLanguageRef = useRef(language);
  const dictionaryRef = useRef(dictionary);
  const activeViewerKeyRef = useRef<string | null>(null);
  const activeViewerSceneRef = useRef(scene);
  desiredSceneRef.current = scene;
  desiredLanguageRef.current = language;
  dictionaryRef.current = dictionary;

  function currentView(): PanoramaView | null {
    const viewer = viewerRef.current;
    if (!viewer) return null;
    return {
      pitch: viewer.getPitch(),
      yaw: viewer.getYaw(),
      hfov: viewer.getHfov(),
    };
  }

  useImperativeHandle(
    forwardedRef,
    () => ({
      zoomIn: () => {
        const viewer = viewerRef.current;
        if (viewer)
          viewer.setHfov(Math.max(scene.minimumHfov, viewer.getHfov() - 10));
      },
      zoomOut: () => {
        const viewer = viewerRef.current;
        if (viewer)
          viewer.setHfov(Math.min(scene.maximumHfov, viewer.getHfov() + 10));
      },
      reset: () => {
        const viewer = viewerRef.current;
        if (!viewer) return;
        viewer.setPitch(scene.initialPitch, 500);
        viewer.setYaw(scene.initialYaw, 500);
        viewer.setHfov(scene.initialHfov, 500);
      },
      toggleFullscreen: () => viewerRef.current?.toggleFullscreen(),
      startAutoRotate: () => viewerRef.current?.startAutoRotate(-2),
      stopAutoRotate: () => viewerRef.current?.stopAutoRotate(),
      toggleOrientation: () => {
        const viewer = viewerRef.current;
        if (!viewer?.isOrientationSupported()) return false;
        if (viewer.isOrientationActive()) {
          viewer.stopOrientation();
          return false;
        }
        viewer.startOrientation();
        return true;
      },
      isOrientationActive: () =>
        viewerRef.current?.isOrientationActive() ?? false,
      getView: currentView,
    }),
    [scene],
  );

  const onViewChangeRef = useRef(onViewChange);
  useEffect(() => {
    onViewChangeRef.current = onViewChange;
  }, [onViewChange]);

  const onHotspotClickRef = useRef(onHotspotClick);
  useEffect(() => {
    onHotspotClickRef.current = onHotspotClick;
  }, [onHotspotClick]);

  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  const onLoadRef = useRef(onLoad);
  useEffect(() => {
    onLoadRef.current = onLoad;
  }, [onLoad]);

  const onSceneChangeRef = useRef(onSceneChange);
  useEffect(() => {
    onSceneChangeRef.current = onSceneChange;
  }, [onSceneChange]);

  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const switchToDesiredSceneRef = useRef<(viewer: Viewer) => boolean>(
    () => false,
  );
  switchToDesiredSceneRef.current = (viewer) => {
    const desiredScene = desiredSceneRef.current;
    const desiredLanguage = desiredLanguageRef.current;
    const desiredKey = desiredScene.id + ":" + desiredLanguage;
    if (activeViewerKeyRef.current === desiredKey || !viewer.isLoaded()) {
      return false;
    }

    setLoading(true);
    setError(null);
    warmActivePanorama(desiredScene);

    const preservedView =
      viewer.getScene() === desiredScene.id ? currentView() : null;
    const config = createViewerConfig(
      desiredScene,
      desiredLanguage,
      (hotspot) => onHotspotClickRef.current?.(hotspot),
    );
    viewer.addScene(desiredScene.id, config);
    activeViewerKeyRef.current = desiredKey;
    activeViewerSceneRef.current = desiredScene;
    viewer.loadScene(
      desiredScene.id,
      preservedView?.pitch ?? desiredScene.initialPitch,
      preservedView?.yaw ?? desiredScene.initialYaw,
      preservedView?.hfov ?? desiredScene.initialHfov,
    );
    return true;
  };

  useEffect(() => {
    let cancelled = false;
    let localViewer: Viewer | null = null;
    activeViewerKeyRef.current = null;
    setLoading(true);
    setError(null);

    async function initialize() {
      if (!containerRef.current) return;
      if (!supportsWebGl()) {
        const webglError = new Error(dictionaryRef.current.webglUnavailable);
        setError(webglError.message);
        setLoading(false);
        onErrorRef.current?.(webglError);
        return;
      }
      const initialScene = desiredSceneRef.current;
      const initialLanguage = desiredLanguageRef.current;
      if (
        initialScene.panoramaType === "EQUIRECTANGULAR" &&
        !initialScene.panoramaUrl
      ) {
        const missingError = new Error("No panorama URL is configured.");
        setError(missingError.message);
        setLoading(false);
        onErrorRef.current?.(missingError);
        return;
      }

      try {
        warmActivePanorama(initialScene);
        await import("pannellum");
        if (cancelled || !containerRef.current) return;
        const pannellum = (window as PannellumWindow).pannellum;
        if (!pannellum || typeof pannellum.viewer !== "function") {
          throw new Error("Pannellum did not expose its browser viewer API.");
        }

        const config = createViewerConfig(
          initialScene,
          initialLanguage,
          (hotspot) => onHotspotClickRef.current?.(hotspot),
        );
        localViewer = pannellum.viewer(containerRef.current, {
          default: { firstScene: initialScene.id },
          scenes: { [initialScene.id]: config },
        });
        viewerRef.current = localViewer;
        activeViewerKeyRef.current = initialScene.id + ":" + initialLanguage;
        activeViewerSceneRef.current = initialScene;
        onReadyRef.current?.();

        localViewer.on("load", () => {
          if (cancelled || !localViewer) return;
          if (switchToDesiredSceneRef.current(localViewer)) {
            return;
          }
          setLoading(false);
          onLoadRef.current?.();
          onSceneChangeRef.current?.(activeViewerSceneRef.current);
        });
        localViewer.on("error", (reason) => {
          if (cancelled) return;
          const viewerError = new Error(
            typeof reason === "string"
              ? reason
              : dictionaryRef.current.panoramaError,
          );
          setLoading(false);
          setError(viewerError.message);
          onErrorRef.current?.(viewerError);
        });

        const reportView = () => {
          const view = currentView();
          if (view) {
            onViewChangeRef.current?.(view);
          }
        };
        ["mouseup", "touchend", "zoomchange", "animatefinished"].forEach(
          (eventName) => localViewer?.on(eventName, reportView),
        );
      } catch (reason: unknown) {
        if (cancelled) return;
        const viewerError =
          reason instanceof Error
            ? reason
            : new Error(dictionaryRef.current.panoramaError);
        setLoading(false);
        setError(viewerError.message);
        onErrorRef.current?.(viewerError);
      }
    }

    void initialize();
    return () => {
      cancelled = true;
      if (localViewer) {
        localViewer.destroy();
        localViewer = null;
      }
      viewerRef.current = null;
      activeViewerKeyRef.current = null;
    };
  }, [retryKey]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (viewer) {
      switchToDesiredSceneRef.current(viewer);
    }
  }, [language, scene]);

  return (
    <div className="panorama-stage">
      <div
        ref={containerRef}
        className="panorama-root"
        style={{ backgroundImage: `url("${scene.previewImageUrl}")` }}
        role="region"
        tabIndex={0}
        aria-busy={loading}
        aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight + -"
        aria-label={`${language === "vi" ? scene.titleVi : scene.titleEn} — 360°`}
        aria-describedby={instructionsId}
      />
      <p id={instructionsId} className="sr-only">
        {dictionary.viewerKeyboardHelp}
      </p>
      {loading && !error ? (
        <PanoramaLoadingOverlay dictionary={dictionary} />
      ) : null}
      {error ? (
        <PanoramaErrorState
          dictionary={dictionary}
          message={error}
          onRetry={() => setRetryKey((value) => value + 1)}
        />
      ) : null}
    </div>
  );
});
