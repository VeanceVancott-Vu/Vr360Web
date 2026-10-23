import { notFound } from "next/navigation";

import { TourForm } from "@/components/admin/forms/TourForm";
import { prisma } from "@/lib/database/client";

export default async function EditTourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tour, scenes] = await Promise.all([
    prisma.tour.findUnique({ where: { id } }),
    prisma.scene.findMany({
      where: { tourId: id },
      orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
      select: { id: true, titleEn: true },
    }),
  ]);
  if (!tour) notFound();
  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Tour management</p>
          <h1>Edit tour</h1>
        </div>
      </header>
      <TourForm
        id={tour.id}
        scenes={scenes}
        initial={{
          slug: tour.slug,
          titleVi: tour.titleVi,
          titleEn: tour.titleEn,
          descriptionVi: tour.descriptionVi,
          descriptionEn: tour.descriptionEn,
          coverImageUrl: tour.coverImageUrl,
          welcomeImageUrl: tour.welcomeImageUrl,
          defaultSceneId: tour.defaultSceneId,
          isPublished: tour.isPublished,
        }}
      />
    </>
  );
}
