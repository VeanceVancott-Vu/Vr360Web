import { z } from "zod";

import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import { ServerEnvironmentError } from "@/lib/env.server";
import {
  listPublishedTours,
  PublicDataUnavailableError,
} from "@/lib/repositories/tour-repository";

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(24).default(12),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = paginationSchema.safeParse({
    page: url.searchParams.get("page") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid pagination parameters.",
      400,
      zodFields(parsed.error),
    );
  }
  try {
    const result = await listPublishedTours(
      parsed.data.page,
      parsed.data.pageSize,
    );
    return apiSuccess({
      ...result,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  } catch (error: unknown) {
    console.error("Tour listing failed", error);
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
    return apiError("INTERNAL_ERROR", "Unable to load tours.", 500);
  }
}
