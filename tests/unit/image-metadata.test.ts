import { describe, expect, it } from "vitest";

import {
  hasSafeImageDimensions,
  readImageDimensions,
} from "@/lib/media/image-metadata";

function pngHeader(width: number, height: number) {
  const buffer = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(13, 8);
  buffer.write("IHDR", 12, "ascii");
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

function jpegHeader(width: number, height: number) {
  const buffer = Buffer.alloc(21);
  Buffer.from([0xff, 0xd8, 0xff, 0xc0]).copy(buffer);
  buffer.writeUInt16BE(17, 4);
  buffer.writeUInt8(8, 6);
  buffer.writeUInt16BE(height, 7);
  buffer.writeUInt16BE(width, 9);
  buffer.writeUInt8(3, 11);
  return buffer;
}

function writeUInt24LE(buffer: Buffer, value: number, offset: number) {
  buffer.writeUInt8(value & 0xff, offset);
  buffer.writeUInt8((value >>> 8) & 0xff, offset + 1);
  buffer.writeUInt8((value >>> 16) & 0xff, offset + 2);
}

function webpExtendedHeader(width: number, height: number) {
  const buffer = Buffer.alloc(30);
  buffer.write("RIFF", 0, "ascii");
  buffer.writeUInt32LE(22, 4);
  buffer.write("WEBP", 8, "ascii");
  buffer.write("VP8X", 12, "ascii");
  buffer.writeUInt32LE(10, 16);
  writeUInt24LE(buffer, width - 1, 24);
  writeUInt24LE(buffer, height - 1, 27);
  return buffer;
}

describe("image metadata", () => {
  it("reads PNG, JPEG, and WebP dimensions", () => {
    expect(readImageDimensions(pngHeader(1200, 800), "image/png")).toEqual({
      width: 1200,
      height: 800,
    });
    expect(readImageDimensions(jpegHeader(1600, 900), "image/jpeg")).toEqual({
      width: 1600,
      height: 900,
    });
    expect(
      readImageDimensions(webpExtendedHeader(2048, 1024), "image/webp"),
    ).toEqual({ width: 2048, height: 1024 });
  });

  it("rejects incomplete headers and unsafe total pixel counts", () => {
    expect(
      readImageDimensions(Buffer.from([0x89, 0x50, 0x4e, 0x47]), "image/png"),
    ).toBeNull();
    expect(hasSafeImageDimensions({ width: 8000, height: 6000 })).toBe(false);
  });
});
