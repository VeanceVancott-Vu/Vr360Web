export type MediaOriginEnvironment = Record<string, string | undefined>;

export interface MediaRemotePattern {
  protocol: "http" | "https";
  hostname: string;
  port: string;
  pathname: string;
}

function normalizedHttpOrigin(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

export function configuredMediaOrigins(
  environment: MediaOriginEnvironment = process.env,
): string[] {
  const configured = [
    environment.NEXT_PUBLIC_SITE_URL,
    environment.S3_PUBLIC_BASE_URL,
    ...(environment.MEDIA_ALLOWED_ORIGINS?.split(",") ?? []),
  ];

  return [
    ...new Set(
      configured
        .map((value) => normalizedHttpOrigin(value))
        .filter((origin): origin is string => origin !== null),
    ),
  ];
}

export function mediaRemotePattern(origin: string): MediaRemotePattern {
  const url = new URL(origin);
  return {
    protocol: url.protocol === "https:" ? "https" : "http",
    hostname: url.hostname,
    port: url.port,
    pathname: "/**",
  };
}

function isSafeRelativeMediaPath(value: string): boolean {
  return (
    value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
  );
}

function parsedHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export function isAllowedMediaUrl(
  value: string,
  environment?: MediaOriginEnvironment,
): boolean {
  if (isSafeRelativeMediaPath(value)) return true;

  const url = parsedHttpUrl(value);
  if (!url) return false;

  // Client validation cannot access server-only origin configuration. The API
  // performs the authoritative allow-list check with the runtime environment.
  if (environment === undefined && typeof window !== "undefined") return true;

  return configuredMediaOrigins(environment ?? process.env).includes(
    url.origin,
  );
}
