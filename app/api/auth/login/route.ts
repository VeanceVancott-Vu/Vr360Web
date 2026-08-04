import { compare } from "bcryptjs";

import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import { isSameOrigin, setAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/client";
import {
  checkRateLimit,
  RateLimitConfigurationError,
  RateLimitUnavailableError,
  requestAddress,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return apiError(
      "INVALID_ORIGIN",
      "Cross-origin requests are not allowed.",
      403,
    );
  }
  let limit;
  try {
    limit = await checkRateLimit(
      `login:${requestAddress(request)}`,
      5,
      15 * 60_000,
    );
  } catch (error) {
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
      `Too many login attempts. Retry in ${limit.retryAfterSeconds} seconds.`,
      429,
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "VALIDATION_ERROR",
      "Check the supplied credentials.",
      422,
      zodFields(parsed.error),
    );
  }
  if (!process.env.DATABASE_URL) {
    return apiError(
      "DATABASE_REQUIRED",
      "Administrator login requires a configured database.",
      503,
    );
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    const valid =
      user && (await compare(parsed.data.password, user.passwordHash));
    if (!user || !valid || user.role !== "ADMIN") {
      return apiError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
        401,
      );
    }
    await setAdminSession({
      userId: user.id,
      email: user.email,
      role: "ADMIN",
    });
    return apiSuccess({
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error: unknown) {
    console.error("Administrator login failed", error);
    return apiError("INTERNAL_ERROR", "Unable to sign in.", 500);
  }
}
