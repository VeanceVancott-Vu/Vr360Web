import { SceneForm } from "@/components/admin/forms/SceneForm";
import { prisma } from "@/lib/database/client";

export default async function NewScenePage() {
  const [tours, categories] = await Promise.all([
    prisma.tour.findMany({
      orderBy: { titleEn: "asc" },
      select: { id: true, titleEn: true },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true },
    }),
  ]);
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">360 content</p>
          <h1>New scene</h1>
        </div>
      </header>
      <SceneForm tours={tours} categories={categories} />
    </>
  );
}
