
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { adminRequest } from "@/lib/api/admin-client";
import { sceneInputSchema } from "@/lib/validation/schemas";

type SceneInput = z.input<typeof sceneInputSchema>;
type SceneValues = z.output<typeof sceneInputSchema>;

type SceneTour = {
  id: string;
  titleEn: string;
  slug: string;
};

const cubemapFaceFields = [
  { label: "Front face URL", name: "multiresConfig.cubemapUrls.0" },
  { label: "Right face URL", name: "multiresConfig.cubemapUrls.1" },
  { label: "Back face URL", name: "multiresConfig.cubemapUrls.2" },
  { label: "Left face URL", name: "multiresConfig.cubemapUrls.3" },
  { label: "Up face URL", name: "multiresConfig.cubemapUrls.4" },
  { label: "Down face URL", name: "multiresConfig.cubemapUrls.5" },
] as const;

export function SceneForm({
  id,
  initial,
  tours,
  categories,
}: {
  id?: string;
  initial?: SceneInput;
  tours: SceneTour[];
  categories: { id: string; nameEn: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SceneInput, unknown, SceneValues>({
    resolver: zodResolver(sceneInputSchema),
    defaultValues:
      initial ??
      ({
        tourId: tours[0]?.id ?? "",
        categoryId: categories[0]?.id ?? "",
        slug: "",
        titleVi: "",
        titleEn: "",
        shortDescriptionVi: "",
        shortDescriptionEn: "",
        fullDescriptionVi: "",
        fullDescriptionEn: "",
        panoramaType: "EQUIRECTANGULAR",
        panoramaUrl: "/demo/coastal-sunrise-placeholder.png",
        previewImageUrl: "/demo/coastal-sunrise-placeholder.png",
        multiresConfig: null,
        initialPitch: 0,
        initialYaw: 0,
        initialHfov: 90,
        minimumHfov: 45,
        maximumHfov: 120,
        latitude: 16.0544,
        longitude: 108.2022,
        narrationAudioVi: null,
        narrationAudioEn: null,
        attribution: "Synthetic development asset",
        sortOrder: 0,
        isPublished: false,
      } satisfies SceneInput),
  });

  const panoramaType = useWatch({
    control,
    name: "panoramaType",
  });

  const tourId = useWatch({
    control,
    name: "tourId",
  });

  const panoramaUrl = useWatch({
    control,
    name: "panoramaUrl",
  });

  const previewImageUrl = useWatch({
    control,
    name: "previewImageUrl",
  });

  const selectedTourSlug =
    tours.find((tour) => tour.id === (tourId || initial?.tourId))?.slug ?? "";

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
      }
    };

    window.addEventListener("beforeunload", warn);

    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  async function submit(values: SceneValues) {
    setMessage(null);

    try {
      const scene = await adminRequest<{ id?: string }>(
        id ? `/api/admin/scenes/${id}` : "/api/admin/scenes",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );

      setMessage("Scene saved.");

      if (!id && scene.id) {
        router.replace(`/admin/scenes/${scene.id}`);
      }

      router.refresh();
    } catch (error: unknown) {
      setMessage(
        error instanceof Error ? error.message : "Save failed.",
      );
    }
  }

  const number = { valueAsNumber: true } as const;

  const nullablePath = {
    setValueAs: (value: unknown) =>
      typeof value === "string" ? value.trim() || null : null,
  };

  const optionalPath = {
    setValueAs: (value: unknown) =>
      typeof value === "string" ? value.trim() || undefined : undefined,
  };

  return (
    <form
      className="admin-form admin-card"
      onSubmit={(event) => void handleSubmit(submit)(event)}
      noValidate
    >
      <div className="field field--full">
        <p className="eyebrow">Scene Identity &amp; Name</p>
        <h3 style={{ margin: 0 }}>
          {id ? "Edit Scene Name & Configuration" : "New Scene Details"}
        </h3>
      </div>

      <AdminField
        label="Vietnamese Scene Name (Tên Cảnh)"
        error={errors.titleVi?.message}
      >
        <input
          placeholder="e.g. Lối Vào & Cổng Vân Tay"
          {...register("titleVi")}
        />
      </AdminField>

      <AdminField
        label="English Scene Name (Tên Tiếng Anh)"
        error={errors.titleEn?.message}
      >
        <input
          placeholder="e.g. Entrance & Security Gate"
          {...register("titleEn")}
        />
      </AdminField>

      <AdminField label="Tour" error={errors.tourId?.message}>
        {id ? (
          <>
            <input type="hidden" {...register("tourId")} />
            <select value={initial?.tourId ?? ""} disabled>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.titleEn}
                </option>
              ))}
            </select>
            <small>
              A scene cannot be moved to another tour after creation.
            </small>
          </>
        ) : (
          <select {...register("tourId")}>
            {tours.map((tour) => (
              <option key={tour.id} value={tour.id}>
                {tour.titleEn}
              </option>
            ))}
          </select>
        )}
      </AdminField>

      <AdminField label="Category" error={errors.categoryId?.message}>
        <select {...register("categoryId")}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.nameEn}
            </option>
          ))}
        </select>
      </AdminField>

      <AdminField label="Slug" error={errors.slug?.message}>
        <input {...register("slug")} />
      </AdminField>

      <AdminField label="Published" error={errors.isPublished?.message}>
        <span className="secondary-button">
          <input type="checkbox" {...register("isPublished")} />
          Visible publicly
        </span>
      </AdminField>

      <AdminField
        label="Vietnamese summary"
        error={errors.shortDescriptionVi?.message}
      >
        <textarea {...register("shortDescriptionVi")} />
      </AdminField>

      <AdminField
        label="English summary"
        error={errors.shortDescriptionEn?.message}
      >
        <textarea {...register("shortDescriptionEn")} />
      </AdminField>

      <AdminField
        label="Vietnamese description"
        error={errors.fullDescriptionVi?.message}
        full
      >
        <textarea {...register("fullDescriptionVi")} />
      </AdminField>

      <AdminField
        label="English description"
        error={errors.fullDescriptionEn?.message}
        full
      >
        <textarea {...register("fullDescriptionEn")} />
      </AdminField>

      <AdminField label="Panorama type" error={errors.panoramaType?.message}>
        <select {...register("panoramaType")}>
          <option value="EQUIRECTANGULAR">Equirectangular</option>
          <option value="CUBEMAP">Cubemap</option>
          <option value="MULTIRES">Multiresolution</option>
        </select>
      </AdminField>

      {panoramaType === "EQUIRECTANGULAR" ? (
        <div className="field field--full">
          <ImageUploadField
            label="360° Panorama Image"
            kind="panorama"
            tourSlug={selectedTourSlug}
            value={panoramaUrl ?? ""}
            onChange={(url) =>
              setValue("panoramaUrl", url, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
          />
          {errors.panoramaUrl?.message ? (
            <span className="field-error">
              {errors.panoramaUrl.message}
            </span>
          ) : null}
        </div>
      ) : null}

      {panoramaType === "CUBEMAP" ? (
        <fieldset className="field field--full">
          <legend>Cubemap faces (front, right, back, left, up, down)</legend>

          <div className="admin-form">
            {cubemapFaceFields.map((face) => (
              <AdminField key={face.name} label={face.label}>
                <input {...register(face.name)} />
              </AdminField>
            ))}
          </div>

          {errors.multiresConfig ? (
            <span className="field-error">
              Provide exactly six valid cubemap face URLs.
            </span>
          ) : null}
        </fieldset>
      ) : null}

      {panoramaType === "MULTIRES" ? (
        <fieldset className="field field--full">
          <legend>Multiresolution tile configuration</legend>

          <div className="admin-form">
            <AdminField label="Tile base path">
              <input {...register("multiresConfig.basePath")} />
            </AdminField>

            <AdminField label="Tile path template">
              <input
                placeholder="/%l/%s%y_%x"
                {...register("multiresConfig.path")}
              />
            </AdminField>

            <AdminField label="Fallback path template">
              <input
                placeholder="/fallback/%s"
                {...register("multiresConfig.fallbackPath", optionalPath)}
              />
            </AdminField>

            <AdminField label="File extension">
              <input
                placeholder="jpg"
                {...register("multiresConfig.extension")}
              />
            </AdminField>

            <AdminField label="Tile resolution">
              <input
                type="number"
                min="1"
                {...register("multiresConfig.tileResolution", number)}
              />
            </AdminField>

            <AdminField label="Maximum level">
              <input
                type="number"
                min="1"
                {...register("multiresConfig.maxLevel", number)}
              />
            </AdminField>

            <AdminField label="Cube resolution">
              <input
                type="number"
                min="1"
                {...register("multiresConfig.cubeResolution", number)}
              />
            </AdminField>
          </div>

          {errors.multiresConfig ? (
            <span className="field-error">
              Complete the required multiresolution tile configuration.
            </span>
          ) : null}
        </fieldset>
      ) : null}

      <div className="field field--full">
        <ImageUploadField
          label="Scene Preview Image"
          kind="scene-preview"
          tourSlug={selectedTourSlug}
          value={previewImageUrl ?? ""}
          onChange={(url) =>
            setValue("previewImageUrl", url, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        {errors.previewImageUrl?.message ? (
          <span className="field-error">
            {errors.previewImageUrl.message}
          </span>
        ) : null}
      </div>

      <AdminField label="Initial pitch" error={errors.initialPitch?.message}>
        <input type="number" step="0.1" {...register("initialPitch", number)} />
      </AdminField>

      <AdminField label="Initial yaw" error={errors.initialYaw?.message}>
        <input type="number" step="0.1" {...register("initialYaw", number)} />
      </AdminField>

      <AdminField
        label="Initial field of view"
        error={errors.initialHfov?.message}
      >
        <input type="number" step="1" {...register("initialHfov", number)} />
      </AdminField>

      <AdminField
        label="Minimum field of view"
        error={errors.minimumHfov?.message}
      >
        <input type="number" step="1" {...register("minimumHfov", number)} />
      </AdminField>

      <AdminField
        label="Maximum field of view"
        error={errors.maximumHfov?.message}
      >
        <input type="number" step="1" {...register("maximumHfov", number)} />
      </AdminField>

      <AdminField label="Sort order" error={errors.sortOrder?.message}>
        <input type="number" step="1" {...register("sortOrder", number)} />
      </AdminField>

      <AdminField label="Latitude" error={errors.latitude?.message}>
        <input
          type="number"
          step="0.000001"
          {...register("latitude", number)}
        />
      </AdminField>

      <AdminField label="Longitude" error={errors.longitude?.message}>
        <input
          type="number"
          step="0.000001"
          {...register("longitude", number)}
        />
      </AdminField>

      <AdminField
        label="Vietnamese narration URL"
        error={errors.narrationAudioVi?.message}
      >
        <input {...register("narrationAudioVi", nullablePath)} />
      </AdminField>

      <AdminField
        label="English narration URL"
        error={errors.narrationAudioEn?.message}
      >
        <input {...register("narrationAudioEn", nullablePath)} />
      </AdminField>

      <AdminField label="Attribution" error={errors.attribution?.message} full>
        <input
          {...register("attribution", {
            setValueAs: (value: unknown) =>
              typeof value === "string" ? value.trim() || null : null,
          })}
        />
      </AdminField>

      {message ? (
        <p
          className={message.endsWith("saved.") ? "" : "field-error"}
          role="status"
        >
          {message}
        </p>
      ) : null}

      <div>
        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoaderCircle size={17} aria-hidden="true" />
          ) : (
            <Save size={17} aria-hidden="true" />
          )}
          {isSubmitting ? "Saving…" : "Save scene"}
        </button>
      </div>
    </form>
  );
}

export function AdminField({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={full ? "field field--full" : "field"}>
      <label>
        <span>{label}</span>
        {children}
      </label>
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
