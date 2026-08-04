"use client";

import { Compass, Map, MapPin, X } from "lucide-react";
import { useState } from "react";

import { FloorPlanViewer } from "./FloorPlanViewer";
import { MiniMap } from "./MiniMap";
import { useDialogFocus } from "@/lib/accessibility/use-dialog-focus";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { FloorPlanDto, Language, SceneDto } from "@/lib/types";

export default function TourMapModal({
  scenes,
  floorPlan,
  activeSceneId,
  language,
  dictionary,
  onSelect,
  onClose,
}: {
  scenes: SceneDto[];
  floorPlan: FloorPlanDto | null;
  activeSceneId: string;
  language: Language;
  dictionary: Dictionary;
  onSelect: (scene: SceneDto) => void;
  onClose: () => void;
}) {
  const [mapMode, setMapMode] = useState<"floor" | "osm">(
    floorPlan ? "floor" : "osm",
  );
  const dialogRef = useDialogFocus<HTMLElement>(onClose);

  function selectMapTab(nextMode: "floor" | "osm", focusTab = false) {
    if (nextMode === "floor" && !floorPlan) return;
    setMapMode(nextMode);
    if (focusTab) {
      document
        .getElementById(
          nextMode === "floor" ? "floor-plan-tab" : "street-map-tab",
        )
        ?.focus();
    }
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    selectMapTab(
      event.key === "ArrowRight" || event.key === "End" ? "osm" : "floor",
      true,
    );
  }

  return (
    <>
      <button
        type="button"
        className="dialog-backdrop"
        tabIndex={-1}
        aria-hidden="true"
        onClick={onClose}
      />
      <section
        ref={dialogRef}
        className="map-modal glass"
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-modal-title"
        tabIndex={-1}
      >
        <header className="map-modal__header">
          <div>
            <p className="eyebrow">{dictionary.map}</p>
            <h2 id="map-modal-title">
              {mapMode === "floor" && floorPlan
                ? language === "vi"
                  ? floorPlan.titleVi
                  : floorPlan.titleEn
                : dictionary.allLocations}
            </h2>
            <div
              className="map-mode-switch"
              role="tablist"
              aria-label={dictionary.map}
            >
              {floorPlan ? (
                <button
                  id="floor-plan-tab"
                  type="button"
                  role="tab"
                  aria-selected={mapMode === "floor"}
                  aria-controls="floor-plan-panel"
                  tabIndex={mapMode === "floor" ? 0 : -1}
                  onClick={() => selectMapTab("floor")}
                  onKeyDown={handleTabKeyDown}
                >
                  <Compass size={14} aria-hidden="true" />
                  {dictionary.floorPlan}
                </button>
              ) : null}
              <button
                id="street-map-tab"
                type="button"
                role="tab"
                aria-selected={mapMode === "osm"}
                aria-controls="street-map-panel"
                tabIndex={mapMode === "osm" ? 0 : -1}
                onClick={() => selectMapTab("osm")}
                onKeyDown={handleTabKeyDown}
              >
                <Map size={14} aria-hidden="true" />
                {dictionary.streetMap}
              </button>
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label={dictionary.close}
            onClick={onClose}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <div
          className="map-modal__content"
          id={mapMode === "floor" ? "floor-plan-panel" : "street-map-panel"}
          role="tabpanel"
          aria-labelledby={
            mapMode === "floor" ? "floor-plan-tab" : "street-map-tab"
          }
        >
          {mapMode === "floor" && floorPlan ? (
            <FloorPlanViewer
              floorPlan={floorPlan}
              scenes={scenes}
              activeSceneId={activeSceneId}
              language={language}
              onSelect={(scene: SceneDto) => {
                onSelect(scene);
                onClose();
              }}
            />
          ) : (
            <MiniMap
              scenes={scenes}
              activeSceneId={activeSceneId}
              language={language}
              label={dictionary.allLocations}
              onSelect={(scene: SceneDto) => {
                onSelect(scene);
                onClose();
              }}
            />
          )}
        </div>

        <nav className="map-fallback" aria-label={dictionary.allLocations}>
          {scenes.map((scene) => (
            <button
              key={scene.id}
              type="button"
              data-active={scene.id === activeSceneId}
              aria-current={scene.id === activeSceneId ? "location" : undefined}
              onClick={() => {
                onSelect(scene);
                onClose();
              }}
            >
              <MapPin size={15} aria-hidden="true" />
              {language === "vi" ? scene.titleVi : scene.titleEn}
            </button>
          ))}
        </nav>
      </section>
    </>
  );
}
