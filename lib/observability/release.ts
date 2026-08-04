import packageMetadata from "@/package.json";

type ReleaseEnvironment = Record<string, string | undefined>;

function validRelease(value: string | undefined): string | null {
  const candidate = value?.trim();
  if (!candidate || !/^[A-Za-z0-9._-]{1,64}$/.test(candidate)) return null;
  return candidate;
}

export function getReleaseIdentifier(
  environment: ReleaseEnvironment = process.env,
): string {
  const configured =
    validRelease(environment.APP_VERSION) ??
    validRelease(environment.VERCEL_GIT_COMMIT_SHA)?.slice(0, 12) ??
    validRelease(environment.GITHUB_SHA)?.slice(0, 12);
  return configured ?? packageMetadata.version;
}

export function healthResponseHeaders(release: string): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
    Expires: "0",
    Pragma: "no-cache",
    "X-DN360-Release": release,
  };
}
