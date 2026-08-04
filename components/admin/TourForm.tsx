"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { tourInputSchema } from "@/lib/validation/schemas";

type TourInput = z.input<typeof tourInputSchema>;
type TourValues = z.output<typeof tourInputSchema>;

export function TourForm({
  id,
  initial,
}: {
  id?: string;
  initial?: TourInput;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
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

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (isDirty) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  async function submit(values: TourValues) {
    setMessage(null);
    const response = await fetch(
      id ? `/api/admin/tours/${id}` : "/api/admin/tours",
      {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      },
    );
    const result = (await response.json()) as {
      success: boolean;
      data?: { id?: string };
      error?: { message?: string };
    };
    if (!response.ok || !result.success) {
      setMessage(result.error?.message ?? "Save failed.");
      return;
    }
    setMessage("Tour saved.");
    if (!id && result.data?.id) {
      router.replace(`/admin/tours/${result.data.id}`);
    }
    router.refresh();
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
      <Field label="Cover image URL" error={errors.coverImageUrl?.message}>
        <input {...register("coverImageUrl")} />
      </Field>
      <Field label="Welcome image URL" error={errors.welcomeImageUrl?.message}>
        <input {...register("welcomeImageUrl")} />
      </Field>
      <Field
        label="Default scene ID"
        error={errors.defaultSceneId?.message}
        full
      >
        <input
          {...register("defaultSceneId", {
            setValueAs: (value: unknown) =>
              typeof value === "string" ? value.trim() || null : null,
          })}
        />
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
