import type { HotSpotConfig, ViewerConfig } from "pannellum";

import type { HotspotDto, Language, SceneDto } from "@/lib/types";

function panoramaKind(
  scene: SceneDto,
): "equirectangular" | "cubemap" | "multires" {
  if (scene.panoramaType === "CUBEMAP") return "cubemap";
  if (scene.panoramaType === "MULTIRES") return "multires";
  return "equirectangular";
}

function markerClass(hotspot: HotspotDto): string {
  const suffix = {
    SCENE_LINK: "link",
    INFORMATION: "information",
    IMAGE: "image",
    AUDIO: "audio",
    EXTERNAL_LINK: "external",
  }[hotspot.type];

  const extraStyles = hotspot.icon
    ?.split(" ")
    .filter((part) => part.startsWith("style-"))
    .join(" ");
  const styleClass = extraStyles ? ` ${extraStyles}` : "";

  return `hotspot-marker hotspot-marker--${suffix}${styleClass}`;
}

export function createHotspotConfig(
  hotspot: HotspotDto,
  language: Language,
  onHotspotClick: (hotspot: HotspotDto) => void,
): HotSpotConfig {
  const label = language === "vi" ? hotspot.labelVi : hotspot.labelEn;
  return {
    id: hotspot.id,
    pitch: hotspot.pitch,
    yaw: hotspot.yaw,
    cssClass: markerClass(hotspot),
    createTooltipArgs: { label },
    createTooltipFunc(element, args) {
      element.setAttribute("role", "button");
      element.setAttribute("tabindex", "0");
      element.setAttribute("aria-label", String(args.label ?? label));
      const tooltip = document.createElement("span");
      tooltip.className = "hotspot-label";
      tooltip.textContent = String(args.label ?? label);
      element.append(tooltip);
      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          element.click();
        }
      });
    },
    clickHandlerArgs: { hotspotId: hotspot.id },
    clickHandlerFunc(event) {
      event.preventDefault();
      event.stopPropagation();
      onHotspotClick(hotspot);
    },
  };
}

export function createViewerConfig(
  scene: SceneDto,
  language: Language,
  onHotspotClick: (hotspot: HotspotDto) => void,
): ViewerConfig {
  const type = panoramaKind(scene);
  const cubemapUrls =
    scene.cubemapUrls ??
    (Array.isArray(scene.multiresConfig?.cubemapUrls)
      ? (scene.multiresConfig.cubemapUrls as string[])
      : null);

  return {
    type,
    ...(type === "equirectangular" && scene.panoramaUrl
      ? { panorama: scene.panoramaUrl }
      : {}),
    ...(type === "cubemap" && cubemapUrls
      ? { cubeMap: cubemapUrls }
      : {}),
    ...(type === "multires" && scene.multiresConfig
      ? { multiRes: scene.multiresConfig }
      : {}),
    preview: scene.previewImageUrl,
    autoLoad: true,
    showControls: false,
    keyboardZoom: true,
    mouseZoom: true,
    draggable: true,
    pitch: scene.initialPitch,
    yaw: scene.initialYaw,
    hfov: scene.initialHfov,
    minHfov: scene.minimumHfov,
    maxHfov: scene.maximumHfov,
    compass: typeof scene.northOffset === "number",
    northOffset: scene.northOffset ?? 0,
    hotSpots: scene.hotspots
      .filter((hotspot) => hotspot.isVisible)
      .map((hotspot) => createHotspotConfig(hotspot, language, onHotspotClick)),
    strings:
      language === "vi"
        ? {
            loadButtonLabel: "Nhấn để tải ảnh toàn cảnh",
            loadingLabel: "Đang tải…",
            bylineLabel: "bởi %s",
            noPanoramaError: "Chưa cấu hình ảnh toàn cảnh.",
            fileAccessError: "Không thể mở ảnh toàn cảnh %s.",
            malformedURLError: "Địa chỉ ảnh toàn cảnh không hợp lệ.",
            iOS8WebGLError: "Thiết bị không hỗ trợ WebGL đầy đủ.",
            genericWebGLError: "Trình duyệt không hỗ trợ WebGL.",
            textureSizeError: "Ảnh toàn cảnh quá lớn cho thiết bị này.",
            unknownError: "Đã xảy ra lỗi không xác định.",
          }
        : {
            loadButtonLabel: "Click to load panorama",
            loadingLabel: "Loading…",
            bylineLabel: "by %s",
            noPanoramaError: "No panorama image is configured.",
            fileAccessError: "The panorama %s could not be opened.",
            malformedURLError: "The panorama address is invalid.",
            iOS8WebGLError: "This device has limited WebGL support.",
            genericWebGLError: "WebGL is unavailable.",
            textureSizeError: "The panorama is too large for this device.",
            unknownError: "An unknown error occurred.",
          },
  };
}
