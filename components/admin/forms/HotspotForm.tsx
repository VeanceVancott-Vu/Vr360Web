"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { AdminField } from "@/components/admin/forms/SceneForm";
import type { PickedCoordinates } from "@/components/admin/editors/HotspotCoordinatePicker";
import type { HotspotDto } from "@/lib/types";
import { hotspotInputSchema } from "@/lib/validation/schemas";

type HotspotInput = z.input<typeof hotspotInputSchema>;
type HotspotOutput = z.output<typeof hotspotInputSchema>;

export function HotspotForm({
  id,
  initial,
  sceneId,
  scenes,
  coordinates,
  onSaved,
}: {
  sceneId: string;
  scenes: { id: string; titleEn: string }[];
  coordinates: PickedCoordinates;
  id?: string;
  initial?: HotspotDto;
  onSaved?: () => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HotspotInput, unknown, HotspotOutput>({
    resolver: zodResolver(hotspotInputSchema),
    defaultValues: (initial as HotspotInput | undefined) ?? {
      sceneId,
      type: "INFORMATION",
      pitch: coordinates.pitch,
      yaw: coordinates.yaw,
      labelVi: "",
      labelEn: "",
      contentVi: null,
      contentEn: null,
      icon: "Info",
      targetSceneId: null,
      imageUrl: null,
      audioUrl: null,
      externalUrl: null,
      sortOrder: 0,
      isVisible: true,
    },
  });
  const type = useWatch({ control, name: "type" });

  useEffect(() => {
    setValue("pitch", coordinates.pitch, { shouldDirty: true });
    setValue("yaw", coordinates.yaw, { shouldDirty: true });
  }, [coordinates, setValue]);

  useEffect(() => {
    if (type !== "SCENE_LINK") setValue("targetSceneId", null);
    if (type !== "IMAGE" && type !== "INFORMATION") setValue("imageUrl", null);
    if (type !== "AUDIO") setValue("audioUrl", null);
    if (type !== "EXTERNAL_LINK") setValue("externalUrl", null);
  }, [setValue, type]);

  async function submit(values: HotspotOutput) {
    setMessage(null);
    const response = await fetch(
      id ? `/api/admin/hotspots/${id}` : "/api/admin/hotspots",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const result = (await response.json()) as {
      success: boolean;
      error?: { message?: string };
    };
    if (!response.ok || !result.success) {
      setMessage(result.error?.message ?? "Hotspot save failed.");
      return;
    }
    setMessage(id ? "Hotspot saved." : "Hotspot created.");
    if (!id) {
      reset({
        sceneId,
        type: "INFORMATION",
        pitch: coordinates.pitch,
        yaw: coordinates.yaw,
        labelVi: "",
        labelEn: "",
        contentVi: null,
        contentEn: null,
        icon: "Info",
        targetSceneId: null,
        imageUrl: null,
        audioUrl: null,
        externalUrl: null,
        sortOrder: 0,
        isVisible: true,
      });
    }
    onSaved?.();
  }

  const nullable = {
    setValueAs: (value: unknown) =>
      typeof value === "string" ? value.trim() || null : null,
  };

  return (
    <form
      id="hotspot-form"
      className="admin-form admin-card"
      onSubmit={(event) => void handleSubmit(submit)(event)}
      noValidate
    >
      <div className="field field--full">
        <p className="eyebrow">Interactive content</p>
        <h2 style={{ margin: 0 }}>{id ? "Edit hotspot" : "Add hotspot"}</h2>
      </div>
      <input type="hidden" {...register("sceneId")} />
      <AdminField label="Type" error={errors.type?.message}>
        <select {...register("type")}>
          <option value="SCENE_LINK">Scene link</option>
          <option value="INFORMATION">Information</option>
          <option value="IMAGE">Image</option>
          <option value="AUDIO">Audio</option>
          <option value="EXTERNAL_LINK">External link</option>
        </select>
      </AdminField>
      <AdminField label="Visible" error={errors.isVisible?.message}>
        <span className="secondary-button">
          <input type="checkbox" {...register("isVisible")} /> Show publicly
        </span>
      </AdminField>
      <AdminField label="Pitch" error={errors.pitch?.message}>
        <input
          type="number"
          step="0.01"
          {...register("pitch", { valueAsNumber: true })}
        />
      </AdminField>
      <AdminField label="Yaw" error={errors.yaw?.message}>
        <input
          type="number"
          step="0.01"
          {...register("yaw", { valueAsNumber: true })}
        />
      </AdminField>
      <AdminField label="Vietnamese label" error={errors.labelVi?.message}>
        <input {...register("labelVi")} />
      </AdminField>
      <AdminField label="English label" error={errors.labelEn?.message}>
        <input {...register("labelEn")} />
      </AdminField>
      <AdminField label="Vietnamese content" error={errors.contentVi?.message}>
        <textarea {...register("contentVi", nullable)} />
      </AdminField>
      <AdminField label="English content" error={errors.contentEn?.message}>
        <textarea {...register("contentEn", nullable)} />
      </AdminField>
      {type === "SCENE_LINK" ? (
        <AdminField
          label="Target scene"
          error={errors.targetSceneId?.message}
          full
        >
          <select {...register("targetSceneId")}>
            <option value="">Select a scene</option>
            {scenes
              .filter((scene) => scene.id !== sceneId)
              .map((scene) => (
                <option key={scene.id} value={scene.id}>
                  {scene.titleEn}
                </option>
              ))}
          </select>
        </AdminField>
      ) : null}
      {type === "IMAGE" || type === "INFORMATION" ? (
        <AdminField label="Image URL" error={errors.imageUrl?.message} full>
          <input {...register("imageUrl", nullable)} />
        </AdminField>
      ) : null}
      {type === "AUDIO" ? (
        <AdminField label="Audio URL" error={errors.audioUrl?.message} full>
          <input {...register("audioUrl", nullable)} />
        </AdminField>
      ) : null}
      {type === "EXTERNAL_LINK" ? (
        <AdminField
          label="External HTTP(S) URL"
          error={errors.externalUrl?.message}
          full
        >
          <input {...register("externalUrl", nullable)} />
        </AdminField>
      ) : null}
      <AdminField label="Icon Preset" error={errors.icon?.message}>
        <select
          onChange={(e) => {
            const currentIcon = getValues("icon") || "";
            const currentTheme = currentIcon.split(" ").find((s) => s.startsWith("style-")) || "";
            const newPreset = e.target.value;
            setValue("icon", currentTheme ? `${newPreset} ${currentTheme}` : newPreset, { shouldDirty: true });
          }}
          defaultValue={
            initial?.icon && !initial.icon.split(" ")[0]?.startsWith("style-")
              ? initial.icon.split(" ")[0]
              : "Info"
          }
        >
          <option value="Info">Info (Standard i)</option>
          <option value="MoveUpRight">MoveUpRight (Arrow Link ↗)</option>
          <option value="ShieldCheck">ShieldCheck (Security / Fingerprint Lock)</option>
          <option value="Utensils">Utensils (Kitchen / Dining)</option>
          <option value="Bed">Bed (Bedroom / Furnished Room)</option>
          <option value="Bath">Bath (Bathroom / Water Heater)</option>
          <option value="Boxes">Boxes (Storage / Shoe Locker)</option>
          <option value="Wifi">Wifi (High-speed Wi-Fi 6)</option>
          <option value="DollarSign">DollarSign (Rental Fee / Utilities)</option>
          <option value="Key">Key (Private Lock / Room Access)</option>
          <option value="Star">Star (Highlight / Recommended)</option>
          <option value="Sparkles">Sparkles (Special Amenity)</option>
          <option value="Camera">Camera (CCTV Security)</option>
          <option value="Tv">Tv (Entertainment / Electronics)</option>
          <option value="ExternalLink">ExternalLink (External Web Link)</option>
        </select>
      </AdminField>
      <AdminField label="Decoration & Color Theme" full>
        <select
          onChange={(e) => {
            const currentIcon = getValues("icon") || "Info";
            const iconPreset = currentIcon.split(" ").find((s) => !s.startsWith("style-")) || "Info";
            const newTheme = e.target.value;
            setValue("icon", newTheme ? `${iconPreset} ${newTheme}` : iconPreset, { shouldDirty: true });
          }}
          defaultValue={initial?.icon?.split(" ").find((s) => s.startsWith("style-")) || ""}
        >
          <option value="">Standard Blue Pulse (Default)</option>
          <option value="style-emerald">🟢 Emerald Green (Free Benefit / Utilities)</option>
          <option value="style-gold">🟡 Amber Gold (Special Price / Hot Deal)</option>
          <option value="style-rose">🔴 Rose Red (Security / Important Alert)</option>
          <option value="style-purple">💜 Violet Purple (VIP / Premium Amenity)</option>
        </select>
      </AdminField>
      <input type="hidden" {...register("icon", nullable)} />
      <AdminField label="Sort order" error={errors.sortOrder?.message}>
        <input
          type="number"
          {...register("sortOrder", { valueAsNumber: true })}
        />
      </AdminField>
      {message ? (
        <p
          className={
            message === "Hotspot created." || message === "Hotspot saved."
              ? ""
              : "field-error"
          }
          role="status"
        >
          {message}
        </p>
      ) : null}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoaderCircle size={17} aria-hidden="true" />
          ) : id ? (
            <Save size={17} aria-hidden="true" />
          ) : (
            <Plus size={17} aria-hidden="true" />
          )}
          {isSubmitting ? "Saving…" : id ? "Save hotspot" : "Create hotspot"}
        </button>
        {id ? (
          <button
            className="secondary-button"
            type="button"
            style={{ color: "#f43f5e", borderColor: "rgba(244, 63, 94, 0.4)", background: "rgba(136, 19, 55, 0.2)" }}
            onClick={async () => {
              const label = initial?.labelVi || initial?.labelEn || "hotspot";
              if (!window.confirm(`Are you sure you want to delete "${label}"?`)) return;
              const response = await fetch(`/api/admin/hotspots/${id}`, {
                method: "DELETE",
              });
              if (response.ok) {
                setMessage("Hotspot deleted.");
                onSaved?.();
              } else {
                setMessage("Failed to delete hotspot.");
              }
            }}
          >
            <Trash2 size={17} aria-hidden="true" /> Delete hotspot
          </button>
        ) : null}
      </div>
    </form>
  );
}
