import { Plus } from "lucide-react";
import Link from "next/link";

import { ResourceTable } from "@/components/admin/layout/ResourceTable";
import { prisma } from "@/lib/database/client";

export default async function AdminCategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
  });
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Taxonomy</p>
          <h1>Categories</h1>
        </div>
        <Link className="primary-button" href="/admin/categories/new">
          <Plus size={17} aria-hidden="true" /> New category
        </Link>
      </header>
      <ResourceTable
        resource="categories"
        editBase="/admin/categories"
        rows={categories.map((category) => ({
          id: category.id,
          title: category.nameVi,
          subtitle: `${category.nameEn} · ${category.slug}`,
          status: `Order ${category.sortOrder}`,
        }))}
      />
    </>
  );
}
