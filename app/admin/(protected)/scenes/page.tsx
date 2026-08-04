import { Plus } from "lucide-react";
import Link from "next/link";

import { ResourceTable } from "@/components/admin/layout/ResourceTable";
import { prisma } from "@/lib/database/client";

export default async function AdminScenesPage() {
  const scenes = await prisma.scene.findMany({
    orderBy: [{ tourId: "asc" }, { sortOrder: "asc" }],
    include: {
      category: { select: { nameEn: true } },
      tour: { select: { titleEn: true } },
    },
  });
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">360 content</p>
          <h1>Scenes</h1>
        </div>
        <Link className="primary-button" href="/admin/scenes/new">
          <Plus size={17} aria-hidden="true" /> New scene
        </Link>
      </header>
      <ResourceTable
        resource="scenes"
        editBase="/admin/scenes"
        rows={scenes.map((scene) => ({
          id: scene.id,
          title: scene.titleVi,
          subtitle: `${scene.titleEn} · ${scene.tour.titleEn} · ${scene.category.nameEn}`,
          status: scene.isPublished ? "Published" : "Draft",
        }))}
      />
    </>
  );
}
