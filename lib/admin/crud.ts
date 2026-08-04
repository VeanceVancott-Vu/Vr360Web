import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";

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
      return prisma.hotspot.create({ data });
    }
    case "media": {
      const data = mediaInputSchema.parse(input);
      return prisma.media.create({ data });
    }
    case "floor-plans": {
      const data = floorPlanInputSchema.parse(input);
      if (!prisma.floorPlan) throw new Error("FloorPlan database model delegate is unavailable.");
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
      return prisma.tour.update({ where: { id }, data });
    }
    case "categories": {
      const data = categoryInputSchema.parse(input);
      return prisma.category.update({ where: { id }, data });
    }
    case "scenes": {
      const parsed = sceneInputSchema.parse(input);
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
      return prisma.hotspot.update({ where: { id }, data });
    }
    case "media": {
      const data = mediaInputSchema.parse(input);
      return prisma.media.update({ where: { id }, data });
    }
    case "floor-plans": {
      const data = floorPlanInputSchema.parse(input);
      if (!prisma.floorPlan) throw new Error("FloorPlan database model delegate is unavailable.");
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
      return prisma.scene.delete({ where: { id } });
    case "hotspots":
      return prisma.hotspot.delete({ where: { id } });
    case "media":
      return prisma.media.delete({ where: { id } });
    case "floor-plans":
      if (!prisma.floorPlan) throw new Error("FloorPlan database model delegate is unavailable.");
      return prisma.floorPlan.delete({ where: { id } });
  }
}
