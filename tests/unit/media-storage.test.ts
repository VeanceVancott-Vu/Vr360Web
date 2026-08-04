import { PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createMediaStorage,
  LocalMediaStorage,
  MediaStorageConfigurationError,
  S3MediaStorage,
} from "@/lib/media/storage";

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("media storage resolution", () => {
  it("defaults to compatible local storage outside production", () => {
    expect(createMediaStorage({ NODE_ENV: "development" })).toBeInstanceOf(
      LocalMediaStorage,
    );
  });

  it("requires durable storage in production", () => {
    expect(() => createMediaStorage({ NODE_ENV: "production" })).toThrow(
      MediaStorageConfigurationError,
    );
    expect(() =>
      createMediaStorage({
        NODE_ENV: "production",
        MEDIA_STORAGE_DRIVER: "local",
      }),
    ).toThrow(/disabled in production/i);
  });

  it("validates paired static credentials", () => {
    expect(() =>
      createMediaStorage({
        NODE_ENV: "production",
        MEDIA_STORAGE_DRIVER: "s3",
        S3_REGION: "auto",
        S3_BUCKET: "tour-media",
        S3_PUBLIC_BASE_URL: "https://media.example.test",
        S3_ACCESS_KEY_ID: "access-only",
      }),
    ).toThrow(/must be set together/i);
  });

  it("creates an S3-compatible adapter from complete settings", () => {
    expect(
      createMediaStorage({
        NODE_ENV: "production",
        MEDIA_STORAGE_DRIVER: "s3",
        S3_REGION: "auto",
        S3_BUCKET: "tour-media",
        S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
        S3_PUBLIC_BASE_URL: "https://media.example.test",
        S3_ACCESS_KEY_ID: "access",
        S3_SECRET_ACCESS_KEY: "secret",
        S3_PREFIX: "uploads",
      }),
    ).toBeInstanceOf(S3MediaStorage);
  });
});

describe("media storage adapters", () => {
  it("keeps the existing relative URL shape for local development", async () => {
    const rootDirectory = await mkdtemp(
      path.join(tmpdir(), "vr360-media-storage-"),
    );
    temporaryDirectories.push(rootDirectory);
    const storage = new LocalMediaStorage({ rootDirectory });
    const bytes = Uint8Array.from([1, 2, 3]);

    const stored = await storage.put(bytes, {
      directory: "floor-plans",
      fileName: "safe-name.png",
      contentType: "image/png",
    });

    expect(stored.url).toBe("/uploads/floor-plans/safe-name.png");
    await expect(
      readFile(path.join(rootDirectory, "floor-plans", "safe-name.png")),
    ).resolves.toEqual(Buffer.from(bytes));
  });

  it("writes immutable objects and returns the configured public URL", async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = new S3MediaStorage({
      region: "auto",
      bucket: "tour-media",
      publicBaseUrl: "https://media.example.test",
      prefix: "uploads",
      client: { send } as unknown as S3Client,
    });

    const stored = await storage.put(Uint8Array.from([1, 2, 3]), {
      directory: "floor-plans",
      fileName: "safe-name.png",
      contentType: "image/png",
    });

    expect(stored.url).toBe(
      "https://media.example.test/uploads/floor-plans/safe-name.png",
    );
    const command = send.mock.calls[0]?.[0] as PutObjectCommand | undefined;
    expect(command).toBeInstanceOf(PutObjectCommand);
    expect(command?.input).toMatchObject({
      Bucket: "tour-media",
      Key: "uploads/floor-plans/safe-name.png",
      ContentType: "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    });
  });

  it("rejects traversal-like object names before storage access", async () => {
    const send = vi.fn().mockResolvedValue({});
    const storage = new S3MediaStorage({
      region: "auto",
      bucket: "tour-media",
      publicBaseUrl: "https://media.example.test",
      client: { send } as unknown as S3Client,
    });

    await expect(
      storage.put(Uint8Array.from([1]), {
        directory: "floor-plans",
        fileName: "../tour.png",
        contentType: "image/png",
      }),
    ).rejects.toBeInstanceOf(MediaStorageConfigurationError);
    expect(send).not.toHaveBeenCalled();
  });
});
