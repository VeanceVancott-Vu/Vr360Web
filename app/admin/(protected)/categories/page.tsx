import { ResourceTable } from "@/components/admin/ResourceTable";
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
      </header>
      <ResourceTable
        resource="categories"
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
