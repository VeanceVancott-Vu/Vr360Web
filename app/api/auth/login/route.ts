import { compare } from "bcryptjs";
import { createHash } from "node:crypto";

import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import { isSameOrigin, setAdminSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/client";
import {
  checkRateLimit,
  inspectRateLimit,
  RateLimitConfigurationError,
  RateLimitUnavailableError,
  requestAddress,
} from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation/schemas";

const LOGIN_WINDOW_MS = 15 * 60_000;
const IP_LOGIN_ATTEMPT_LIMIT = 20;
const ACCOUNT_FAILED_LOGIN_LIMIT = 5;
const DUMMY_ADMIN_PASSWORD_HASH =
  "$2b$12$ri425bF/pNxhOzhua4DXe.9mICdm5/OhzgNTdAs/QobTS2pKAahdO";

function accountRateLimitKey(email: string): string {
  return "login:account:" + createHash("sha256").update(email).digest("hex");
}

function rateLimitUnavailable(error: unknown): Response {
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
      "login:ip:" + requestAddress(request),
      IP_LOGIN_ATTEMPT_LIMIT,
      LOGIN_WINDOW_MS,
    );
  } catch (error) {
    return rateLimitUnavailable(error);
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
  const accountKey = accountRateLimitKey(parsed.data.email);
  let accountInspection;
  try {
    accountInspection = await inspectRateLimit(
      accountKey,
      ACCOUNT_FAILED_LOGIN_LIMIT,
      LOGIN_WINDOW_MS,
    );
  } catch (error) {
    return rateLimitUnavailable(error);
  }
  if (!accountInspection.allowed) {
    return apiError(
      "RATE_LIMITED",
      "Too many login attempts. Retry in " +
        accountInspection.retryAfterSeconds +
        " seconds.",
      429,
    );
  }
  try {
    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });
    const valid = await compare(
      parsed.data.password,
      user?.passwordHash ?? DUMMY_ADMIN_PASSWORD_HASH,
    );
    if (!user || !valid || user.role !== "ADMIN") {
      let accountLimit;
      try {
        accountLimit = await checkRateLimit(
          accountKey,
          ACCOUNT_FAILED_LOGIN_LIMIT,
          LOGIN_WINDOW_MS,
        );
      } catch (error) {
        return rateLimitUnavailable(error);
      }
      if (!accountLimit.allowed) {
        return apiError(
          "RATE_LIMITED",
          "Too many login attempts. Retry in " +
            accountLimit.retryAfterSeconds +
            " seconds.",
          429,
        );
      }
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
