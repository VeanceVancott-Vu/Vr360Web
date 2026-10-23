"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AdminField } from "@/components/admin/forms/SceneForm";
import { adminRequest } from "@/lib/api/admin-client";
import { mediaInputSchema } from "@/lib/validation/schemas";

type MediaInput = z.input<typeof mediaInputSchema>;
type MediaValues = z.output<typeof mediaInputSchema>;

export function MediaForm({
  id,
  initial,
  scenes,
}: {
  id?: string;
  initial?: MediaInput;
  scenes: { id: string; titleEn: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MediaInput, unknown, MediaValues>({
    resolver: zodResolver(mediaInputSchema),
    defaultValues: initial ?? {
      sceneId: null,
      type: "IMAGE",
      url: "",
      thumbnailUrl: null,
      titleVi: "",
      titleEn: "",
      attribution: null,
      sortOrder: 0,
    },
  });
  const nullable = {
    setValueAs: (value: unknown) =>
      typeof value === "string" ? value.trim() || null : null,
  };

  async function submit(values: MediaValues) {
    setMessage(null);
    try {
      const media = await adminRequest<{ id: string }>(
        id ? `/api/admin/media/${id}` : "/api/admin/media",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      setMessage("Media saved.");
      if (!id) router.replace(`/admin/media/${media.id}`);
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : "Save failed.");
    }
  }

  return (
    <form
      className="admin-form admin-card"
      onSubmit={(event) => void handleSubmit(submit)(event)}
      noValidate
    >
      <AdminField label="Scene" error={errors.sceneId?.message}>
        <select {...register("sceneId", nullable)}>
          <option value="">Not linked to a scene</option>
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.titleEn}
            </option>
          ))}
        </select>
      </AdminField>
      <AdminField label="Media type" error={errors.type?.message}>
        <select {...register("type")}>
          <option value="IMAGE">Image</option>
          <option value="AUDIO">Audio</option>
          <option value="VIDEO">Video</option>
        </select>
      </AdminField>
      <AdminField label="Vietnamese title" error={errors.titleVi?.message}>
        <input {...register("titleVi")} />
      </AdminField>
      <AdminField label="English title" error={errors.titleEn?.message}>
        <input {...register("titleEn")} />
      </AdminField>
      <AdminField label="Media URL" error={errors.url?.message} full>
        <input {...register("url")} />
      </AdminField>
      <AdminField
        label="Thumbnail URL"
        error={errors.thumbnailUrl?.message}
        full
      >
        <input {...register("thumbnailUrl", nullable)} />
      </AdminField>
      <AdminField label="Attribution" error={errors.attribution?.message} full>
        <input {...register("attribution", nullable)} />
      </AdminField>
      <AdminField label="Sort order" error={errors.sortOrder?.message}>
        <input
          type="number"
          {...register("sortOrder", { valueAsNumber: true })}
        />
      </AdminField>
      {message ? (
        <p
          className={message === "Media saved." ? "" : "field-error"}
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
          {isSubmitting ? "Saving…" : "Save media"}
        </button>
      </div>
    </form>
  );
}
