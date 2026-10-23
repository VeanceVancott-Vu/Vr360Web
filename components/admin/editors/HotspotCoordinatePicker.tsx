"use client";

import { Compass, Copy, Crosshair, Eye, MapPin, Move, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";

import { PanoramaViewer, type PanoramaViewerHandle } from "@/components/tour/viewer/PanoramaViewer";
import { adminRequest } from "@/lib/api/admin-client";
import type { HotspotDto, SceneDto } from "@/lib/types";

export interface PickedCoordinates {
  pitch: number;
  yaw: number;
}

export function HotspotCoordinatePicker({
  scene,
  previewImageUrl,
  hotspots = [],
  selectedHotspotId = "",
  onPick,
  onSelectHotspot,
  onSaved,
}: {
  scene?: SceneDto;
  previewImageUrl: string;
  hotspots?: HotspotDto[];
  selectedHotspotId?: string;
  onPick: (coordinates: PickedCoordinates) => void;
  onSelectHotspot?: (id: string) => void;
  onSaved?: () => void;
}) {
  const viewerRef = useRef<PanoramaViewerHandle>(null);
  const areaRef = useRef<HTMLButtonElement>(null);
  const [pickerMode, setPickerMode] = useState<"3d" | "2d">("3d");
  const [coordinates, setCoordinates] = useState<PickedCoordinates>({
    pitch: 0,
    yaw: 0,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedHotspot = hotspots.find((h) => h.id === selectedHotspotId);

  function getCurrentAim(): PickedCoordinates {
    const view = viewerRef.current?.getView();
    if (view) {
      return {
        pitch: Number(view.pitch.toFixed(2)),
        yaw: Number(view.yaw.toFixed(2)),
      };
    }
    return coordinates;
  }

  function pick2D(event: React.MouseEvent<HTMLButtonElement>) {
    const rect = areaRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const next = {
      yaw: Number((x * 360 - 180).toFixed(2)),
      pitch: Number((90 - y * 180).toFixed(2)),
    };
    setCoordinates(next);
    onPick(next);
  }

  function scrollToForm() {
    setTimeout(() => {
      document.getElementById("hotspot-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  }

  function lockCurrent3DView() {
    const aim = getCurrentAim();
    setCoordinates(aim);
    onPick(aim);
    scrollToForm();
  }

  function handleAddNewAtAim() {
    const aim = getCurrentAim();
    setCoordinates(aim);
    onSelectHotspot?.("");
    onPick(aim);
    scrollToForm();
  }

  async function handleMoveSelectedToAim() {
    if (!selectedHotspot) return;
    const aim = getCurrentAim();
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      const payload = {
        ...selectedHotspot,
        pitch: aim.pitch,
        yaw: aim.yaw,
      };
      await adminRequest<unknown>(`/api/admin/hotspots/${selectedHotspot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setCoordinates(aim);
      onPick(aim);
      onSaved?.();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to move hotspot.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleDeleteSelected() {
    if (!selectedHotspot) return;
    const label = selectedHotspot.labelVi || selectedHotspot.labelEn || "hotspot";
    if (!window.confirm(`Are you sure you want to delete "${label}"?`)) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await adminRequest<unknown>(`/api/admin/hotspots/${selectedHotspot.id}`, {
        method: "DELETE",
      });
      onSelectHotspot?.("");
      onSaved?.();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to delete hotspot.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <section className="admin-card">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Pano2VR 360° Interactive Studio Editor</h2>
          <p style={{ color: "var(--muted)", margin: "0.25rem 0 0", fontSize: "0.85rem" }}>
            Aim 360° camera at any position to add, move, or delete hotspots live inside the 360 viewer.
          </p>
        </div>

        {/* Toggle between 3D Mini Pano Viewer & 2D Projection Map */}
        <div
          style={{
            display: "flex",
            gap: "0.35rem",
            background: "rgba(0,0,0,0.35)",
            padding: "0.25rem",
            borderRadius: "999px",
            border: "1px solid var(--glass-border)",
          }}
        >
          <button
            type="button"
            onClick={() => setPickerMode("3d")}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: pickerMode === "3d" ? "var(--sea-400)" : "transparent",
              color: pickerMode === "3d" ? "#000" : "#fff",
              border: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Compass size={14} /> 360° Studio Mode
          </button>
          <button
            type="button"
            onClick={() => setPickerMode("2d")}
            style={{
              padding: "0.35rem 0.75rem",
              borderRadius: "999px",
              fontSize: "0.75rem",
              fontWeight: 700,
              background: pickerMode === "2d" ? "var(--sea-400)" : "transparent",
              color: pickerMode === "2d" ? "#000" : "#fff",
              border: 0,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <Eye size={14} /> 2D Flat Map
          </button>
        </div>
      </div>

      {pickerMode === "3d" && scene ? (
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "2 / 1",
            minHeight: "20rem",
            borderRadius: "1rem",
            overflow: "hidden",
            border: "1px solid var(--glass-border)",
          }}
        >
          <PanoramaViewer
            ref={viewerRef}
            scene={scene}
            language="vi"
            onHotspotClick={(hotspot) => {
              onSelectHotspot?.(hotspot.id);
              setCoordinates({ pitch: hotspot.pitch, yaw: hotspot.yaw });
              onPick({ pitch: hotspot.pitch, yaw: hotspot.yaw });
            }}
            onViewChange={(view) => {
              const next = {
                pitch: Number(view.pitch.toFixed(2)),
                yaw: Number(view.yaw.toFixed(2)),
              };
              setCoordinates(next);
            }}
          />

          {/* Floating Pano2VR Quick Action Toolbar (Top-Left) */}
          <div
            style={{
              position: "absolute",
              top: "0.75rem",
              left: "0.75rem",
              zIndex: 35,
              display: "flex",
              gap: "0.4rem",
              background: "rgba(6, 21, 34, 0.85)",
              padding: "0.4rem",
              borderRadius: "999px",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
            }}
          >
            <button
              type="button"
              className="primary-button"
              onClick={handleAddNewAtAim}
              style={{
                padding: "0.35rem 0.75rem",
                fontSize: "0.75rem",
                minHeight: "auto",
              }}
            >
              <Plus size={14} /> Add Hotspot Here
            </button>

            {selectedHotspot ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleMoveSelectedToAim()}
                  disabled={isProcessing}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.75rem",
                    borderRadius: "999px",
                    border: "1px solid #38bdf8",
                    background: "rgba(56, 189, 248, 0.25)",
                    color: "#38bdf8",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <Move size={14} /> Move Hotspot Here
                </button>

                <button
                  type="button"
                  onClick={() => void handleDeleteSelected()}
                  disabled={isProcessing}
                  style={{
                    padding: "0.35rem 0.75rem",
                    fontSize: "0.75rem",
                    borderRadius: "999px",
                    border: "1px solid #f43f5e",
                    background: "rgba(244, 63, 94, 0.25)",
                    color: "#f43f5e",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                  }}
                >
                  <Trash2 size={14} /> Delete
                </button>
              </>
            ) : null}
          </div>

          {/* Selected Hotspot Indicator (Top-Right) */}
          {selectedHotspot ? (
            <div
              style={{
                position: "absolute",
                top: "0.75rem",
                right: "0.75rem",
                zIndex: 35,
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "rgba(251, 191, 36, 0.2)",
                border: "1px solid rgba(251, 191, 36, 0.5)",
                padding: "0.35rem 0.75rem",
                borderRadius: "999px",
                color: "var(--sun-400)",
                fontSize: "0.75rem",
                fontWeight: 700,
                backdropFilter: "blur(10px)",
              }}
            >
              <span>Selected: {selectedHotspot.labelVi || selectedHotspot.labelEn}</span>
              <button
                type="button"
                onClick={() => onSelectHotspot?.("")}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "var(--sun-400)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>
          ) : null}

          {/* Pano2VR Center Aiming Reticle Overlay */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
              zIndex: 30,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Crosshair
              size={34}
              style={{
                color: "var(--sun-400)",
                filter: "drop-shadow(0 0 8px rgba(0,0,0,0.9))",
              }}
            />
            <div
              style={{
                background: "rgba(0,0,0,0.85)",
                color: "var(--sun-400)",
                padding: "0.15rem 0.5rem",
                borderRadius: "4px",
                fontSize: "0.68rem",
                fontWeight: 800,
                marginTop: "4px",
                border: "1px solid rgba(251, 191, 36, 0.4)",
              }}
            >
              Aim Reticle
            </div>
          </div>
        </div>
      ) : (
        /* Flat 2D Projection Map Mode */
        <button
          ref={areaRef}
          type="button"
          onClick={pick2D}
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "2 / 1",
            overflow: "hidden",
            border: "1px solid var(--glass-border)",
            borderRadius: "1rem",
            padding: 0,
            cursor: "crosshair",
          }}
        >
          <Image src={previewImageUrl} alt="" fill sizes="800px" />
          {hotspots.map((hotspot) => {
            const leftPercent = ((hotspot.yaw + 180) / 360) * 100;
            const topPercent = ((90 - hotspot.pitch) / 180) * 100;
            const isSelected = hotspot.id === selectedHotspotId;
            return (
              <div
                key={hotspot.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectHotspot?.(hotspot.id);
                  setCoordinates({ pitch: hotspot.pitch, yaw: hotspot.yaw });
                  onPick({ pitch: hotspot.pitch, yaw: hotspot.yaw });
                }}
                style={{
                  position: "absolute",
                  left: `${leftPercent}%`,
                  top: `${topPercent}%`,
                  transform: "translate(-50%, -100%)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  cursor: "pointer",
                  zIndex: isSelected ? 10 : 5,
                }}
              >
                <div
                  style={{
                    background: isSelected
                      ? "var(--sun-400)"
                      : hotspot.type === "SCENE_LINK"
                      ? "#38bdf8"
                      : "#34d399",
                    color: "#000",
                    padding: "0.15rem 0.45rem",
                    borderRadius: "999px",
                    fontSize: "0.65rem",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {hotspot.labelVi || hotspot.labelEn}
                </div>
                <MapPin
                  size={20}
                  style={{
                    color: isSelected
                      ? "var(--sun-400)"
                      : hotspot.type === "SCENE_LINK"
                      ? "#38bdf8"
                      : "#34d399",
                  }}
                />
              </div>
            );
          })}
          <Crosshair
            size={26}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: `${((coordinates.yaw + 180) / 360) * 100}%`,
              top: `${((90 - coordinates.pitch) / 180) * 100}%`,
              color: "var(--sun-400)",
              transform: "translate(-50%, -50%)",
              zIndex: 15,
            }}
          />
        </button>
      )}

      {errorMessage ? (
        <p className="field-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {/* Bottom Control Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: ".75rem",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <code style={{ fontSize: "0.88rem" }}>
          Live Camera View Angle: <strong>pitch {coordinates.pitch}°</strong>, <strong>yaw {coordinates.yaw}°</strong>
        </code>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          {pickerMode === "3d" ? (
            <button
              className="primary-button"
              type="button"
              onClick={lockCurrent3DView}
              style={{ padding: "0.4rem 0.95rem", fontSize: "0.84rem" }}
            >
              📌 Lock Position (Pitch: {coordinates.pitch}°, Yaw: {coordinates.yaw}°)
            </button>
          ) : null}
          <button
            className="icon-button"
            type="button"
            aria-label="Copy pitch and yaw"
            onClick={() => void navigator.clipboard.writeText(`${coordinates.pitch}, ${coordinates.yaw}`)}
          >
            <Copy size={15} aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}
