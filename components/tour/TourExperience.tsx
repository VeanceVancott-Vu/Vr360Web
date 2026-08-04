"use client";

import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { AnalyticsPrivacyControl } from "@/components/tour/header/AnalyticsPrivacyControl";
import { DestinationInfoPanel } from "@/components/tour/panels/DestinationInfoPanel";
import { ImageLightbox } from "@/components/tour/panels/ImageLightbox";
import { SceneSidebar } from "@/components/tour/panels/SceneSidebar";
import { TourFloorPlanCard } from "@/components/tour/map/TourFloorPlanCard";
import { TourHeader } from "@/components/tour/header/TourHeader";
import {
  ViewerStateProvider,
  ViewerStatusAnnouncer,
} from "@/components/tour/context/ViewerStateContext";
import { PanoramaControls } from "@/components/tour/viewer/PanoramaControls";
import {
  PanoramaViewer,
  type PanoramaViewerHandle,
} from "@/components/tour/viewer/PanoramaViewer";
import { SceneTransitionOverlay } from "@/components/tour/viewer/SceneTransitionOverlay";
import {
  analyticsSessionToken,
  clearAnalyticsSessionToken,
  getAnalyticsPreference,
  getServerAnalyticsPreference,
  setAnalyticsPreference,
  subscribeAnalyticsPreference,
} from "@/lib/analytics/privacy";
import { getDictionary, parseLanguage } from "@/lib/i18n/dictionaries";
import { selectTourFloorPlan } from "@/lib/floor-plans/select";
import {
  scheduleNextPreview,
  warmActivePanorama,
} from "@/lib/pannellum/preload";
import type { HotspotDto, Language, SceneDto, TourDto } from "@/lib/types";
import { isSafeExternalUrl, parseSceneSlug, sceneHref } from "@/lib/utils/url";

const TourMapModal = dynamic(() => import("@/components/tour/map/TourMapModal"), {
  ssr: false,
  loading: () => (
    <div className="toast" role="status">
      Loading map…
    </div>
  ),
});

const subscribeToHydration = () => () => undefined;

export function TourExperience({ tour }: { tour: TourDto }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const analyticsPreference = useSyncExternalStore(
    subscribeAnalyticsPreference,
    getAnalyticsPreference,
    getServerAnalyticsPreference,
  );
  const defaultScene =
    tour.scenes.find((scene) => scene.id === tour.defaultSceneId) ??
    tour.scenes[0];
  if (!defaultScene) {
    throw new Error("This tour does not contain a published scene.");
  }

  const queryLanguage = parseLanguage(searchParams.get("lang"));
  const [language, setLanguage] = useState<Language>(queryLanguage);
  const [activeSlug, setActiveSlug] = useState(() =>
    parseSceneSlug(
      searchParams.get("scene"),
      tour.scenes.map((scene) => scene.slug),
      defaultScene.slug,
    ),
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotDto | null>(
    null,
  );
  const [lightboxHotspot, setLightboxHotspot] = useState<HotspotDto | null>(
    null,
  );
  const [transitioning, setTransitioning] = useState(false);
  const [transitionTitle, setTransitionTitle] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const viewerRef = useRef<PanoramaViewerHandle>(null);
  const sidebarTriggerRef = useRef<HTMLButtonElement>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hotspotAudioRef = useRef<HTMLAudioElement | null>(null);
  const dictionary = getDictionary(language);

  const scene = useMemo(
    () => tour.scenes.find((item) => item.slug === activeSlug) ?? defaultScene,
    [activeSlug, defaultScene, tour.scenes],
  );
  const sceneIndex = tour.scenes.findIndex((item) => item.id === scene.id);
  const sceneCategory = tour.categories.find(
    (category) => category.id === scene.categoryId,
  );
  const floorPlan = selectTourFloorPlan(tour.floorPlans);
  const previousScene =
    tour.scenes[(sceneIndex - 1 + tour.scenes.length) % tour.scenes.length];
  const nextScene = tour.scenes[(sceneIndex + 1) % tour.scenes.length];

  const trackEvent = useCallback(
    (
      eventType:
        "TOUR_OPENED" | "SCENE_OPENED" | "HOTSPOT_CLICKED" | "AUDIO_PLAYED",
      sceneId: string | null,
    ) => {
      if (analyticsPreference !== "granted") return;
      const sessionToken = analyticsSessionToken();
      if (!sessionToken) return;
      void fetch("/api/analytics/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tourId: tour.id,
          sceneId,
          eventType,
          sessionToken,
        }),
      }).catch(() => undefined);
    },
    [analyticsPreference, tour.id],
  );

  useEffect(() => {
    const requestedSlug = searchParams.get("scene");
    const parsed = parseSceneSlug(
      requestedSlug,
      tour.scenes.map((item) => item.slug),
      defaultScene.slug,
    );
    window.setTimeout(() => setActiveSlug(parsed), 0);
    const queryLang = searchParams.get("lang");
    if (queryLang) {
      window.setTimeout(() => setLanguage(parseLanguage(queryLang)), 0);
    }
    if (requestedSlug && requestedSlug !== parsed) {
      router.replace(sceneHref(pathname, parsed, parseLanguage(queryLang)));
    }
  }, [defaultScene.slug, pathname, router, searchParams, tour.scenes]);

  useEffect(() => {
    const saved = localStorage.getItem("dn360-language");
    if (!searchParams.get("lang") && saved === "en") {
      window.setTimeout(() => {
        setLanguage("en");
        router.replace(sceneHref(pathname, scene.slug, "en"));
      }, 0);
    }
  }, [pathname, router, scene.slug, searchParams]);
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("dn360-language", language);
  }, [language]);

  useEffect(() => {
    if (analyticsPreference !== "granted") clearAnalyticsSessionToken();
  }, [analyticsPreference]);

  useEffect(() => {
    trackEvent("TOUR_OPENED", null);
  }, [trackEvent]);

  useEffect(() => {
    const key = "dn360-recent-scenes";
    const existing = JSON.parse(sessionStorage.getItem(key) ?? "[]") as unknown;
    const values = Array.isArray(existing)
      ? existing.filter((item): item is string => typeof item === "string")
      : [];
    sessionStorage.setItem(
      key,
      JSON.stringify(
        [scene.id, ...values.filter((id) => id !== scene.id)].slice(0, 6),
      ),
    );
    trackEvent("SCENE_OPENED", scene.id);
  }, [scene.id, trackEvent]);

  useEffect(() => {
    if (!nextScene) return;
    return scheduleNextPreview(nextScene);
  }, [nextScene]);

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      hotspotAudioRef.current?.pause();
    },
    [],
  );

  const selectScene = useCallback(
    (target: SceneDto) => {
      if (target.id === scene.id || transitioning) {
        setSidebarOpen(false);
        setMapOpen(false);
        return;
      }
      warmActivePanorama(target);
      setTransitionTitle(language === "vi" ? target.titleVi : target.titleEn);
      setTransitioning(true);
      setActiveSlug(target.slug);
      setInfoOpen(false);
      setSelectedHotspot(null);
      hotspotAudioRef.current?.pause();
      router.push(sceneHref(pathname, target.slug, language), {
        scroll: false,
      });
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      transitionTimer.current = setTimeout(() => setTransitioning(false), 1800);
      setSidebarOpen(false);
      setMapOpen(false);
    },
    [language, pathname, router, scene.id, transitioning],
  );

  const handleHotspot = useCallback(
    (hotspot: HotspotDto) => {
      trackEvent("HOTSPOT_CLICKED", scene.id);
      if (hotspot.type === "SCENE_LINK" && hotspot.targetSceneId) {
        const target = tour.scenes.find(
          (item) => item.id === hotspot.targetSceneId,
        );
        if (target) {
          selectScene(target);
        }
        return;
      }
      if (hotspot.type === "INFORMATION") {
        setSelectedHotspot(hotspot);
        setInfoOpen(true);
        return;
      }
      if (hotspot.type === "IMAGE" && hotspot.imageUrl) {
        setLightboxHotspot(hotspot);
        return;
      }
      if (hotspot.type === "AUDIO" && hotspot.audioUrl) {
        hotspotAudioRef.current?.pause();
        const audio = new Audio(hotspot.audioUrl);
        hotspotAudioRef.current = audio;
        void audio.play().catch(() => setToast(dictionary.noAudio));
        trackEvent("AUDIO_PLAYED", scene.id);
        return;
      }
      if (
        hotspot.type === "EXTERNAL_LINK" &&
        isSafeExternalUrl(hotspot.externalUrl)
      ) {
        window.open(hotspot.externalUrl ?? "", "_blank", "noopener,noreferrer");
      }
    },
    [dictionary.noAudio, scene.id, selectScene, tour.scenes, trackEvent],
  );

  const handleLanguageChange = useCallback(
    (nextLanguage: Language) => {
      setLanguage(nextLanguage);
      router.replace(sceneHref(pathname, scene.slug, nextLanguage), {
        scroll: false,
      });
    },
    [pathname, router, scene.slug],
  );

  const closeInfo = useCallback(() => {
    setInfoOpen(false);
    setSelectedHotspot(null);
  }, []);
  const closeMap = useCallback(() => setMapOpen(false), []);

  async function shareScene() {
    const title = language === "vi" ? scene.titleVi : scene.titleEn;
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast(dictionary.copied);
        setTimeout(() => setToast(null), 1800);
      }
    } catch {
      return;
    }
  }

  return (
    <ViewerStateProvider
      value={{
        activeSceneId: scene.id,
        activeSceneTitle: language === "vi" ? scene.titleVi : scene.titleEn,
        language,
        transitioning,
      }}
    >
      <main
        className="tour-shell"
        data-hydrated={hydrated}
        aria-busy={!hydrated}
      >
        <a className="skip-link" href="#current-scene">
          {dictionary.skipToScene}
        </a>
        <PanoramaViewer
          ref={viewerRef}
          scene={scene}
          language={language}
          onLoad={() => setTransitioning(false)}
          onHotspotClick={handleHotspot}
        />
        <TourHeader
          language={language}
          dictionary={dictionary}
          tourTitle={language === "vi" ? tour.titleVi : tour.titleEn}
          onLanguageChange={handleLanguageChange}
          sidebarOpen={sidebarOpen}
          mapOpen={mapOpen}
          privacyOpen={privacyOpen}
          onMenu={(trigger) => {
            sidebarTriggerRef.current = trigger;
            setSidebarOpen((value) => !value);
          }}
          onMap={() => setMapOpen(true)}
          onShare={() => void shareScene()}
          onPrivacy={() => setPrivacyOpen(true)}
        />
        <SceneSidebar
          open={sidebarOpen}
          language={language}
          dictionary={dictionary}
          categories={tour.categories}
          scenes={tour.scenes}
          activeSceneId={scene.id}
          returnFocusRef={sidebarTriggerRef}
          onSelect={selectScene}
          onClose={() => setSidebarOpen(false)}
        />
        <section
          id="current-scene"
          className="current-scene"
          hidden={sidebarOpen}
          aria-labelledby="current-scene-title"
          tabIndex={-1}
        >
          <div className="current-scene__meta">
            <span className="current-scene__number">
              {String(sceneIndex + 1).padStart(2, "0")} /{" "}
              {String(tour.scenes.length).padStart(2, "0")}
            </span>
            {sceneCategory ? (
              <span className="current-scene__category">
                {language === "vi"
                  ? sceneCategory.nameVi
                  : sceneCategory.nameEn}
              </span>
            ) : null}
          </div>
          <h1 id="current-scene-title">
            {language === "vi" ? scene.titleVi : scene.titleEn}
          </h1>
          <p>
            {language === "vi"
              ? scene.shortDescriptionVi
              : scene.shortDescriptionEn}
          </p>
          <div className="current-scene__actions">
            <button
              type="button"
              className="scene-details-button"
              onClick={() => {
                setSelectedHotspot(null);
                setInfoOpen(true);
              }}
            >
              <Info size={16} aria-hidden="true" />
              {dictionary.details}
            </button>
            <nav className="scene-navigation" aria-label={dictionary.scenes}>
              <button
                type="button"
                aria-label={dictionary.previous}
                onClick={() => previousScene && selectScene(previousScene)}
              >
                <ChevronLeft size={18} aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={dictionary.next}
                onClick={() => nextScene && selectScene(nextScene)}
              >
                <ChevronRight size={18} aria-hidden="true" />
              </button>
            </nav>
          </div>
        </section>
        <PanoramaControls viewerRef={viewerRef} dictionary={dictionary} />
        {floorPlan ? (
          <TourFloorPlanCard
            floorPlan={floorPlan}
            activeScene={scene}
            language={language}
            dictionary={dictionary}
            expanded={mapOpen}
            onOpen={() => setMapOpen(true)}
          />
        ) : null}
        <SceneTransitionOverlay
          active={transitioning}
          title={transitionTitle}
          loadingLabel={dictionary.loadingDestination}
        />
        <ViewerStatusAnnouncer />
        {infoOpen ? (
          <DestinationInfoPanel
            scene={scene}
            hotspot={selectedHotspot}
            language={language}
            dictionary={dictionary}
            onClose={closeInfo}
          />
        ) : null}
        {mapOpen ? (
          <TourMapModal
            scenes={tour.scenes}
            floorPlan={floorPlan}
            activeSceneId={scene.id}
            language={language}
            dictionary={dictionary}
            onSelect={selectScene}
            onClose={closeMap}
          />
        ) : null}
        {lightboxHotspot?.imageUrl ? (
          <ImageLightbox
            imageUrl={lightboxHotspot.imageUrl}
            title={
              language === "vi"
                ? lightboxHotspot.labelVi
                : lightboxHotspot.labelEn
            }
            dictionary={dictionary}
            onClose={() => setLightboxHotspot(null)}
          />
        ) : null}
        <AnalyticsPrivacyControl
          dictionary={dictionary}
          preference={analyticsPreference}
          settingsOpen={privacyOpen}
          onChange={setAnalyticsPreference}
          onCloseSettings={() => setPrivacyOpen(false)}
        />
        {toast ? (
          <div className="toast" role="status">
            {toast}
          </div>
        ) : null}
      </main>
    </ViewerStateProvider>
  );
}
