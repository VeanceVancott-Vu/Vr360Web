const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

export function isSafeExternalUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

export function parseSceneSlug(
  value: string | null | undefined,
  availableSlugs: readonly string[],
  fallbackSlug: string,
): string {
  if (!value) return fallbackSlug;
  return availableSlugs.includes(value) ? value : fallbackSlug;
}

export function sceneHref(
  pathname: string,
  sceneSlug: string,
  language: "vi" | "en",
): string {
  const params = new URLSearchParams({ scene: sceneSlug, lang: language });
  return `${pathname}?${params.toString()}`;
}
