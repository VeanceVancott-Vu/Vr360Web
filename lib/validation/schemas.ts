import { z } from "zod";

import { isAllowedMediaUrl } from "@/lib/media/origins";

const slug = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const databaseId = z.string().trim().min(1).max(191);

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .max(254)
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(10).max(128),
});

export const searchSchema = z.object({
  q: z.string().trim().min(2).max(80),
});

export const analyticsSchema = z
  .object({
    tourId: z.string().min(1).max(64),
    sceneId: z.string().min(1).max(64).nullable().optional(),
    eventType: z.enum([
      "TOUR_OPENED",
      "SCENE_OPENED",
      "HOTSPOT_CLICKED",
      "AUDIO_PLAYED",
    ]),
    sessionToken: z
      .string()
      .trim()
      .min(16)
      .max(128)
      .regex(/^[A-Za-z0-9_-]+$/),
  })
  .superRefine((event, context) => {
    if (event.eventType === "TOUR_OPENED" && event.sceneId != null) {
      context.addIssue({
        code: "custom",
        path: ["sceneId"],
        message: "TOUR_OPENED events must not include a scene.",
      });
    }
    if (event.eventType !== "TOUR_OPENED" && event.sceneId == null) {
      context.addIssue({
        code: "custom",
        path: ["sceneId"],
        message: event.eventType + " events require a scene.",
      });
    }
  });

const urlOrPath = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => isAllowedMediaUrl(value),
    "Use a local path or a URL from a configured media origin.",
  );

export const tourInputSchema = z.object({
  slug,
  titleVi: z.string().trim().min(2).max(160),
  titleEn: z.string().trim().min(2).max(160),
  descriptionVi: z.string().trim().min(10).max(5000),
  descriptionEn: z.string().trim().min(10).max(5000),
  coverImageUrl: urlOrPath,
  welcomeImageUrl: urlOrPath,
  defaultSceneId: databaseId.nullable().optional(),
  isPublished: z.boolean().default(false),
});

export const categoryInputSchema = z.object({
  slug,
  nameVi: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
  icon: z.string().trim().min(1).max(64),
  sortOrder: z.number().int().min(0).max(10000),
});

const cubemapConfigSchema = z.object({
  cubemapUrls: z.tuple([
    urlOrPath,
    urlOrPath,
    urlOrPath,
    urlOrPath,
    urlOrPath,
    urlOrPath,
  ]),
});

const multiresConfigSchema = z.object({
  basePath: urlOrPath,
  path: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(
      (value) =>
        ["%l", "%s", "%x", "%y"].every((token) => value.includes(token)),
      "The tile path must include %l, %s, %x, and %y placeholders.",
    ),
  fallbackPath: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine(
      (value) => value.includes("%s"),
      "The fallback path must include a %s placeholder.",
    )
    .optional(),
  extension: z
    .string()
    .trim()
    .min(1)
    .max(10)
    .regex(/^[a-zA-Z0-9]+$/, "Use a file extension without a leading dot."),
  tileResolution: z.number().int().min(1).max(16384),
  maxLevel: z.number().int().min(1).max(30),
  cubeResolution: z.number().int().min(1).max(262144),
});

export const sceneInputSchema = z
  .object({
    tourId: databaseId,
    categoryId: databaseId,
    slug,
    titleVi: z.string().trim().min(2).max(160),
    titleEn: z.string().trim().min(2).max(160),
    shortDescriptionVi: z.string().trim().min(4).max(300),
    shortDescriptionEn: z.string().trim().min(4).max(300),
    fullDescriptionVi: z.string().trim().min(10).max(8000),
    fullDescriptionEn: z.string().trim().min(10).max(8000),
    panoramaType: z.enum(["EQUIRECTANGULAR", "CUBEMAP", "MULTIRES"]),
    panoramaUrl: urlOrPath.nullable(),
    previewImageUrl: urlOrPath,
    multiresConfig: z.record(z.string(), z.unknown()).nullable().optional(),
    initialPitch: z.number().min(-90).max(90),
    initialYaw: z.number().min(-180).max(180),
    initialHfov: z.number().min(30).max(140),
    minimumHfov: z.number().min(20).max(120),
    maximumHfov: z.number().min(60).max(180),
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    narrationAudioVi: urlOrPath.nullable().optional(),
    narrationAudioEn: urlOrPath.nullable().optional(),
    attribution: z.string().trim().max(500).nullable().optional(),
    sortOrder: z.number().int().min(0).max(10000),
    isPublished: z.boolean().default(false),
  })
  .superRefine((scene, context) => {
    if (scene.minimumHfov > scene.initialHfov) {
      context.addIssue({
        code: "custom",
        path: ["initialHfov"],
        message: "Initial HFOV must be greater than or equal to minimum HFOV.",
      });
    }
    if (scene.initialHfov > scene.maximumHfov) {
      context.addIssue({
        code: "custom",
        path: ["initialHfov"],
        message: "Initial HFOV must be less than or equal to maximum HFOV.",
      });
    }

    if (scene.panoramaType === "EQUIRECTANGULAR" && !scene.panoramaUrl) {
      context.addIssue({
        code: "custom",
        path: ["panoramaUrl"],
        message: "An equirectangular panorama URL is required.",
      });
    }

    const configSchema =
      scene.panoramaType === "CUBEMAP"
        ? cubemapConfigSchema
        : scene.panoramaType === "MULTIRES"
          ? multiresConfigSchema
          : null;
    if (!configSchema) return;

    const result = configSchema.safeParse(scene.multiresConfig);
    if (!result.success) {
      for (const issue of result.error.issues) {
        context.addIssue({
          code: "custom",
          path: ["multiresConfig", ...issue.path],
          message:
            scene.panoramaType === "CUBEMAP"
              ? `Invalid cubemap configuration: ${issue.message}`
              : `Invalid multiresolution configuration: ${issue.message}`,
        });
      }
    }
  })
  .transform((scene) => {
    if (scene.panoramaType === "CUBEMAP") {
      return {
        ...scene,
        multiresConfig: cubemapConfigSchema.parse(scene.multiresConfig),
      };
    }
    if (scene.panoramaType === "MULTIRES") {
      return {
        ...scene,
        multiresConfig: multiresConfigSchema.parse(scene.multiresConfig),
      };
    }
    return scene;
  });

const hotspotBase = z.object({
  sceneId: z.string().min(1),
  pitch: z.number().min(-90).max(90),
  yaw: z.number().min(-180).max(180),
  labelVi: z.string().trim().min(1).max(160),
  labelEn: z.string().trim().min(1).max(160),
  contentVi: z.string().trim().max(5000).nullable().optional(),
  contentEn: z.string().trim().max(5000).nullable().optional(),
  icon: z.string().trim().max(64).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000),
  isVisible: z.boolean().default(true),
});

export const hotspotInputSchema = z.discriminatedUnion("type", [
  hotspotBase.extend({
    type: z.literal("SCENE_LINK"),
    targetSceneId: z.string().min(1),
    imageUrl: z.null().optional(),
    audioUrl: z.null().optional(),
    externalUrl: z.null().optional(),
  }),
  hotspotBase.extend({
    type: z.literal("INFORMATION"),
    targetSceneId: z.null().optional(),
    imageUrl: urlOrPath.nullable().optional(),
    audioUrl: z.null().optional(),
    externalUrl: z.null().optional(),
  }),
  hotspotBase.extend({
    type: z.literal("IMAGE"),
    targetSceneId: z.null().optional(),
    imageUrl: urlOrPath,
    audioUrl: z.null().optional(),
    externalUrl: z.null().optional(),
  }),
  hotspotBase.extend({
    type: z.literal("AUDIO"),
    targetSceneId: z.null().optional(),
    imageUrl: z.null().optional(),
    audioUrl: urlOrPath,
    externalUrl: z.null().optional(),
  }),
  hotspotBase.extend({
    type: z.literal("EXTERNAL_LINK"),
    targetSceneId: z.null().optional(),
    imageUrl: z.null().optional(),
    audioUrl: z.null().optional(),
    externalUrl: z.url().refine((value) => {
      const protocol = new URL(value).protocol;
      return protocol === "http:" || protocol === "https:";
    }),
  }),
]);

export const mediaInputSchema = z.object({
  sceneId: z.string().nullable().optional(),
  type: z.enum(["IMAGE", "AUDIO", "VIDEO"]),
  url: urlOrPath,
  thumbnailUrl: urlOrPath.nullable().optional(),
  titleVi: z.string().trim().min(1).max(160),
  titleEn: z.string().trim().min(1).max(160),
  attribution: z.string().trim().max(500).nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000),
});

export const floorPlanInputSchema = z.object({
  tourId: z.string().min(1),
  titleVi: z.string().trim().min(2).max(160),
  titleEn: z.string().trim().min(2).max(160),
  imageUrl: urlOrPath,
  isDefault: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10000),
});

const floorPlanMarkerFields = {
  sceneId: databaseId,
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  labelVi: z.string().trim().min(1).max(160),
  labelEn: z.string().trim().min(1).max(160),
  icon: z.string().trim().min(1).max(64).default("MapPin"),
  colorTheme: z.string().trim().min(1).max(32).default("blue"),
};

export const floorPlanMarkerInputSchema = z
  .object({
    floorPlanId: databaseId,
    ...floorPlanMarkerFields,
  })
  .strict();

export const floorPlanMarkerUpdateSchema = z
  .object({
    markerId: databaseId,
    floorPlanId: databaseId.optional(),
    sceneId: floorPlanMarkerFields.sceneId.optional(),
    x: floorPlanMarkerFields.x.optional(),
    y: floorPlanMarkerFields.y.optional(),
    labelVi: floorPlanMarkerFields.labelVi.optional(),
    labelEn: floorPlanMarkerFields.labelEn.optional(),
    icon: floorPlanMarkerFields.icon.optional(),
    colorTheme: floorPlanMarkerFields.colorTheme.optional(),
  })
  .strict()
  .refine(
    (value) =>
      [
        value.sceneId,
        value.x,
        value.y,
        value.labelVi,
        value.labelEn,
        value.icon,
        value.colorTheme,
      ].some((field) => field !== undefined),
    { message: "Provide at least one marker field to update." },
  );

export const floorPlanMarkerDeleteSchema = z
  .object({ markerId: databaseId })
  .strict();

export const floorPlanUploadMetadataSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    size: z
      .number()
      .int()
      .min(1)
      .max(10 * 1024 * 1024),
    type: z.enum(["image/png", "image/jpeg", "image/webp"]),
  })
  .strict();
