
import { notFound } from "next/navigation";

import { TourWelcomeScreen } from "@/components/tour/header/TourWelcomeScreen";
import { listPublishedTours } from "@/lib/repositories/tour-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { items: tours } = await listPublishedTours(1, 100);

  if (tours.length === 0) {
    notFound();
  }

  const defaultTour =
    tours.find((item) => item.slug === "da-nang") ?? tours[0];

  // Explicitly handle the possibility of an empty array.
  if (!defaultTour) {
    notFound();
  }

  return <TourWelcomeScreen tour={defaultTour} tours={tours} />;
}
