import type { Prisma } from "@/generated/prisma/client";
import { notFound } from "next/navigation";

import { ResourceTable } from "@/components/admin/layout/ResourceTable";
import { SceneForm } from "@/components/admin/forms/SceneForm";
import { SceneHotspotEditor } from "@/components/admin/editors/SceneHotspotEditor";
import { prisma } from "@/lib/database/client";

function jsonObject(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export default async function EditScenePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const scene = await prisma.scene.findUnique({
    where: { id },
    include: { hotspots: { orderBy: { sortOrder: "asc" } } },
  });
  if (!scene) notFound();

  const [tours, categories, allScenes] = await Promise.all([
    prisma.tour.findMany({
      orderBy: { titleEn: "asc" },
      select: { id: true, titleEn: true, slug: true },
    }),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEn: true },
    }),
    prisma.scene.findMany({
      where: { tourId: scene.tourId },
      orderBy: { titleEn: "asc" },
      select: { id: true, titleEn: true, slug: true },
    }),
  ]);

  return (
    <>
      <header className="admin-header">
        <div>
          <p className="eyebrow">360 content</p>
          <h1>Edit scene: {scene.titleVi || scene.titleEn}</h1>
        </div>
      </header>
      <SceneForm
        id={scene.id}
        tours={tours}
        categories={categories}
        initial={{
          tourId: scene.tourId,
          categoryId: scene.categoryId,
          slug: scene.slug,
          titleVi: scene.titleVi,
          titleEn: scene.titleEn,
          shortDescriptionVi: scene.shortDescriptionVi,
          shortDescriptionEn: scene.shortDescriptionEn,
          fullDescriptionVi: scene.fullDescriptionVi,
          fullDescriptionEn: scene.fullDescriptionEn,
          panoramaType: scene.panoramaType,
          panoramaUrl: scene.panoramaUrl,
          previewImageUrl: scene.previewImageUrl,
          multiresConfig: jsonObject(scene.multiresConfig),
          initialPitch: scene.initialPitch,
          initialYaw: scene.initialYaw,
          initialHfov: scene.initialHfov,
          minimumHfov: scene.minimumHfov,
          maximumHfov: scene.maximumHfov,
          latitude: scene.latitude,
          longitude: scene.longitude,
          narrationAudioVi: scene.narrationAudioVi,
          narrationAudioEn: scene.narrationAudioEn,
          attribution: scene.attribution,
          sortOrder: scene.sortOrder,
          isPublished: scene.isPublished,
        }}
      />
      <section style={{ marginTop: "2rem" }}>
        <header className="admin-header">
          <div>
            <p className="eyebrow">Connected graph</p>
            <h2>Hotspots</h2>
          </div>
        </header>
        <ResourceTable
          resource="hotspots"
          rows={scene.hotspots.map((hotspot) => ({
            id: hotspot.id,
            title: hotspot.labelVi,
            subtitle: `${hotspot.labelEn} · pitch ${hotspot.pitch.toFixed(2)}, yaw ${hotspot.yaw.toFixed(2)}`,
            status: hotspot.isVisible
              ? hotspot.type
              : `${hotspot.type} · Hidden`,
          }))}
        />
        <SceneHotspotEditor
          scene={{
            ...scene,
            multiresConfig: jsonObject(scene.multiresConfig),
            cubemapUrls: Array.isArray(
              jsonObject(scene.multiresConfig)?.cubemapUrls,
            )
              ? (jsonObject(scene.multiresConfig)?.cubemapUrls as string[])
              : null,
            media: [],
          }}
          sceneId={scene.id}
          previewImageUrl={scene.previewImageUrl}
          scenes={allScenes}
          hotspots={scene.hotspots}
        />
      </section>
    </>
  );
}
