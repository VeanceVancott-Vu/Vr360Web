import { apiSuccess } from "@/lib/api/response";
import {
  getReleaseIdentifier,
  healthResponseHeaders,
} from "@/lib/observability/release";

export const dynamic = "force-dynamic";

export async function GET() {
  const release = getReleaseIdentifier();
  return apiSuccess(
    {
      service: "ok",
      liveness: "alive",
      release,
      timestamp: new Date().toISOString(),
    },
    { headers: healthResponseHeaders(release) },
  );
}
