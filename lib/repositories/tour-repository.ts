import type { Prisma } from "@/generated/prisma/client";

import { demoTour } from "@/lib/demo-data";
import { prisma } from "@/lib/database/client";
import { getPublicDataMode } from "@/lib/env.server";
import type { TourDto } from "@/lib/types";

export class PublicDataUnavailableError extends Error {
  constructor(operation: string, cause: unknown) {
    super("The public tour data source is unavailable during " + operation, {
      cause,
    });
    this.name = "PublicDataUnavailableError";
  }
}

function jsonObject(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (!value || Array.isArray(value) || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export async function getPublishedTour(slug: string): Promise<TourDto | null> {
  if (getPublicDataMode() === "bundled-demo") {
    return slug === demoTour.slug ? demoTour : null;
  }

  try {
    const tour = await prisma.tour.findFirst({
      where: { slug, isPublished: true },
      include: {
        scenes: {
          where: { isPublished: true },
          orderBy: [{ sortOrder: "asc" }, { titleEn: "asc" }],
          include: {
            hotspots: {
              where: { isVisible: true },
              orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            },
            media: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
          },
        },
      },
    });
    if (!tour) return null;

    const categories = await prisma.category.findMany({
      where: { scenes: { some: { tourId: tour.id, isPublished: true } } },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    });

    const floorPlans = prisma.floorPlan
      ? await prisma.floorPlan.findMany({
          where: { tourId: tour.id },
          orderBy: [
            { isDefault: "desc" },
            { updatedAt: "desc" },
            { sortOrder: "asc" },
          ],
          include: { markers: true },
        })
      : [];
    const publishedSceneIds = new Set(tour.scenes.map((scene) => scene.id));

    return {
      id: tour.id,
      slug: tour.slug,
      titleVi: tour.titleVi,
      titleEn: tour.titleEn,
      descriptionVi: tour.descriptionVi,
      descriptionEn: tour.descriptionEn,
      coverImageUrl: tour.coverImageUrl,
      welcomeImageUrl: tour.welcomeImageUrl,
      defaultSceneId: tour.defaultSceneId,
      isPublished: tour.isPublished,
      categories,
      floorPlans: floorPlans.map((plan) => ({
        ...plan,
        markers: plan.markers
          .filter((marker) => publishedSceneIds.has(marker.sceneId))
          .map((marker) => ({
            ...marker,
            labelVi: marker.labelVi,
            labelEn: marker.labelEn,
            icon: marker.icon,
            colorTheme: marker.colorTheme,
          })),
      })),
      scenes: tour.scenes.map((scene) => ({
        id: scene.id,
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
        cubemapUrls: Array.isArray(
          jsonObject(scene.multiresConfig)?.cubemapUrls,
        )
          ? (jsonObject(scene.multiresConfig)?.cubemapUrls as string[])
          : null,
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
        hotspots: scene.hotspots,
        media: scene.media,
      })),
    };
  } catch (error) {
    throw new PublicDataUnavailableError("tour lookup", error);
  }
}

export async function listPublishedTours(
  page: number,
  pageSize: number,
): Promise<{ items: TourDto[]; total: number }> {
  if (getPublicDataMode() === "bundled-demo") {
    return { items: page === 1 ? [demoTour] : [], total: 1 };
  }
  try {
    const [tours, total] = await prisma.$transaction([
      prisma.tour.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.tour.count({ where: { isPublished: true } }),
    ]);
    return {
      items: tours.map((tour) => ({
        ...tour,
        categories: [],
        scenes: [],
      })),
      total,
    };
  } catch (error) {
    throw new PublicDataUnavailableError("tour listing", error);
  }
}
