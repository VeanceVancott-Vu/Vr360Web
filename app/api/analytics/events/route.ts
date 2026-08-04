import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import {
  AnalyticsConfigurationError,
  analyticsRateLimitKey,
  hashAnalyticsSessionToken,
} from "@/lib/analytics/privacy.server";
import { prisma } from "@/lib/database/client";
import { getPublicDataMode } from "@/lib/env.server";
import {
  checkRateLimit,
  RateLimitConfigurationError,
  RateLimitUnavailableError,
  requestAddress,
} from "@/lib/rate-limit";
import { analyticsSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  let limit;
  try {
    limit = await checkRateLimit(
      analyticsRateLimitKey(requestAddress(request)),
      60,
      60_000,
    );
  } catch (error) {
    if (error instanceof AnalyticsConfigurationError) {
      return apiError(
        "ANALYTICS_NOT_CONFIGURED",
        "Analytics is temporarily unavailable.",
        503,
      );
    }
    if (
      error instanceof RateLimitConfigurationError ||
      error instanceof RateLimitUnavailableError
    ) {
      return apiError(
        "RATE_LIMIT_UNAVAILABLE",
        "Request protection is temporarily unavailable.",
        503,
      );
    }
    throw error;
  }
  if (!limit.allowed) {
    return apiError(
      "RATE_LIMITED",
      `Too many events. Retry in ${limit.retryAfterSeconds} seconds.`,
      429,
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  const parsed = analyticsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Invalid analytics event.",
      422,
      zodFields(parsed.error),
    );
  }
  try {
    const { sessionToken, ...event } = parsed.data;
    if (getPublicDataMode() === "database") {
      await prisma.tourViewEvent.create({
        data: {
          ...event,
          anonymousSessionId: hashAnalyticsSessionToken(sessionToken),
        },
      });
    }
    return apiSuccess(
      { accepted: true },
      { status: 202, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error: unknown) {
    if (error instanceof AnalyticsConfigurationError) {
      return apiError(
        "ANALYTICS_NOT_CONFIGURED",
        "Analytics is temporarily unavailable.",
        503,
      );
    }
    console.error("Analytics event failed", error);
    return apiError(
      "DATA_SOURCE_UNAVAILABLE",
      "Analytics storage is temporarily unavailable.",
      503,
    );
  }
}
