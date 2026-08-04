import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/response";
import { demoTour } from "@/lib/demo-data";
import { prisma } from "@/lib/database/client";
import { getPublicDataMode } from "@/lib/env.server";

const idSchema = z.string().min(1).max(191);

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) {
    return apiError("VALIDATION_ERROR", "Invalid scene identifier.", 400);
  }
  try {
    if (getPublicDataMode() === "bundled-demo") {
      const scene = demoTour.scenes.find((item) => item.id === id);
      return scene
        ? apiSuccess(scene)
        : apiError("NOT_FOUND", "Scene not found.", 404);
    }
    const scene = await prisma.scene.findFirst({
      where: { id, isPublished: true, tour: { isPublished: true } },
      include: {
        hotspots: {
          where: { isVisible: true },
          orderBy: { sortOrder: "asc" },
        },
        media: { orderBy: { sortOrder: "asc" } },
      },
    });
    return scene
      ? apiSuccess(scene)
      : apiError("NOT_FOUND", "Scene not found.", 404);
  } catch (error: unknown) {
    console.error("Scene detail failed", error);
    return apiError(
      "DATA_SOURCE_UNAVAILABLE",
      "Scene data is temporarily unavailable.",
      503,
    );
  }
}
