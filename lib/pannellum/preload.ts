import type { SceneDto } from "@/lib/types";

export interface NetworkInformationLike {
  effectiveType?: string;
  saveData?: boolean;
}

type NavigatorWithConnection = Navigator & {
  connection?: NetworkInformationLike;
};

type IdleWindow = Window & {
  cancelIdleCallback?: (handle: number) => void;
  requestIdleCallback?: (
    callback: () => void,
    options?: { timeout: number },
  ) => number;
};

const pendingImages = new Map<string, HTMLImageElement>();
const warmedUrls = new Set<string>();

export function panoramaAssetUrls(scene: SceneDto): string[] {
  const urls = [scene.previewImageUrl];

  if (scene.panoramaType === "EQUIRECTANGULAR" && scene.panoramaUrl) {
    urls.push(scene.panoramaUrl);
  } else if (scene.panoramaType === "CUBEMAP") {
    urls.push(...(scene.cubemapUrls ?? []));
  }

  return [...new Set(urls.filter((url) => url.trim().length > 0))];
}

export function allowsPreviewPrefetch(
  connection?: NetworkInformationLike,
  prefersReducedData = false,
) {
  if (prefersReducedData || connection?.saveData) return false;
  return !["slow-2g", "2g"].includes(connection?.effectiveType ?? "");
}

function warmUrls(urls: string[], priority: "high" | "low") {
  if (typeof window === "undefined") return;

  for (const url of urls) {
    const pending = pendingImages.get(url);
    if (pending) {
      if (priority === "high") pending.fetchPriority = "high";
      continue;
    }
    if (warmedUrls.has(url)) continue;

    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.fetchPriority = priority;
    image.onload = image.onerror = () => {
      pendingImages.delete(url);
      warmedUrls.add(url);
    };
    pendingImages.set(url, image);
    image.src = url;
  }
}

export function warmActivePanorama(scene: SceneDto) {
  warmUrls(panoramaAssetUrls(scene), "high");
}

export function scheduleNextPreview(scene: SceneDto): () => void {
  if (typeof window === "undefined") return () => undefined;

  const connection = (navigator as NavigatorWithConnection).connection;
  const prefersReducedData =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-data: reduce)").matches;
  if (!allowsPreviewPrefetch(connection, prefersReducedData)) {
    return () => undefined;
  }

  const idleWindow = window as IdleWindow;
  if (idleWindow.requestIdleCallback) {
    const handle = idleWindow.requestIdleCallback(
      () => warmUrls([scene.previewImageUrl], "low"),
      { timeout: 2_000 },
    );
    return () => idleWindow.cancelIdleCallback?.(handle);
  }

  const handle = window.setTimeout(
    () => warmUrls([scene.previewImageUrl], "low"),
    600,
  );
  return () => window.clearTimeout(handle);
}
