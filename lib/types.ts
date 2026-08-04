export type Language = "vi" | "en";
export type PanoramaType = "EQUIRECTANGULAR" | "CUBEMAP" | "MULTIRES";
export type HotspotType =
  "SCENE_LINK" | "INFORMATION" | "IMAGE" | "AUDIO" | "EXTERNAL_LINK";

export interface LocalizedContent {
  titleVi: string;
  titleEn: string;
}

export interface CategoryDto {
  id: string;
  slug: string;
  nameVi: string;
  nameEn: string;
  icon: string;
  sortOrder: number;
}

export interface MediaDto {
  id: string;
  sceneId: string | null;
  type: "IMAGE" | "AUDIO" | "VIDEO";
  url: string;
  thumbnailUrl: string | null;
  titleVi: string;
  titleEn: string;
  attribution: string | null;
  sortOrder: number;
}

export interface HotspotDto {
  id: string;
  sceneId: string;
  type: HotspotType;
  pitch: number;
  yaw: number;
  labelVi: string;
  labelEn: string;
  contentVi: string | null;
  contentEn: string | null;
  icon: string | null;
  targetSceneId: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  externalUrl: string | null;
  sortOrder: number;
  isVisible: boolean;
}

export interface SceneDto extends LocalizedContent {
  id: string;
  tourId: string;
  categoryId: string;
  slug: string;
  shortDescriptionVi: string;
  shortDescriptionEn: string;
  fullDescriptionVi: string;
  fullDescriptionEn: string;
  panoramaType: PanoramaType;
  panoramaUrl: string | null;
  cubemapUrls?: string[] | null;
  multiresConfig: Record<string, unknown> | null;
  previewImageUrl: string;
  initialPitch: number;
  initialYaw: number;
  initialHfov: number;
  minimumHfov: number;
  maximumHfov: number;
  northOffset?: number | null;
  latitude: number;
  longitude: number;
  narrationAudioVi: string | null;
  narrationAudioEn: string | null;
  transcriptVi?: string | null;
  transcriptEn?: string | null;
  attribution: string | null;
  sortOrder: number;
  isPublished: boolean;
  hotspots: HotspotDto[];
  media: MediaDto[];
}

export interface FloorPlanMarkerDto {
  id: string;
  floorPlanId: string;
  sceneId: string;
  x: number;
  y: number;
  labelVi: string;
  labelEn: string;
  icon: string;
  colorTheme: string;
}

export interface FloorPlanDto {
  id: string;
  tourId: string;
  titleVi: string;
  titleEn: string;
  imageUrl: string;
  isDefault: boolean;
  sortOrder: number;
  markers: FloorPlanMarkerDto[];
}

export interface TourDto extends LocalizedContent {
  id: string;
  slug: string;
  descriptionVi: string;
  descriptionEn: string;
  coverImageUrl: string;
  welcomeImageUrl: string;
  defaultSceneId: string | null;
  isPublished: boolean;
  categories: CategoryDto[];
  scenes: SceneDto[];
  floorPlans?: FloorPlanDto[];
}

export const localized = (
  item: { titleVi: string; titleEn: string },
  language: Language,
) => (language === "vi" ? item.titleVi : item.titleEn);
