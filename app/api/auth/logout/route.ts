import { apiError, apiSuccess } from "@/lib/api/response";
import { clearAdminSession, isSameOrigin } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError(
      "INVALID_ORIGIN",
      "Cross-origin requests are not allowed.",
      403,
    );
  }
  await clearAdminSession();
  return apiSuccess({ signedOut: true });
}
