"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AdminField } from "@/components/admin/forms/SceneForm";
import { adminRequest } from "@/lib/api/admin-client";
import { categoryInputSchema } from "@/lib/validation/schemas";

type CategoryInput = z.input<typeof categoryInputSchema>;
type CategoryValues = z.output<typeof categoryInputSchema>;

export function CategoryForm({
  id,
  initial,
}: {
  id?: string;
  initial?: CategoryInput;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput, unknown, CategoryValues>({
    resolver: zodResolver(categoryInputSchema),
    defaultValues: initial ?? {
      slug: "",
      nameVi: "",
      nameEn: "",
      icon: "MapPin",
      sortOrder: 0,
    },
  });

  async function submit(values: CategoryValues) {
    setMessage(null);
    try {
      const category = await adminRequest<{ id: string }>(
        id ? `/api/admin/categories/${id}` : "/api/admin/categories",
        {
          method: id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        },
      );
      setMessage("Category saved.");
      if (!id) router.replace(`/admin/categories/${category.id}`);
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
      <AdminField label="Slug" error={errors.slug?.message}>
        <input {...register("slug")} />
      </AdminField>
      <AdminField label="Vietnamese name" error={errors.nameVi?.message}>
        <input {...register("nameVi")} />
      </AdminField>
      <AdminField label="English name" error={errors.nameEn?.message}>
        <input {...register("nameEn")} />
      </AdminField>
      <AdminField label="Icon name" error={errors.icon?.message}>
        <input {...register("icon")} />
      </AdminField>
      <AdminField label="Sort order" error={errors.sortOrder?.message}>
        <input
          type="number"
          {...register("sortOrder", { valueAsNumber: true })}
        />
      </AdminField>
      {message ? (
        <p
          className={message === "Category saved." ? "" : "field-error"}
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
          {isSubmitting ? "Saving…" : "Save category"}
        </button>
      </div>
    </form>
  );
}
