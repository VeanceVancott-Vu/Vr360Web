import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getAdminSession();
  return session
    ? apiSuccess({
        user: {
          id: session.userId,
          email: session.email,
          role: session.role,
        },
      })
    : apiError("UNAUTHORIZED", "No active administrator session.", 401);
}
