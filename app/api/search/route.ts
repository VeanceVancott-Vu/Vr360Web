import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import { demoTour } from "@/lib/demo-data";
import { prisma } from "@/lib/database/client";
import { getPublicDataMode } from "@/lib/env.server";
import { searchSchema } from "@/lib/validation/schemas";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const parsed = searchSchema.safeParse({ q });
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Search queries must contain 2–80 characters.",
      400,
      zodFields(parsed.error),
    );
  }
  const query = parsed.data.q;
  try {
    if (getPublicDataMode() === "bundled-demo") {
      const normalized = query.toLocaleLowerCase();
      const scenes = demoTour.scenes
        .filter((scene) =>
          [
            scene.titleVi,
            scene.titleEn,
            scene.shortDescriptionVi,
            scene.shortDescriptionEn,
          ].some((value) => value.toLocaleLowerCase().includes(normalized)),
        )
        .slice(0, 12);
      return apiSuccess({
        query,
        tours: [demoTour].filter((tour) =>
          [tour.titleVi, tour.titleEn].some((value) =>
            value.toLocaleLowerCase().includes(normalized),
          ),
        ),
        scenes,
      });
    }

    const [tours, scenes] = await Promise.all([
      prisma.tour.findMany({
        where: {
          isPublished: true,
          OR: [
            { titleVi: { contains: query } },
            { titleEn: { contains: query } },
            { descriptionVi: { contains: query } },
            { descriptionEn: { contains: query } },
          ],
        },
        take: 6,
      }),
      prisma.scene.findMany({
        where: {
          isPublished: true,
          tour: { isPublished: true },
          OR: [
            { titleVi: { contains: query } },
            { titleEn: { contains: query } },
            { shortDescriptionVi: { contains: query } },
            { shortDescriptionEn: { contains: query } },
          ],
        },
        take: 12,
      }),
    ]);
    return apiSuccess({ query, tours, scenes });
  } catch (error: unknown) {
    console.error("Search failed", error);
    return apiError(
      "DATA_SOURCE_UNAVAILABLE",
      "Search is temporarily unavailable.",
      503,
    );
  }
}
