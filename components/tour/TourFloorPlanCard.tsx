"use client";

import { Expand, MapPin } from "lucide-react";

import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { FloorPlanDto, Language, SceneDto } from "@/lib/types";

export function TourFloorPlanCard({
  floorPlan,
  activeScene,
  language,
  dictionary,
  expanded,
  onOpen,
}: {
  floorPlan: FloorPlanDto;
  activeScene: SceneDto;
  language: Language;
  dictionary: Dictionary;
  expanded: boolean;
  onOpen: () => void;
}) {
  const title = language === "vi" ? floorPlan.titleVi : floorPlan.titleEn;
  const sceneTitle =
    language === "vi" ? activeScene.titleVi : activeScene.titleEn;
  const activeMarker = floorPlan.markers.find(
    (marker) => marker.sceneId === activeScene.id,
  );

  return (
    <button
      type="button"
      className="tour-floor-plan-card glass"
      aria-label={dictionary.openFloorPlan + ": " + title}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onOpen}
    >
      <span className="tour-floor-plan-card__header">
        <span>
          <small>{dictionary.floorPlan}</small>
          <strong>{title}</strong>
        </span>
        <Expand size={17} aria-hidden="true" />
      </span>
      <span className="tour-floor-plan-card__preview" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={floorPlan.imageUrl} alt="" loading="lazy" decoding="async" />
        {activeMarker ? (
          <span
            className="tour-floor-plan-card__marker"
            style={{ left: activeMarker.x + "%", top: activeMarker.y + "%" }}
          />
        ) : null}
      </span>
      <span className="tour-floor-plan-card__location">
        <MapPin size={14} aria-hidden="true" />
        <span>{sceneTitle}</span>
      </span>
    </button>
  );
}
