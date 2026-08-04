import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

import { TourExperience } from "@/components/tour/TourExperience";
import { getPublishedTour } from "@/lib/repositories/tour-repository";

export const dynamic = "force-dynamic";

const getRequestTour = cache(getPublishedTour);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tourSlug: string }>;
}): Promise<Metadata> {
  const { tourSlug } = await params;
  const tour = await getRequestTour(tourSlug);
  return tour
    ? {
        title: tour.titleEn,
        description: tour.descriptionEn,
      }
    : { title: "Tour not found" };
}

export default async function TourPage({
  params,
}: {
  params: Promise<{ tourSlug: string }>;
}) {
  const { tourSlug } = await params;
  const tour = await getRequestTour(tourSlug);
  if (!tour) notFound();
  return (
    <Suspense fallback={<main className="tour-shell" aria-busy="true" />}>
      <TourExperience tour={tour} />
    </Suspense>
  );
}
