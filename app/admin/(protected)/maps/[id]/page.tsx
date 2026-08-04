import { notFound } from "next/navigation";

import { FloorMapStudio } from "@/components/admin/editors/FloorMapStudio";
import { prisma } from "@/lib/database/client";
import type { SceneDto } from "@/lib/types";

export default async function AdminFloorMapDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const floorPlanData = prisma.floorPlan
    ? await prisma.floorPlan.findUnique({
        where: { id },
        include: {
          markers: {
            orderBy: { createdAt: "asc" },
          },
        },
      })
    : null;

  if (!floorPlanData) notFound();

  const scenesData = await prisma.scene.findMany({
    where: { tourId: floorPlanData.tourId },
    orderBy: { sortOrder: "asc" },
  });

  const scenes: SceneDto[] = scenesData.map((s) => ({
    ...s,
    multiresConfig: (s.multiresConfig as Record<string, unknown> | null) ?? null,
    hotspots: [],
    media: [],
  }));

  const floorPlan = {
    ...floorPlanData,
    markers: floorPlanData.markers.map((m) => ({
      ...m,
      labelVi: m.labelVi,
      labelEn: m.labelEn,
      icon: m.icon,
      colorTheme: m.colorTheme,
    })),
  };

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">Interactive Studio</p>
          <h1>Floor Map & Marker Studio</h1>
        </div>
      </header>

      <FloorMapStudio floorPlan={floorPlan} scenes={scenes} />
    </>
  );
}
