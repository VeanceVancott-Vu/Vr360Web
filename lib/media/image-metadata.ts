export interface ImageDimensions {
  width: number;
  height: number;
}

export const MAX_IMAGE_DIMENSION = 16_384;
export const MAX_IMAGE_PIXELS = 40_000_000;

function pngDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 33 ||
    !buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) ||
    buffer.readUInt32BE(8) !== 13 ||
    buffer.subarray(12, 16).toString("ascii") !== "IHDR"
  ) {
    return null;
  }

  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  };
}

const jpegStartOfFrameMarkers = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 4 ||
    buffer[0] !== 0xff ||
    buffer[1] !== 0xd8 ||
    buffer[2] !== 0xff
  ) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length) {
    while (offset < buffer.length && buffer[offset] === 0xff) offset += 1;
    if (offset >= buffer.length) return null;

    const marker = buffer.readUInt8(offset);
    offset += 1;
    if (marker === 0xd9 || marker === 0xda) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (offset + 2 > buffer.length) return null;

    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) {
      return null;
    }
    if (jpegStartOfFrameMarkers.has(marker)) {
      if (segmentLength < 7) return null;
      return {
        height: buffer.readUInt16BE(offset + 3),
        width: buffer.readUInt16BE(offset + 5),
      };
    }
    offset += segmentLength;
  }

  return null;
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return (
    buffer.readUInt8(offset) |
    (buffer.readUInt8(offset + 1) << 8) |
    (buffer.readUInt8(offset + 2) << 16)
  );
}

function webpDimensions(buffer: Buffer): ImageDimensions | null {
  if (
    buffer.length < 20 ||
    buffer.subarray(0, 4).toString("ascii") !== "RIFF" ||
    buffer.subarray(8, 12).toString("ascii") !== "WEBP"
  ) {
    return null;
  }

  const chunkType = buffer.subarray(12, 16).toString("ascii");
  const chunkLength = buffer.readUInt32LE(16);
  if (chunkLength > buffer.length - 20) return null;

  if (chunkType === "VP8X") {
    if (chunkLength < 10 || buffer.length < 30) return null;
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1,
    };
  }
  if (chunkType === "VP8L") {
    if (chunkLength < 5 || buffer.length < 25 || buffer[20] !== 0x2f) {
      return null;
    }
    return {
      width: 1 + buffer.readUInt8(21) + ((buffer.readUInt8(22) & 0x3f) << 8),
      height:
        1 +
        ((buffer.readUInt8(22) & 0xc0) >> 6) +
        (buffer.readUInt8(23) << 2) +
        ((buffer.readUInt8(24) & 0x0f) << 10),
    };
  }
  if (chunkType === "VP8 ") {
    if (
      chunkLength < 10 ||
      buffer.length < 30 ||
      buffer[23] !== 0x9d ||
      buffer[24] !== 0x01 ||
      buffer[25] !== 0x2a
    ) {
      return null;
    }
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }

  return null;
}

export function readImageDimensions(
  buffer: Buffer,
  contentType: "image/jpeg" | "image/png" | "image/webp",
): ImageDimensions | null {
  const dimensions =
    contentType === "image/png"
      ? pngDimensions(buffer)
      : contentType === "image/jpeg"
        ? jpegDimensions(buffer)
        : webpDimensions(buffer);

  if (
    !dimensions ||
    !Number.isSafeInteger(dimensions.width) ||
    !Number.isSafeInteger(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    return null;
  }
  return dimensions;
}

export function hasSafeImageDimensions(dimensions: ImageDimensions): boolean {
  return (
    dimensions.width <= MAX_IMAGE_DIMENSION &&
    dimensions.height <= MAX_IMAGE_DIMENSION &&
    dimensions.width * dimensions.height <= MAX_IMAGE_PIXELS
  );
}
