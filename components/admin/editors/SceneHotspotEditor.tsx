"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  HotspotCoordinatePicker,
  type PickedCoordinates,
} from "./HotspotCoordinatePicker";
import { HotspotForm } from "@/components/admin/forms/HotspotForm";
import type { HotspotDto, SceneDto } from "@/lib/types";

export function SceneHotspotEditor({
  scene,
  sceneId,
  previewImageUrl,
  scenes,
  hotspots,
}: {
  scene?: SceneDto;
  sceneId: string;
  previewImageUrl: string;
  scenes: { id: string; titleEn: string }[];
  hotspots: HotspotDto[];
}) {
  const router = useRouter();
  const [coordinates, setCoordinates] = useState<PickedCoordinates>({
    pitch: 0,
    yaw: 0,
  });
  const [selectedHotspotId, setSelectedHotspotId] = useState("");
  const selectedHotspot = hotspots.find(
    (hotspot) => hotspot.id === selectedHotspotId,
  );

  function selectHotspot(id: string) {
    setSelectedHotspotId(id);
    const hotspot = hotspots.find((candidate) => candidate.id === id);
    if (hotspot) {
      setCoordinates({ pitch: hotspot.pitch, yaw: hotspot.yaw });
    }
  }

  return (
    <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
      <div className="admin-card">
        <label className="field">
          <span>Edit existing hotspot</span>
          <select
            value={selectedHotspotId}
            onChange={(event) => selectHotspot(event.target.value)}
          >
            <option value="">Create a new hotspot</option>
            {hotspots.map((hotspot) => (
              <option key={hotspot.id} value={hotspot.id}>
                {hotspot.labelEn}
              </option>
            ))}
          </select>
        </label>
      </div>
      <HotspotCoordinatePicker
        scene={scene}
        previewImageUrl={previewImageUrl}
        hotspots={hotspots}
        selectedHotspotId={selectedHotspotId}
        onPick={setCoordinates}
        onSelectHotspot={selectHotspot}
        onSaved={() => router.refresh()}
      />
      <HotspotForm
        key={selectedHotspot?.id ?? "new"}
        id={selectedHotspot?.id}
        initial={selectedHotspot}
        sceneId={sceneId}
        scenes={scenes}
        coordinates={coordinates}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
