"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { adminRequest } from "@/lib/api/admin-client";
import { tourInputSchema } from "@/lib/validation/schemas";

type TourInput = z.input<typeof tourInputSchema>;
type TourValues = z.output<typeof tourInputSchema>;

export function TourForm({
  id,
  initial,
  scenes = [],
}: {
  id?: string;
  initial?: TourInput;
  scenes?: { id: string; titleEn: string }[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TourInput, unknown, TourValues>({
    resolver: zodResolver(tourInputSchema),
    defaultValues:
      initial ??
      ({
        slug: "",
        titleVi: "",
        titleEn: "",
        descriptionVi: "",
        descriptionEn: "",
        coverImageUrl: "/demo/coastal-sunrise-placeholder.png",
        welcomeImageUrl: "/demo/coastal-sunrise-placeholder.png",
        defaultSceneId: null,
        isPublished: false,
      } satisfies TourInput),
  });
  const slug = useWatch({
    control,
    name: "slug",
  });

  const coverImageUrl = useWatch({
    control,
    name: "coverImageUrl",
  });

  const welcomeImageUrl = useWatch({
    control,
    name: "welcomeImageUrl",
  });

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  async function submit(values: TourValues) {
    setMessage(null);
    try {
      const tour = await adminRequest<{ id?: string }>(
        id ? `/api/admin/tours/${id}` : "/api/admin/tours",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      setMessage("Tour saved.");
      if (!id && tour.id) {
        router.replace(`/admin/tours/${tour.id}`);
      }
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
      <Field label="Slug" error={errors.slug?.message}>
        <input {...register("slug")} />
      </Field>
      <Field label="Published" error={errors.isPublished?.message}>
        <label className="secondary-button">
          <input type="checkbox" {...register("isPublished")} /> Visible
          publicly
        </label>
      </Field>
      <Field label="Vietnamese title" error={errors.titleVi?.message}>
        <input {...register("titleVi")} />
      </Field>
      <Field label="English title" error={errors.titleEn?.message}>
        <input {...register("titleEn")} />
      </Field>
      <Field
        label="Vietnamese description"
        error={errors.descriptionVi?.message}
        full
      >
        <textarea {...register("descriptionVi")} />
      </Field>
      <Field
        label="English description"
        error={errors.descriptionEn?.message}
        full
      >
        <textarea {...register("descriptionEn")} />
      </Field>


      <Field label="Cover image" error={errors.coverImageUrl?.message}>
        <ImageUploadField
          label="Cover image"
          kind="cover"
          tourSlug={slug ?? ""}
          value={coverImageUrl ?? ""}
          onChange={(url) =>
            setValue("coverImageUrl", url, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </Field>

      <Field
        label="Welcome image"
        error={errors.welcomeImageUrl?.message}
      >
        <ImageUploadField
          label="Welcome image"
          kind="welcome"
          tourSlug={slug ?? ""}
          value={welcomeImageUrl ?? ""}
          onChange={(url) =>
            setValue("welcomeImageUrl", url, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
      </Field>


      <Field label="Default scene" error={errors.defaultSceneId?.message} full>
        <select
          {...register("defaultSceneId", {
            setValueAs: (value: unknown) =>
              typeof value === "string" ? value.trim() || null : null,
          })}
        >
          <option value="">No default scene selected</option>
          {scenes.map((scene) => (
            <option key={scene.id} value={scene.id}>
              {scene.titleEn}
            </option>
          ))}
        </select>
      </Field>
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
          {isSubmitting ? "Saving…" : "Save tour"}
        </button>
      </div>
    </form>
  );
}

function Field({
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
      <label>{label}</label>
      {children}
      {error ? <span className="field-error">{error}</span> : null}
    </div>
  );
}
