import { ZodError } from "zod";

import { apiError, zodFields } from "@/lib/api/response";

type AdminValidationCode = "VALIDATION_ERROR" | "INVALID_RELATION";

export class AdminValidationError extends Error {
  readonly code: AdminValidationCode;
  readonly fields?: Record<string, string[]>;

  constructor(
    message: string,
    fields?: Record<string, string[]>,
    code: AdminValidationCode = "VALIDATION_ERROR",
  ) {
    super(message);
    this.name = "AdminValidationError";
    this.code = code;
    this.fields = fields;
  }
}

export class AdminRecordNotFoundError extends Error {
  constructor(message = "Record not found.") {
    super(message);
    this.name = "AdminRecordNotFoundError";
  }
}

function prismaErrorCode(error: unknown): string | null {
  return typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
    ? error.code
    : null;
}

export function adminMutationErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(
      "VALIDATION_ERROR",
      "The record contains invalid fields.",
      422,
      zodFields(error),
    );
  }
  if (error instanceof AdminValidationError) {
    return apiError(error.code, error.message, 422, error.fields);
  }
  if (error instanceof AdminRecordNotFoundError) {
    return apiError("NOT_FOUND", error.message, 404);
  }

  switch (prismaErrorCode(error)) {
    case "P2002":
      return apiError(
        "DUPLICATE_RECORD",
        "A unique value already exists.",
        409,
      );
    case "P2003":
      return apiError(
        "INVALID_RELATION",
        "A related record is missing or prevents this operation.",
        422,
      );
    case "P2025":
      return apiError("NOT_FOUND", "Record not found.", 404);
    default:
      return null;
  }
}
