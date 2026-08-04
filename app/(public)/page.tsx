import { notFound } from "next/navigation";

import { TourWelcomeScreen } from "@/components/tour/header/TourWelcomeScreen";
import { getPublishedTour } from "@/lib/repositories/tour-repository";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const tour = await getPublishedTour("da-nang");
  if (!tour) notFound();
  return <TourWelcomeScreen tour={tour} />;
}
