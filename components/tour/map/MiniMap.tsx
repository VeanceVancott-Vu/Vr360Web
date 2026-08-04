"use client";

import type { LatLngBoundsExpression } from "leaflet";
import { useEffect } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import type { Language, SceneDto } from "@/lib/types";

function FitSceneBounds({ scenes }: { scenes: SceneDto[] }) {
  const map = useMap();
  useEffect(() => {
    const bounds = scenes.map(
      (scene) => [scene.latitude, scene.longitude] as [number, number],
    );
    if (bounds.length > 1) {
      map.fitBounds(bounds as LatLngBoundsExpression, { padding: [32, 32] });
    } else if (bounds[0]) {
      map.setView(bounds[0], 13);
    }
  }, [map, scenes]);
  return null;
}

export function MiniMap({
  scenes,
  activeSceneId,
  language,
  label,
  onSelect,
}: {
  scenes: SceneDto[];
  activeSceneId: string;
  language: Language;
  label: string;
  onSelect: (scene: SceneDto) => void;
}) {
  const active =
    scenes.find((scene) => scene.id === activeSceneId) ?? scenes[0];
  if (!active) return null;
  return (
    <div role="region" aria-label={label}>
      <MapContainer
        className="tour-map"
        center={[active.latitude, active.longitude]}
        zoom={12}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitSceneBounds scenes={scenes} />
        {scenes.map((scene) => {
          const selected = scene.id === activeSceneId;
          return (
            <CircleMarker
              key={scene.id}
              center={[scene.latitude, scene.longitude]}
              radius={selected ? 11 : 8}
              pathOptions={{
                color: selected ? "#f7c85b" : "#ffffff",
                fillColor: selected ? "#13b9c3" : "#0b2940",
                fillOpacity: 0.95,
                weight: selected ? 4 : 2,
              }}
              eventHandlers={{ click: () => onSelect(scene) }}
            >
              <Popup>{language === "vi" ? scene.titleVi : scene.titleEn}</Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
