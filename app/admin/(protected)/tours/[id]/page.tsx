import { notFound } from "next/navigation";

import { TourForm } from "@/components/admin/TourForm";
import { prisma } from "@/lib/database/client";

export default async function EditTourPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tour = await prisma.tour.findUnique({ where: { id } });
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
