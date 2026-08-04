import { randomUUID } from "node:crypto";
import path from "node:path";
import { type NextRequest } from "next/server";

import { apiError, apiSuccess, zodFields } from "@/lib/api/response";
import { getAdminSession, isSameOrigin } from "@/lib/auth/session";
import {
  getMediaStorage,
  MediaStorageConfigurationError,
} from "@/lib/media/storage";
import { floorPlanUploadMetadataSchema } from "@/lib/validation/schemas";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_MULTIPART_OVERHEAD_BYTES = 1024 * 1024;
const extensionByContentType = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
} as const;

function isUploadFile(value: FormDataEntryValue | null): value is File {
  return Boolean(
    value &&
    typeof value === "object" &&
    "arrayBuffer" in value &&
    typeof value.arrayBuffer === "function" &&
    "name" in value &&
    typeof value.name === "string" &&
    "size" in value &&
    typeof value.size === "number" &&
    "type" in value &&
    typeof value.type === "string",
  );
}

function hasExpectedImageSignature(
  buffer: Buffer,
  contentType: keyof typeof extensionByContentType,
): boolean {
  if (contentType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (contentType === "image/png") {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session)
    return apiError("UNAUTHORIZED", "Authentication required.", 401);
  if (!isSameOrigin(request)) {
    return apiError(
      "INVALID_ORIGIN",
      "Cross-origin requests are not allowed.",
      403,
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_UPLOAD_BYTES + MAX_MULTIPART_OVERHEAD_BYTES
  ) {
    return apiError(
      "PAYLOAD_TOO_LARGE",
      "Floor plan images must be 10 MB or smaller.",
      413,
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!isUploadFile(file)) {
      return apiError("VALIDATION_ERROR", "No file provided for upload.", 422);
    }

    const metadata = floorPlanUploadMetadataSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    });
    if (!metadata.success) {
      return apiError(
        "VALIDATION_ERROR",
        "Use a PNG, JPEG, or WebP image no larger than 10 MB.",
        422,
        zodFields(metadata.error),
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasExpectedImageSignature(buffer, metadata.data.type)) {
      return apiError(
        "INVALID_FILE_CONTENT",
        "The uploaded file contents do not match its image type.",
        422,
      );
    }

    const extension = extensionByContentType[metadata.data.type];
    const originalExtension = path.extname(metadata.data.name);
    const safeName = metadata.data.name
      .slice(
        0,
        Math.max(0, metadata.data.name.length - originalExtension.length),
      )
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 80);
    const filename = `${safeName || "floor-plan"}_${randomUUID()}${extension}`;

    const storedMedia = await getMediaStorage().put(buffer, {
      directory: "floor-plans",
      fileName: filename,
      contentType: metadata.data.type,
    });

    return apiSuccess(storedMedia, { status: 201 });
  } catch (error) {
    if (error instanceof MediaStorageConfigurationError) {
      return apiError(
        "STORAGE_NOT_CONFIGURED",
        "Durable upload storage is not configured for this environment.",
        503,
      );
    }
    return apiError(
      "INTERNAL_SERVER_ERROR",
      "Failed to upload image file.",
      500,
    );
  }
}
