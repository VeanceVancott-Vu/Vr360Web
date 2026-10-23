import { notFound } from "next/navigation";

import { CategoryForm } from "@/components/admin/forms/CategoryForm";
import { prisma } from "@/lib/database/client";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) notFound();

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Taxonomy</p>
          <h1>Edit category</h1>
        </div>
      </header>
      <CategoryForm
        id={category.id}
        initial={{
          slug: category.slug,
          nameVi: category.nameVi,
          nameEn: category.nameEn,
          icon: category.icon,
          sortOrder: category.sortOrder,
        }}
      />
    </>
  );
}
