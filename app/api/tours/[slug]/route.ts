import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api/response";
import { ServerEnvironmentError } from "@/lib/env.server";
import {
  getPublishedTour,
  PublicDataUnavailableError,
} from "@/lib/repositories/tour-repository";

const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  const { slug } = await context.params;
  const parsed = slugSchema.safeParse(slug);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", "Invalid tour slug.", 400);
  }
  try {
    const tour = await getPublishedTour(parsed.data);
    if (!tour) return apiError("NOT_FOUND", "Tour not found.", 404);
    return apiSuccess(tour, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error: unknown) {
    console.error("Tour detail failed", error);
    if (
      error instanceof ServerEnvironmentError ||
      error instanceof PublicDataUnavailableError
    ) {
      return apiError(
        "DATA_SOURCE_UNAVAILABLE",
        "Tour data is temporarily unavailable.",
        503,
      );
    }
    return apiError("INTERNAL_ERROR", "Unable to load the tour.", 500);
  }
}
