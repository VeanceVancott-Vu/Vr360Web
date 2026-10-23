
import { randomUUID } from "node:crypto";

import {
  getAdminSession,
  isSameOrigin,
} from "@/lib/auth/session";
import {
  apiError,
  apiSuccess,
} from "@/lib/api/response";
import {
  getMediaStorage,
  MediaStorageConfigurationError,
} from "@/lib/media/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function detectImageType(
  bytes: Uint8Array,
): { contentType: string; extension: string } | null {
  // JPEG
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { contentType: "image/jpeg", extension: "jpg" };
  }

  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { contentType: "image/png", extension: "png" };
  }

  // WebP
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { contentType: "image/webp", extension: "webp" };
  }

  return null;
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return apiError(
      "UNAUTHORIZED",
      "Sign in is required.",
      401,
    );
  }

  if (!isSameOrigin(request)) {
    return apiError(
      "INVALID_ORIGIN",
      "Cross-origin requests are not allowed.",
      403,
    );
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return apiError(
      "INVALID_FORM_DATA",
      "The upload form is invalid.",
      400,
    );
  }

  const file = formData.get("file");
  const slugValue = formData.get("tourSlug");
  const kindValue = formData.get("kind");

  if (!(file instanceof File) || file.size === 0) {
    return apiError(
      "MISSING_FILE",
      "Please choose an image.",
      400,
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return apiError(
      "FILE_TOO_LARGE",
      "The image must be 25 MB or smaller.",
      413,
    );
  }

  const tourSlug =
    typeof slugValue === "string" ? slugValue.trim() : "";

  if (
    tourSlug.length > 80 ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tourSlug)
  ) {
    return apiError(
      "INVALID_TOUR_SLUG",
      "Enter a valid tour slug before uploading.",
      422,
    );
  }

  const allowedKinds = [
    "cover",
    "welcome",
    "scene-preview",
    "panorama",
  ] as const;

  if (
    typeof kindValue !== "string" ||
    !(allowedKinds as readonly string[]).includes(kindValue)
  ) {
    return apiError(
      "INVALID_IMAGE_KIND",
      "Unsupported image type.",
      400,
    );
  }

  try {
    // Inspect the actual file signature, not just the browser's
    // claimed MIME type or filename extension.
    const header = new Uint8Array(
      await file.slice(0, 12).arrayBuffer(),
    );

    const imageType = detectImageType(header);

    if (!imageType) {
      return apiError(
        "INVALID_FILE_TYPE",
        "Choose a valid JPEG, PNG, or WebP image.",
        415,
      );
    }

    const fileBytes = new Uint8Array(
      await file.arrayBuffer(),
    );

    const storage = getMediaStorage();

    const isSceneImage =
      kindValue === "scene-preview" || kindValue === "panorama";

    const stored = await storage.put(fileBytes, {
      directory: isSceneImage
        ? `tours/${tourSlug}/scenes`
        : `tours/${tourSlug}`,
      fileName: `${kindValue}-${randomUUID()}.${imageType.extension}`,
      contentType: imageType.contentType,
    });

    return apiSuccess(
      {
        url: stored.url,
        originalFileName: file.name,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof MediaStorageConfigurationError) {
      return apiError(
        "MEDIA_STORAGE_NOT_CONFIGURED",
        error.message,
        503,
      );
    }

    console.error("Tour image upload failed", error);

    return apiError(
      "UPLOAD_FAILED",
      "Unable to upload the image.",
      500,
    );
  }
}
