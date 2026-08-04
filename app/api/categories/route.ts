import { apiError, apiSuccess } from "@/lib/api/response";
import { demoCategories } from "@/lib/demo-data";
import { prisma } from "@/lib/database/client";
import { getPublicDataMode } from "@/lib/env.server";

export async function GET() {
  try {
    const categories =
      getPublicDataMode() === "database"
        ? await prisma.category.findMany({
            where: {
              scenes: {
                some: { isPublished: true, tour: { isPublished: true } },
              },
            },
            orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
          })
        : demoCategories;
    return apiSuccess(categories, {
      headers: { "Cache-Control": "public, s-maxage=120" },
    });
  } catch (error: unknown) {
    console.error("Category listing failed", error);
    return apiError(
      "DATA_SOURCE_UNAVAILABLE",
      "Categories are temporarily unavailable.",
      503,
    );
  }
}
