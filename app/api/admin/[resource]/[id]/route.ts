import { z } from "zod";

import {
  adminResourceSchema,
  deleteAdminResource,
  getAdminResource,
  updateAdminResource,
} from "@/lib/admin/crud";
import { adminMutationErrorResponse } from "@/lib/admin/errors";
import { apiError, apiSuccess } from "@/lib/api/response";
import { getAdminSession, isSameOrigin } from "@/lib/auth/session";

const idSchema = z.string().min(1).max(191);

async function routeParameters(context: {
  params: Promise<{ resource: string; id: string }>;
}) {
  const params = await context.params;
  const resource = adminResourceSchema.safeParse(params.resource);
  const id = idSchema.safeParse(params.id);
  return { resource, id };
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
) {
  const session = await getAdminSession();
  if (!session) return apiError("UNAUTHORIZED", "Sign in is required.", 401);
  const { resource, id } = await routeParameters(context);
  if (!resource.success || !id.success) {
    return apiError("NOT_FOUND", "Administrator resource not found.", 404);
  }
  try {
    const record = await getAdminResource(resource.data, id.data);
    return record
      ? apiSuccess(record)
      : apiError("NOT_FOUND", "Record not found.", 404);
  } catch (error: unknown) {
    console.error("Administrator detail failed", error);
    return apiError("INTERNAL_ERROR", "Unable to load the record.", 500);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
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
  const { resource, id } = await routeParameters(context);
  if (!resource.success || !id.success) {
    return apiError("NOT_FOUND", "Administrator resource not found.", 404);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
  }
  try {
    return apiSuccess(await updateAdminResource(resource.data, id.data, body));
  } catch (error: unknown) {
    const response = adminMutationErrorResponse(error);
    if (response) return response;
    console.error("Administrator update failed", error);
    return apiError("INTERNAL_ERROR", "Unable to update the record.", 500);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ resource: string; id: string }> },
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
  const { resource, id } = await routeParameters(context);
  if (!resource.success || !id.success) {
    return apiError("NOT_FOUND", "Administrator resource not found.", 404);
  }
  try {
    await deleteAdminResource(resource.data, id.data);
    return apiSuccess({ deleted: true });
  } catch (error: unknown) {
    const response = adminMutationErrorResponse(error);
    if (response) return response;
    console.error("Administrator delete failed", error);
    return apiError("INTERNAL_ERROR", "Unable to delete the record.", 500);
  }
}
