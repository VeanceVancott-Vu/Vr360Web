import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

import {
  AdminRecordNotFoundError,
  AdminValidationError,
} from "@/lib/admin/errors";
import { prisma } from "@/lib/database/client";
import {
  categoryInputSchema,
  floorPlanInputSchema,
  hotspotInputSchema,
  mediaInputSchema,
  sceneInputSchema,
  tourInputSchema,
} from "@/lib/validation/schemas";

export const adminResourceSchema = z.enum([
  "tours",
  "categories",
  "scenes",
  "hotspots",
  "media",
  "floor-plans",
]);

export type AdminResource = z.infer<typeof adminResourceSchema>;

export function schemaFor(resource: AdminResource) {
  switch (resource) {
    case "tours":
      return tourInputSchema;
    case "categories":
      return categoryInputSchema;
    case "scenes":
      return sceneInputSchema;
    case "hotspots":
      return hotspotInputSchema;
    case "media":
      return mediaInputSchema;
    case "floor-plans":
      return floorPlanInputSchema;
  }
}

type TourInput = z.output<typeof tourInputSchema>;
type SceneInput = z.output<typeof sceneInputSchema>;
type HotspotInput = z.output<typeof hotspotInputSchema>;

async function validateHotspotRelation(data: HotspotInput) {
  if (data.type !== "SCENE_LINK") return;

  const [sourceScene, targetScene] = await Promise.all([
    prisma.scene.findUnique({
      where: { id: data.sceneId },
      select: { tourId: true },
    }),
    prisma.scene.findUnique({
      where: { id: data.targetSceneId },
      select: { tourId: true },
    }),
  ]);

  if (!sourceScene) {
    throw new AdminValidationError(
      "The source scene does not exist.",
      { sceneId: ["Select an existing source scene."] },
      "INVALID_RELATION",
    );
  }
  if (!targetScene) {
    throw new AdminValidationError(
      "The target scene does not exist.",
      { targetSceneId: ["Select an existing target scene."] },
      "INVALID_RELATION",
    );
  }
  if (sourceScene.tourId !== targetScene.tourId) {
    throw new AdminValidationError(
      "Scene-link hotspots must target a scene in the same tour.",
      { targetSceneId: ["Select a scene from the source scene's tour."] },
      "INVALID_RELATION",
    );
  }
}

async function validateTourUpdate(id: string | undefined, data: TourInput) {
  if (!id) {
    if (data.defaultSceneId) {
      throw new AdminValidationError(
        "A default scene can only be selected after the tour is created.",
        {
          defaultSceneId: [
            "Create the tour before selecting its default scene.",
          ],
        },
        "INVALID_RELATION",
      );
    }
    if (data.isPublished) {
      throw new AdminValidationError(
        "A tour must contain at least one published scene before publication.",
        {
          isPublished: ["Add and publish a scene before publishing the tour."],
        },
      );
    }
    return;
  }

  const tour = await prisma.tour.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!tour) throw new AdminRecordNotFoundError();
  if (data.isPublished && !data.defaultSceneId) {
    throw new AdminValidationError(
      "A default scene is required before publishing the tour.",
      { defaultSceneId: ["Select a published scene from this tour."] },
    );
  }

  const [defaultScene, publishedSceneCount] = await Promise.all([
    data.defaultSceneId
      ? prisma.scene.findUnique({
          where: { id: data.defaultSceneId },
          select: { tourId: true, isPublished: true },
        })
      : Promise.resolve(null),
    data.isPublished
      ? prisma.scene.count({ where: { tourId: id, isPublished: true } })
      : Promise.resolve(0),
  ]);

  if (data.defaultSceneId && !defaultScene) {
    throw new AdminValidationError(
      "The selected default scene does not exist.",
      { defaultSceneId: ["Select an existing scene from this tour."] },
      "INVALID_RELATION",
    );
  }
  if (defaultScene && defaultScene.tourId !== id) {
    throw new AdminValidationError(
      "The default scene must belong to this tour.",
      { defaultSceneId: ["Select a scene from this tour."] },
      "INVALID_RELATION",
    );
  }
  if (data.isPublished && publishedSceneCount === 0) {
    throw new AdminValidationError(
      "A tour must contain at least one published scene before publication.",
      { isPublished: ["Publish at least one scene first."] },
    );
  }
  if (data.isPublished && defaultScene && !defaultScene.isPublished) {
    throw new AdminValidationError(
      "The default scene must be published before publishing the tour.",
      {
        defaultSceneId: [
          "Select a published scene or publish this scene first.",
        ],
      },
    );
  }
}

async function scenePublicationContext(id: string) {
  const scene = await prisma.scene.findUnique({
    where: { id },
    select: {
      tourId: true,
      isPublished: true,
      tour: { select: { isPublished: true, defaultSceneId: true } },
    },
  });
  if (!scene) throw new AdminRecordNotFoundError();
  return scene;
}

async function validateSceneUpdate(id: string, data: SceneInput) {
  const existing = await scenePublicationContext(id);
  if (existing.tourId !== data.tourId) {
    throw new AdminValidationError(
      "A scene cannot be moved to another tour after creation.",
      { tourId: ["Create a new scene in the destination tour instead."] },
      "INVALID_RELATION",
    );
  }

  if (!existing.tour.isPublished || data.isPublished) return;
  if (existing.tour.defaultSceneId === id) {
    throw new AdminValidationError(
      "A published tour's default scene cannot be unpublished.",
      {
        isPublished: [
          "Choose another default scene before unpublishing this one.",
        ],
      },
    );
  }
  if (!existing.isPublished) return;

  const otherPublishedScenes = await prisma.scene.count({
    where: { tourId: existing.tourId, isPublished: true, id: { not: id } },
  });
  if (otherPublishedScenes === 0) {
    throw new AdminValidationError(
      "A published tour must retain at least one published scene.",
      {
        isPublished: ["Unpublish the tour before unpublishing its last scene."],
      },
    );
  }
}

async function validateSceneDeletion(id: string) {
  const existing = await scenePublicationContext(id);
  if (existing.tour.isPublished && existing.tour.defaultSceneId === id) {
    throw new AdminValidationError(
      "A published tour's default scene cannot be deleted.",
      { sceneId: ["Choose another default scene before deleting this one."] },
    );
  }
  if (!existing.tour.isPublished || !existing.isPublished) return;

  const otherPublishedScenes = await prisma.scene.count({
    where: { tourId: existing.tourId, isPublished: true, id: { not: id } },
  });
  if (otherPublishedScenes === 0) {
    throw new AdminValidationError(
      "A published tour must retain at least one published scene.",
      {
        sceneId: [
          "Unpublish the tour before deleting its last published scene.",
        ],
      },
    );
  }
}

export async function listAdminResources(resource: AdminResource) {
  switch (resource) {
    case "tours":
      return prisma.tour.findMany({ orderBy: { updatedAt: "desc" } });
    case "categories":
      return prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      });
    case "scenes":
      return prisma.scene.findMany({
        orderBy: [{ tourId: "asc" }, { sortOrder: "asc" }],
        include: {
          category: { select: { nameVi: true, nameEn: true } },
          tour: { select: { titleVi: true, titleEn: true } },
        },
      });
    case "hotspots":
      return prisma.hotspot.findMany({
        orderBy: [{ sceneId: "asc" }, { sortOrder: "asc" }],
        include: { scene: { select: { titleVi: true, titleEn: true } } },
      });
    case "media":
      return prisma.media.findMany({
        orderBy: [{ sceneId: "asc" }, { sortOrder: "asc" }],
      });
    case "floor-plans":
      return prisma.floorPlan
        ? prisma.floorPlan.findMany({
            orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
            include: { markers: { include: { scene: true } } },
          })
        : [];
  }
}

export async function createAdminResource(
  resource: AdminResource,
  input: unknown,
) {
  switch (resource) {
    case "tours": {
      const data = tourInputSchema.parse(input);
      await validateTourUpdate(undefined, data);
      return prisma.tour.create({ data });
    }
    case "categories": {
      const data = categoryInputSchema.parse(input);
      return prisma.category.create({ data });
    }
    case "scenes": {
      const parsed = sceneInputSchema.parse(input);
      const { multiresConfig, ...data } = parsed;
      return prisma.scene.create({
        data: {
          ...data,
          multiresConfig: multiresConfig
            ? (multiresConfig as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    }
    case "hotspots": {
      const data = hotspotInputSchema.parse(input);
      await validateHotspotRelation(data);
      return prisma.hotspot.create({ data });
    }
    case "media": {
      const data = mediaInputSchema.parse(input);
      return prisma.media.create({ data });
    }
    case "floor-plans": {
      const data = floorPlanInputSchema.parse(input);
      if (!prisma.floorPlan)
        throw new Error("FloorPlan database model delegate is unavailable.");
      if (data.isDefault) {
        return prisma.$transaction(async (transaction) => {
          await transaction.floorPlan.updateMany({
            where: { tourId: data.tourId },
            data: { isDefault: false },
          });
          return transaction.floorPlan.create({ data });
        });
      }
      return prisma.floorPlan.create({ data });
    }
  }
}

export async function getAdminResource(resource: AdminResource, id: string) {
  switch (resource) {
    case "tours":
      return prisma.tour.findUnique({ where: { id } });
    case "categories":
      return prisma.category.findUnique({ where: { id } });
    case "scenes":
      return prisma.scene.findUnique({
        where: { id },
        include: {
          hotspots: { orderBy: { sortOrder: "asc" } },
          media: { orderBy: { sortOrder: "asc" } },
        },
      });
    case "hotspots":
      return prisma.hotspot.findUnique({ where: { id } });
    case "media":
      return prisma.media.findUnique({ where: { id } });
    case "floor-plans":
      return prisma.floorPlan
        ? prisma.floorPlan.findUnique({
            where: { id },
            include: { markers: { include: { scene: true } } },
          })
        : null;
  }
}

export async function updateAdminResource(
  resource: AdminResource,
  id: string,
  input: unknown,
) {
  switch (resource) {
    case "tours": {
      const data = tourInputSchema.parse(input);
      await validateTourUpdate(id, data);
      return prisma.tour.update({ where: { id }, data });
    }
    case "categories": {
      const data = categoryInputSchema.parse(input);
      return prisma.category.update({ where: { id }, data });
    }
    case "scenes": {
      const parsed = sceneInputSchema.parse(input);
      await validateSceneUpdate(id, parsed);
      const { multiresConfig, ...data } = parsed;
      return prisma.scene.update({
        where: { id },
        data: {
          ...data,
          multiresConfig: multiresConfig
            ? (multiresConfig as Prisma.InputJsonValue)
            : Prisma.JsonNull,
        },
      });
    }
    case "hotspots": {
      const data = hotspotInputSchema.parse(input);
      await validateHotspotRelation(data);
      return prisma.hotspot.update({ where: { id }, data });
    }
    case "media": {
      const data = mediaInputSchema.parse(input);
      return prisma.media.update({ where: { id }, data });
    }
    case "floor-plans": {
      const data = floorPlanInputSchema.parse(input);
      if (!prisma.floorPlan)
        throw new Error("FloorPlan database model delegate is unavailable.");
      const existing = await prisma.floorPlan.findUnique({
        where: { id },
        select: { tourId: true },
      });
      if (!existing) throw new AdminRecordNotFoundError();
      if (existing.tourId !== data.tourId) {
        throw new AdminValidationError(
          "A floor plan cannot be moved to another tour after creation.",
          {
            tourId: [
              "Create a new floor plan in the destination tour instead.",
            ],
          },
          "INVALID_RELATION",
        );
      }
      if (data.isDefault) {
        return prisma.$transaction(async (transaction) => {
          await transaction.floorPlan.updateMany({
            where: { tourId: data.tourId },
            data: { isDefault: false },
          });
          return transaction.floorPlan.update({ where: { id }, data });
        });
      }
      return prisma.floorPlan.update({ where: { id }, data });
    }
  }
}

export async function deleteAdminResource(resource: AdminResource, id: string) {
  switch (resource) {
    case "tours":
      return prisma.tour.delete({ where: { id } });
    case "categories":
      return prisma.category.delete({ where: { id } });
    case "scenes":
      await validateSceneDeletion(id);
      return prisma.scene.delete({ where: { id } });
    case "hotspots":
      return prisma.hotspot.delete({ where: { id } });
    case "media":
      return prisma.media.delete({ where: { id } });
    case "floor-plans":
      if (!prisma.floorPlan)
        throw new Error("FloorPlan database model delegate is unavailable.");
      return prisma.floorPlan.delete({ where: { id } });
  }
}
