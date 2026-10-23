"use client";

import {
  Compass,
  Crosshair,
  DoorClosed,
  Home,
  MapPin,
  Plus,
  Radar,
  Save,
  Target,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { adminRequest } from "@/lib/api/admin-client";
import type { FloorPlanDto, FloorPlanMarkerDto, SceneDto } from "@/lib/types";

const iconMap = {
  MapPin,
  Compass,
  Target,
  Radar,
  DoorClosed,
  Home,
};

const colorThemes = [
  { value: "blue", label: "Standard Blue Pulse", color: "#3b82f6" },
  { value: "emerald", label: "Emerald Green (Free Benefits)", color: "#10b981" },
  { value: "gold", label: "Amber Gold (Hot Deal)", color: "#f59e0b" },
  { value: "rose", label: "Rose Red (Alert / Entrance)", color: "#f43f5e" },
  { value: "purple", label: "Violet Purple (Premium Room)", color: "#a855f7" },
];

export function FloorMapStudio({
  floorPlan,
  scenes,
}: {
  floorPlan: FloorPlanDto;
  scenes: SceneDto[];
}) {
  const router = useRouter();
  const imageRef = useRef<HTMLImageElement>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(
    floorPlan.markers[0]?.id ?? null,
  );
  const [aimedPoint, setAimedPoint] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedMarker = floorPlan.markers.find(
    (m) => m.id === selectedMarkerId,
  );

  // Form states for marker editing
  const [targetSceneId, setTargetSceneId] = useState(
    selectedMarker?.sceneId ?? scenes[0]?.id ?? "",
  );
  const [labelVi, setLabelVi] = useState(
    selectedMarker?.labelVi ?? scenes[0]?.titleVi ?? "",
  );
  const [labelEn, setLabelEn] = useState(
    selectedMarker?.labelEn ?? scenes[0]?.titleEn ?? "",
  );
  const [icon, setIcon] = useState(selectedMarker?.icon ?? "MapPin");
  const [colorTheme, setColorTheme] = useState(
    selectedMarker?.colorTheme ?? "blue",
  );
  const [posX, setPosX] = useState(selectedMarker?.x ?? 50);
  const [posY, setPosY] = useState(selectedMarker?.y ?? 50);

  function handleSelectMarker(marker: FloorPlanMarkerDto) {
    setSelectedMarkerId(marker.id);
    setTargetSceneId(marker.sceneId);
    setLabelVi(marker.labelVi);
    setLabelEn(marker.labelEn);
    setIcon(marker.icon);
    setColorTheme(marker.colorTheme);
    setPosX(marker.x);
    setPosY(marker.y);
    setAimedPoint(null);
  }

  function handleCanvasClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const xPercent = Math.round((clickX / rect.width) * 10000) / 100;
    const yPercent = Math.round((clickY / rect.height) * 10000) / 100;

    const clampedX = Math.max(0, Math.min(100, xPercent));
    const clampedY = Math.max(0, Math.min(100, yPercent));

    setAimedPoint({ x: clampedX, y: clampedY });
    setPosX(clampedX);
    setPosY(clampedY);
  }

  function handleSceneChange(sceneId: string) {
    setTargetSceneId(sceneId);
    const sc = scenes.find((s) => s.id === sceneId);
    if (sc) {
      setLabelVi(sc.titleVi);
      setLabelEn(sc.titleEn);
    }
  }

  async function handleSaveMarker() {
    setSaving(true);
    setMessage(null);

    const payload = {
      floorPlanId: floorPlan.id,
      sceneId: targetSceneId,
      x: posX,
      y: posY,
      labelVi,
      labelEn,
      icon,
      colorTheme,
    };

    try {
      await adminRequest<unknown>(
        `/api/admin/floor-plans/${floorPlan.id}/markers`,
        {
          method: selectedMarkerId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            selectedMarkerId
              ? { markerId: selectedMarkerId, ...payload }
              : payload,
          ),
        },
      );
      setMessage("Marker saved successfully.");
      setAimedPoint(null);
      router.refresh();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while saving.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMarker() {
    if (!selectedMarkerId) return;
    if (!window.confirm("Are you sure you want to delete this marker?")) return;

    setSaving(true);
    setMessage(null);
    try {
      await adminRequest<unknown>(
        `/api/admin/floor-plans/${floorPlan.id}/markers?markerId=${selectedMarkerId}`,
        { method: "DELETE" },
      );
      setMessage("Marker deleted.");
      setSelectedMarkerId(null);
      setAimedPoint(null);
      router.refresh();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error
          ? error.message
          : "An error occurred while deleting.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleNewMarkerSetup() {
    setSelectedMarkerId(null);
    setTargetSceneId(scenes[0]?.id ?? "");
    setLabelVi(scenes[0]?.titleVi ?? "");
    setLabelEn(scenes[0]?.titleEn ?? "");
    setIcon("MapPin");
    setColorTheme("blue");
    setPosX(aimedPoint?.x ?? 50);
    setPosY(aimedPoint?.y ?? 50);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 22rem", gap: "1.5rem" }}>
      {/* 2D Interactive Canvas Editor */}
      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{floorPlan.titleVi}</h2>
            <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.85rem" }}>
              Click anywhere on the floor map drawing to aim/place markers
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              className="secondary-button"
              style={{ color: "#f43f5e", borderColor: "rgba(244, 63, 94, 0.4)" }}
              onClick={async () => {
                if (!window.confirm(`Are you sure you want to delete "${floorPlan.titleVi}"?`)) return;
                setMessage(null);
                try {
                  await adminRequest<unknown>(
                    `/api/admin/floor-plans/${floorPlan.id}`,
                    { method: "DELETE" },
                  );
                  router.push("/admin/maps");
                } catch (error: unknown) {
                  setMessage(
                    error instanceof Error
                      ? error.message
                      : "An error occurred while deleting.",
                  );
                }
              }}
            >
              <Trash2 size={15} aria-hidden="true" /> Delete Map
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={handleNewMarkerSetup}
            >
              <Plus size={16} aria-hidden="true" /> Add New Marker
            </button>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            borderRadius: "0.75rem",
            overflow: "hidden",
            border: "1px solid var(--glass-border)",
            background: "#040f1a",
            cursor: "crosshair",
            userSelect: "none",
          }}
          onClick={handleCanvasClick}
        >
          {/* Floor Plan Drawing */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={floorPlan.imageUrl}
            alt={floorPlan.titleEn}
            style={{ width: "100%", height: "auto", display: "block" }}
          />

          {/* Aimed Point Reticle Indicator */}
          {aimedPoint ? (
            <div
              style={{
                position: "absolute",
                left: `${aimedPoint.x}%`,
                top: `${aimedPoint.y}%`,
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 20,
              }}
            >
              <div
                style={{
                  width: "1.75rem",
                  height: "1.75rem",
                  borderRadius: "50%",
                  border: "2px dashed #f59e0b",
                  animation: "pulse 1.2s infinite",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(245, 158, 11, 0.2)",
                }}
              >
                <Crosshair size={14} style={{ color: "#f59e0b" }} />
              </div>
            </div>
          ) : null}

          {/* Existing Floor Map Markers */}
          {floorPlan.markers.map((marker) => {
            const isSelected = marker.id === selectedMarkerId;
            const IconComp =
              iconMap[marker.icon as keyof typeof iconMap] || MapPin;
            const themeObj =
              colorThemes.find((t) => t.value === marker.colorTheme) ||
              colorThemes[0]!;

            return (
              <button
                key={marker.id}
                type="button"
                style={{
                  position: "absolute",
                  left: `${marker.x}%`,
                  top: `${marker.y}%`,
                  transform: "translate(-50%, -50%)",
                  border: isSelected
                    ? "2px solid #ffffff"
                    : `1px solid ${themeObj.color}`,
                  borderRadius: "50%",
                  width: isSelected ? "2.5rem" : "2.1rem",
                  height: isSelected ? "2.5rem" : "2.1rem",
                  background: isSelected
                    ? themeObj.color
                    : "rgba(6, 21, 34, 0.9)",
                  color: isSelected ? "#ffffff" : themeObj.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: isSelected
                    ? `0 0 16px ${themeObj.color}`
                    : "0 2px 8px rgba(0, 0, 0, 0.5)",
                  zIndex: isSelected ? 15 : 10,
                  transition: "all 150ms ease",
                  cursor: "pointer",
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectMarker(marker);
                }}
                title={`${marker.labelVi} (${marker.x}%, ${marker.y}%)`}
              >
                <IconComp size={isSelected ? 18 : 15} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Marker Customization Controls Sidebar */}
      <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <h3 style={{ margin: 0 }}>
          {selectedMarkerId ? "Edit Marker Style" : "New Marker Config"}
        </h3>

        <div className="field">
          <label>
            <span>Target 360° Scene</span>
            <select
              value={targetSceneId}
              onChange={(e) => handleSceneChange(e.target.value)}
            >
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.titleVi} ({s.titleEn})
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            <span>Marker Label (Vietnamese)</span>
            <input
              value={labelVi}
              onChange={(e) => setLabelVi(e.target.value)}
              placeholder="e.g. Phòng Trọ Sinh Viên A"
            />
          </label>
        </div>

        <div className="field">
          <label>
            <span>Marker Label (English)</span>
            <input
              value={labelEn}
              onChange={(e) => setLabelEn(e.target.value)}
              placeholder="e.g. Private Room A"
            />
          </label>
        </div>

        <div className="field">
          <label>
            <span>Marker Icon Style</span>
            <select value={icon} onChange={(e) => setIcon(e.target.value)}>
              <option value="MapPin">📍 MapPin (Ghim vị trí)</option>
              <option value="Compass">🧭 Compass (La bàn 360°)</option>
              <option value="Target">🎯 Target (Tâm điểm phòng)</option>
              <option value="Radar">📡 Radar (Sóng Rada)</option>
              <option value="DoorClosed">🚪 DoorClosed (Cửa phòng)</option>
              <option value="Home">🏠 Home (Cổng chính)</option>
            </select>
          </label>
        </div>

        <div className="field">
          <label>
            <span>Decoration & Color Theme</span>
            <select
              value={colorTheme}
              onChange={(e) => setColorTheme(e.target.value)}
            >
              {colorThemes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="field">
            <label>
              <span>Position X (%)</span>
              <input
                type="number"
                step="0.1"
                value={posX}
                onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
              />
            </label>
          </div>
          <div className="field">
            <label>
              <span>Position Y (%)</span>
              <input
                type="number"
                step="0.1"
                value={posY}
                onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
              />
            </label>
          </div>
        </div>

        {message ? (
          <p
            className={message.includes("successfully") || message.includes("deleted") ? "" : "field-error"}
            style={{ margin: 0, fontSize: "0.8rem" }}
          >
            {message}
          </p>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
          <button
            type="button"
            className="primary-button"
            disabled={saving}
            onClick={() => void handleSaveMarker()}
          >
            <Save size={16} aria-hidden="true" /> {saving ? "Saving…" : "Save Marker Style"}
          </button>

          {selectedMarkerId ? (
            <button
              type="button"
              className="secondary-button"
              style={{ color: "#f43f5e", borderColor: "rgba(244, 63, 94, 0.4)" }}
              disabled={saving}
              onClick={() => void handleDeleteMarker()}
            >
              <Trash2 size={16} aria-hidden="true" /> Delete Marker
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
