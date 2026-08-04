import { type NextRequest } from "next/server";
import { z, ZodError } from "zod";

import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import { getAdminSession, isSameOrigin } from "@/lib/auth/session";
import { prisma } from "@/lib/database/client";
import {
  floorPlanMarkerDeleteSchema,
  floorPlanMarkerInputSchema,
  floorPlanMarkerUpdateSchema,
} from "@/lib/validation/schemas";

const routeIdSchema = z.string().trim().min(1).max(191);

async function authorizeMutation(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  }
  if (!isSameOrigin(request)) {
    return apiError(
      "INVALID_ORIGIN",
      "Cross-origin requests are not allowed.",
      403,
    );
  }
  return null;
}

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new SyntaxError("INVALID_JSON");
  }
}

function validationError(error: ZodError) {
  return apiError(
    "VALIDATION_ERROR",
    "Invalid marker inputs.",
    422,
    zodFields(error),
  );
}

function prismaErrorCode(error: unknown): string | null {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : null;
}

async function getFloorPlan(id: string) {
  return prisma.floorPlan.findUnique({
    where: { id },
    select: { id: true, tourId: true },
  });
}

async function sceneBelongsToTour(sceneId: string, tourId: string) {
  return prisma.scene.findFirst({
    where: { id: sceneId, tourId },
    select: { id: true },
  });
}

function invalidRouteId(id: string) {
  return routeIdSchema.safeParse(id).success
    ? null
    : apiError("VALIDATION_ERROR", "Invalid floor plan identifier.", 400);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorizationError = await authorizeMutation(request);
  if (authorizationError) return authorizationError;

  const { id } = await params;
  const identifierError = invalidRouteId(id);
  if (identifierError) return identifierError;

  try {
    const parsed = floorPlanMarkerInputSchema.parse(await parseJson(request));
    if (parsed.floorPlanId !== id) {
      return apiError(
        "VALIDATION_ERROR",
        "The marker floor plan must match the route.",
        422,
        { floorPlanId: ["The floor plan must match the route identifier."] },
      );
    }

    const floorPlan = await getFloorPlan(id);
    if (!floorPlan) {
      return apiError("NOT_FOUND", "Floor plan not found.", 404);
    }
    if (!(await sceneBelongsToTour(parsed.sceneId, floorPlan.tourId))) {
      return apiError(
        "INVALID_RELATION",
        "The selected scene does not belong to this floor plan's tour.",
        422,
        { sceneId: ["Select a scene from the same tour as the floor plan."] },
      );
    }

    const marker = await prisma.floorPlanMarker.create({
      data: {
        floorPlanId: id,
        sceneId: parsed.sceneId,
        x: parsed.x,
        y: parsed.y,
        labelVi: parsed.labelVi,
        labelEn: parsed.labelEn,
        icon: parsed.icon,
        colorTheme: parsed.colorTheme,
      },
    });
    return apiSuccess(marker, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
    }
    if (error instanceof ZodError) return validationError(error);
    if (prismaErrorCode(error) === "P2003") {
      return apiError(
        "INVALID_RELATION",
        "A related record was not found.",
        422,
      );
    }
    return apiError("INTERNAL_SERVER_ERROR", "Failed to add marker.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorizationError = await authorizeMutation(request);
  if (authorizationError) return authorizationError;

  const { id } = await params;
  const identifierError = invalidRouteId(id);
  if (identifierError) return identifierError;

  try {
    const parsed = floorPlanMarkerUpdateSchema.parse(await parseJson(request));
    if (parsed.floorPlanId && parsed.floorPlanId !== id) {
      return apiError(
        "VALIDATION_ERROR",
        "The marker floor plan must match the route.",
        422,
        { floorPlanId: ["The floor plan cannot be reassigned."] },
      );
    }

    const marker = await prisma.floorPlanMarker.findFirst({
      where: { id: parsed.markerId, floorPlanId: id },
      select: { id: true },
    });
    if (!marker) {
      return apiError("NOT_FOUND", "Marker not found on this floor plan.", 404);
    }

    if (parsed.sceneId) {
      const floorPlan = await getFloorPlan(id);
      if (!floorPlan) {
        return apiError("NOT_FOUND", "Floor plan not found.", 404);
      }
      if (!(await sceneBelongsToTour(parsed.sceneId, floorPlan.tourId))) {
        return apiError(
          "INVALID_RELATION",
          "The selected scene does not belong to this floor plan's tour.",
          422,
          { sceneId: ["Select a scene from the same tour as the floor plan."] },
        );
      }
    }

    const updated = await prisma.floorPlanMarker.update({
      where: { id: parsed.markerId },
      data: {
        sceneId: parsed.sceneId,
        x: parsed.x,
        y: parsed.y,
        labelVi: parsed.labelVi,
        labelEn: parsed.labelEn,
        icon: parsed.icon,
        colorTheme: parsed.colorTheme,
      },
    });
    return apiSuccess(updated);
  } catch (error: unknown) {
    if (error instanceof SyntaxError) {
      return apiError("INVALID_JSON", "Request body must be valid JSON.", 400);
    }
    if (error instanceof ZodError) return validationError(error);
    if (prismaErrorCode(error) === "P2025") {
      return apiError("NOT_FOUND", "Marker not found on this floor plan.", 404);
    }
    if (prismaErrorCode(error) === "P2003") {
      return apiError(
        "INVALID_RELATION",
        "A related record was not found.",
        422,
      );
    }
    return apiError("INTERNAL_SERVER_ERROR", "Failed to update marker.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authorizationError = await authorizeMutation(request);
  if (authorizationError) return authorizationError;

  const { id } = await params;
  const identifierError = invalidRouteId(id);
  if (identifierError) return identifierError;

  const { searchParams } = new URL(request.url);
  const parsed = floorPlanMarkerDeleteSchema.safeParse({
    markerId: searchParams.get("markerId"),
  });
  if (!parsed.success) return validationError(parsed.error);

  try {
    const marker = await prisma.floorPlanMarker.findFirst({
      where: { id: parsed.data.markerId, floorPlanId: id },
      select: { id: true },
    });
    if (!marker) {
      return apiError("NOT_FOUND", "Marker not found on this floor plan.", 404);
    }

    await prisma.floorPlanMarker.delete({
      where: { id: parsed.data.markerId },
    });
    return apiSuccess({ deleted: true });
  } catch (error: unknown) {
    if (prismaErrorCode(error) === "P2025") {
      return apiError("NOT_FOUND", "Marker not found on this floor plan.", 404);
    }
    return apiError("INTERNAL_SERVER_ERROR", "Failed to delete marker.", 500);
  }
}
