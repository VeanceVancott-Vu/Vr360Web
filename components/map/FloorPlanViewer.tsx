"use client";

import { Compass, DoorClosed, Home, MapPin, Radar, Target } from "lucide-react";
import type { CSSProperties } from "react";

import type { FloorPlanDto, Language, SceneDto } from "@/lib/types";

const iconMap = {
  MapPin,
  Compass,
  Target,
  Radar,
  DoorClosed,
  Home,
};

const themeColorMap: Record<string, string> = {
  blue: "#38bdf8",
  emerald: "#34d399",
  gold: "#fbbf24",
  rose: "#fb7185",
  purple: "#c084fc",
};

export function FloorPlanViewer({
  floorPlan,
  scenes,
  activeSceneId,
  language,
  onSelect,
}: {
  floorPlan: FloorPlanDto;
  scenes: SceneDto[];
  activeSceneId: string;
  language: Language;
  onSelect: (scene: SceneDto) => void;
}) {
  return (
    <div className="floor-plan-viewer">
      {/* Floor plans are user uploads with unknown intrinsic dimensions. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="floor-plan-viewer__image"
        src={floorPlan.imageUrl}
        alt={language === "vi" ? floorPlan.titleVi : floorPlan.titleEn}
        decoding="async"
        fetchPriority="low"
        loading="lazy"
        draggable={false}
      />

      {floorPlan.markers.map((marker) => {
        const isSelected = marker.sceneId === activeSceneId;
        const scene = scenes.find((s) => s.id === marker.sceneId);
        if (!scene) return null;
        const IconComp = iconMap[marker.icon as keyof typeof iconMap] || MapPin;
        const markerColor =
          themeColorMap[marker.colorTheme] ?? themeColorMap.blue!;
        const label = language === "vi" ? marker.labelVi : marker.labelEn;
        const markerStyle = {
          left: marker.x + "%",
          top: marker.y + "%",
          "--floor-marker-color": markerColor,
        } as CSSProperties;

        return (
          <div
            key={marker.id}
            className="floor-plan-marker"
            data-active={isSelected}
            style={markerStyle}
          >
            <button
              type="button"
              className="floor-plan-marker__button"
              data-tooltip={label}
              aria-label={label}
              aria-current={isSelected ? "location" : undefined}
              onClick={() => onSelect(scene)}
            >
              <IconComp size={17} aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
