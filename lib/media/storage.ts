import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { mkdir, unlink, writeFile } from "node:fs/promises";

import { sep as fileSystemSeparator } from "node:path";

export interface StoredMedia {
  url: string;
  thumbnailUrl?: string;
}

export interface MediaStoragePutOptions {
  directory: string;
  fileName: string;
  contentType: string;
}

export interface MediaStorage {
  put(
    file: Blob | Uint8Array,
    options: MediaStoragePutOptions,
  ): Promise<StoredMedia>;
  remove(url: string): Promise<void>;
}

export class MediaStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStorageConfigurationError";
  }
}

function assertSafePathSegment(value: string, label: string) {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_.-]*$/.test(value) ||
    value === "." ||
    value === ".." ||
    value.includes("..")
  ) {
    throw new MediaStorageConfigurationError(
      label + " contains unsupported path characters.",
    );
  }
}

async function toUint8Array(file: Blob | Uint8Array) {
  if (file instanceof Uint8Array) return file;
  return new Uint8Array(await file.arrayBuffer());
}

function fileSystemPath(root: string, ...segments: string[]) {
  return [
    root.replace(/[\\/]+$/g, ""),
    ...segments.map((segment) => segment.replace(/^[\\/]+|[\\/]+$/g, "")),
  ].join(fileSystemSeparator);
}

export interface LocalMediaStorageOptions {
  rootDirectory?: string;
  publicBasePath?: string;
}

/**
 * Development adapter that preserves the existing /uploads/floor-plans URL
 * format. The resolver never selects this adapter in production because an
 * application filesystem is commonly ephemeral.
 */
export class LocalMediaStorage implements MediaStorage {
  private readonly rootDirectory: string;
  private readonly publicBasePath: string;

  constructor(options: LocalMediaStorageOptions = {}) {
    this.rootDirectory =
      options.rootDirectory ??
      fileSystemPath(
        /* turbopackIgnore: true */ process.cwd(),
        "public",
        "uploads",
      );
    this.publicBasePath =
      "/" + (options.publicBasePath ?? "uploads").replace(/^\/+|\/+$/g, "");
  }

  async put(
    file: Blob | Uint8Array,
    options: MediaStoragePutOptions,
  ): Promise<StoredMedia> {
    assertSafePathSegment(options.directory, "Upload directory");
    assertSafePathSegment(options.fileName, "Upload file name");

    const targetDirectory = fileSystemPath(
      this.rootDirectory,
      options.directory,
    );
    const targetPath = fileSystemPath(targetDirectory, options.fileName);

    await mkdir(targetDirectory, { recursive: true });
    await writeFile(targetPath, await toUint8Array(file), { flag: "wx" });

    return {
      url:
        this.publicBasePath + "/" + options.directory + "/" + options.fileName,
    };
  }

  async remove(url: string): Promise<void> {
    const ownedPrefix = this.publicBasePath + "/";
    if (!url.startsWith(ownedPrefix)) {
      throw new MediaStorageConfigurationError(
        "The requested URL is not owned by local media storage.",
      );
    }

    const segments = url.slice(ownedPrefix.length).split("/");
    for (const segment of segments) {
      assertSafePathSegment(segment, "Media path");
    }

    const targetPath = fileSystemPath(this.rootDirectory, ...segments);
    await unlink(targetPath);
  }
}

export interface S3MediaStorageOptions {
  region: string;
  bucket: string;
  publicBaseUrl: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  prefix?: string;
  client?: S3Client;
}

function normalizeUrl(value: string, label: string) {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new MediaStorageConfigurationError(label + " must be a valid URL.");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new MediaStorageConfigurationError(
      label + " must use HTTP or HTTPS.",
    );
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new MediaStorageConfigurationError(
      label + " cannot contain credentials, a query, or a fragment.",
    );
  }
  return value.replace(/\/+$/g, "");
}

function normalizeObjectPrefix(value: string | undefined) {
  const prefix = (value ?? "uploads").split("/").filter(Boolean).join("/");
  if (prefix && !/^[a-zA-Z0-9/_-]+$/.test(prefix)) {
    throw new MediaStorageConfigurationError(
      "S3_PREFIX contains unsupported characters.",
    );
  }
  return prefix;
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export class S3MediaStorage implements MediaStorage {
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly prefix: string;
  private readonly client: S3Client;

  constructor(options: S3MediaStorageOptions) {
    this.bucket = options.bucket;
    this.publicBaseUrl = normalizeUrl(
      options.publicBaseUrl,
      "S3_PUBLIC_BASE_URL",
    );
    this.prefix = normalizeObjectPrefix(options.prefix);

    const clientConfig: S3ClientConfig = {
      region: options.region,
      forcePathStyle: options.forcePathStyle ?? false,
      ...(options.endpoint
        ? { endpoint: normalizeUrl(options.endpoint, "S3_ENDPOINT") }
        : {}),
      ...(options.accessKeyId && options.secretAccessKey
        ? {
            credentials: {
              accessKeyId: options.accessKeyId,
              secretAccessKey: options.secretAccessKey,
            },
          }
        : {}),
    };
    this.client = options.client ?? new S3Client(clientConfig);
  }

  private objectKey(options: MediaStoragePutOptions) {
    assertSafePathSegment(options.directory, "Upload directory");
    assertSafePathSegment(options.fileName, "Upload file name");
    return [this.prefix, options.directory, options.fileName]
      .filter(Boolean)
      .join("/");
  }

  async put(
    file: Blob | Uint8Array,
    options: MediaStoragePutOptions,
  ): Promise<StoredMedia> {
    const key = this.objectKey(options);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: await toUint8Array(file),
        ContentType: options.contentType,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    return {
      url: this.publicBaseUrl + "/" + encodeObjectKey(key),
    };
  }

  async remove(url: string): Promise<void> {
    const ownedPrefix = this.publicBaseUrl + "/";
    if (!url.startsWith(ownedPrefix)) {
      throw new MediaStorageConfigurationError(
        "The requested URL is not owned by S3 media storage.",
      );
    }
    const key = url
      .slice(ownedPrefix.length)
      .split("/")
      .map((segment) => decodeURIComponent(segment))
      .join("/");
    const requiredPrefix = this.prefix ? this.prefix + "/" : "";
    if (!key.startsWith(requiredPrefix) || key.includes("..")) {
      throw new MediaStorageConfigurationError(
        "The requested object is outside the configured storage prefix.",
      );
    }
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}

type StorageEnvironment = Record<string, string | undefined>;

function requiredEnvironmentValue(
  environment: StorageEnvironment,
  key: string,
) {
  const value = environment[key]?.trim();
  if (!value) {
    throw new MediaStorageConfigurationError(
      key + " is required when MEDIA_STORAGE_DRIVER=s3.",
    );
  }
  return value;
}

function optionalCredentials(environment: StorageEnvironment) {
  const accessKeyId = environment.S3_ACCESS_KEY_ID?.trim();
  const secretAccessKey = environment.S3_SECRET_ACCESS_KEY?.trim();
  if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
    throw new MediaStorageConfigurationError(
      "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be set together.",
    );
  }
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : {};
}

function resolveForcePathStyle(environment: StorageEnvironment) {
  const value = environment.S3_FORCE_PATH_STYLE?.trim() || "false";
  if (value !== "true" && value !== "false") {
    throw new MediaStorageConfigurationError(
      "S3_FORCE_PATH_STYLE must be true or false.",
    );
  }
  return value === "true";
}

export function createMediaStorage(
  environment: StorageEnvironment = process.env,
): MediaStorage {
  const configuredDriver = environment.MEDIA_STORAGE_DRIVER?.trim();
  const driver =
    configuredDriver ||
    (environment.NODE_ENV === "production" ? undefined : "local");

  if (!driver) {
    throw new MediaStorageConfigurationError(
      "MEDIA_STORAGE_DRIVER=s3 is required for production uploads.",
    );
  }
  if (driver === "local") {
    if (environment.NODE_ENV === "production") {
      throw new MediaStorageConfigurationError(
        "Local upload storage is disabled in production. Configure MEDIA_STORAGE_DRIVER=s3.",
      );
    }
    return new LocalMediaStorage();
  }
  if (driver !== "s3") {
    throw new MediaStorageConfigurationError(
      "MEDIA_STORAGE_DRIVER must be local or s3.",
    );
  }

  return new S3MediaStorage({
    region: requiredEnvironmentValue(environment, "S3_REGION"),
    bucket: requiredEnvironmentValue(environment, "S3_BUCKET"),
    publicBaseUrl: requiredEnvironmentValue(environment, "S3_PUBLIC_BASE_URL"),
    endpoint: environment.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: resolveForcePathStyle(environment),
    prefix: environment.S3_PREFIX,
    ...optionalCredentials(environment),
  });
}

let storage: MediaStorage | undefined;

export function getMediaStorage() {
  storage ??= createMediaStorage();
  return storage;
}
