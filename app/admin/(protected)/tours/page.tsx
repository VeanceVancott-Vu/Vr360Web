import { Plus } from "lucide-react";
import Link from "next/link";

import { ResourceTable } from "@/components/admin/ResourceTable";
import { prisma } from "@/lib/database/client";

export default async function AdminToursPage() {
  const tours = await prisma.tour.findMany({ orderBy: { updatedAt: "desc" } });
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Tour management</p>
          <h1>Tours</h1>
        </div>
        <Link className="primary-button" href="/admin/tours/new">
          <Plus size={17} aria-hidden="true" /> New tour
        </Link>
      </header>
      <ResourceTable
        resource="tours"
        editBase="/admin/tours"
        rows={tours.map((tour) => ({
          id: tour.id,
          title: tour.titleVi,
          subtitle: `${tour.titleEn} · /tour/${tour.slug}`,
          status: tour.isPublished ? "Published" : "Draft",
        }))}
      />
    </>
  );
}
