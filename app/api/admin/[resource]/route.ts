import { ZodError } from "zod";

import {
  adminResourceSchema,
  createAdminResource,
  listAdminResources,
} from "@/lib/admin/crud";
import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import { getAdminSession, isSameOrigin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const session = await getAdminSession();
  if (!session) return apiError("UNAUTHORIZED", "Sign in is required.", 401);
  const { resource } = await context.params;
  const parsedResource = adminResourceSchema.safeParse(resource);
  if (!parsedResource.success) {
    return apiError("NOT_FOUND", "Administrator resource not found.", 404);
  }
  try {
    return apiSuccess(await listAdminResources(parsedResource.data));
  } catch (error: unknown) {
    console.error("Administrator list failed", error);
    return apiError("INTERNAL_ERROR", "Unable to load records.", 500);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ resource: string }> },
) {
  const session = await getAdminSession();
  if (!session) return apiError("UNAUTHORIZED", "Sign in is required.", 401);
  if (!isSameOrigin(request)) {
    return apiError(
      "INVALID_ORIGIN",
      "Cross-origin requests are not allowed.",
      403,
    );
  }
  const { resource } = await context.params;
  const parsedResource = adminResourceSchema.safeParse(resource);
  if (!parsedResource.success) {
    return apiError("NOT_FOUND", "Administrator resource not found.", 404);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  try {
    const created = await createAdminResource(parsedResource.data, body);
    return apiSuccess(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return apiError(
        "VALIDATION_ERROR",
        "The record contains invalid fields.",
        422,
        zodFields(error),
      );
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return apiError(
        "DUPLICATE_RECORD",
        "A unique value already exists.",
        409,
      );
    }
    console.error("Administrator create failed", error);
    return apiError("INTERNAL_ERROR", "Unable to create the record.", 500);
  }
}
