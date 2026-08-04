import { apiError, apiSuccess } from "@/lib/api/response";
import {
  AnalyticsConfigurationError,
  assertAnalyticsConfiguration,
} from "@/lib/analytics/privacy.server";
import { prisma } from "@/lib/database/client";
import {
  getPublicDataMode,
  getServerEnvironment,
  ServerEnvironmentError,
} from "@/lib/env.server";
import {
  createMediaStorage,
  MediaStorageConfigurationError,
} from "@/lib/media/storage";
import {
  createRateLimitStore,
  RateLimitConfigurationError,
} from "@/lib/rate-limit";
import { logOperationalFailure } from "@/lib/observability/operational-log";
import {
  getReleaseIdentifier,
  healthResponseHeaders,
} from "@/lib/observability/release";

export const dynamic = "force-dynamic";

export async function GET() {
  const release = getReleaseIdentifier();
  const headers = healthResponseHeaders(release);
  try {
    const runtime = getServerEnvironment();
    const dataMode = getPublicDataMode();

    if (runtime.NODE_ENV === "production") {
      createMediaStorage();
      createRateLimitStore();
      assertAnalyticsConfiguration();
    }

    if (dataMode === "bundled-demo") {
      return apiSuccess(
        {
          service: "ok",
          readiness: "ready",
          environment: runtime.NODE_ENV,
          release,
          database: "not-configured",
          dataSource: "bundled-demo",
          timestamp: new Date().toISOString(),
        },
        { headers },
      );
    }

    await prisma.$queryRaw`SELECT 1`;
    return apiSuccess(
      {
        service: "ok",
        readiness: "ready",
        environment: runtime.NODE_ENV,
        release,
        database: "available",
        dataSource: "database",
        timestamp: new Date().toISOString(),
      },
      { headers },
    );
  } catch (error: unknown) {
    if (
      error instanceof ServerEnvironmentError ||
      error instanceof AnalyticsConfigurationError ||
      error instanceof MediaStorageConfigurationError ||
      error instanceof RateLimitConfigurationError
    ) {
      logOperationalFailure("readiness_configuration_failed", error, {
        release,
        dependency: "configuration",
      });
      return apiError(
        "CONFIGURATION_ERROR",
        "The application is missing required production configuration.",
        503,
        undefined,
        { headers },
      );
    }
    logOperationalFailure("readiness_database_failed", error, {
      release,
      dependency: "database",
    });
    return apiError(
      "DATABASE_UNAVAILABLE",
      "The application is running, but its database is unavailable.",
      503,
      undefined,
      { headers },
    );
  }
}
