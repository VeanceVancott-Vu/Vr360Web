import "dotenv/config";
import { hash } from "bcryptjs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Prisma } from "../generated/prisma/client";
import { demoTour } from "../lib/demo-data";
import { prisma } from "../lib/database/client";

interface SeedEnvironment {
  ADMIN_SEED_EMAIL?: string;
  ADMIN_SEED_PASSWORD?: string;
}

export async function seed(
  environment: SeedEnvironment = {
    ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
    ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  },
) {
  const adminEmail = environment.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const adminPassword = environment.ADMIN_SEED_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 10) {
    throw new Error(
      "Set ADMIN_SEED_EMAIL and an ADMIN_SEED_PASSWORD of at least 10 characters before seeding.",
    );
  }

  // 1. Seed Admin User (update the password on every deliberate seed run)
  const passwordHash = await hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "ADMIN" },
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  // 2. Seed Categories (Create if not existing - NEVER overwrite user edits)
  for (const category of demoTour.categories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }

  // 3. Seed Tour without its default scene until all scene foreign keys exist.
  await prisma.tour.upsert({
    where: { id: demoTour.id },
    update: {},
    create: {
      id: demoTour.id,
      slug: demoTour.slug,
      titleVi: demoTour.titleVi,
      titleEn: demoTour.titleEn,
      descriptionVi: demoTour.descriptionVi,
      descriptionEn: demoTour.descriptionEn,
      coverImageUrl: demoTour.coverImageUrl,
      welcomeImageUrl: demoTour.welcomeImageUrl,
      isPublished: demoTour.isPublished,
    },
  });

  // 4. Seed every scene before records which may reference another scene.
  for (const scene of demoTour.scenes) {
    const {
      hotspots: _hotspots,
      media: _media,
      cubemapUrls: _cubemapUrls,
      northOffset: _northOffset,
      transcriptVi: _transcriptVi,
      transcriptEn: _transcriptEn,
      multiresConfig,
      ...sceneData
    } = scene;
    void _media;
    void _hotspots;
    void _cubemapUrls;
    void _northOffset;
    void _transcriptVi;
    void _transcriptEn;

    await prisma.scene.upsert({
      where: { id: scene.id },
      update: {},
      create: {
        ...sceneData,
        multiresConfig: multiresConfig
          ? (multiresConfig as Prisma.InputJsonValue)
          : Prisma.DbNull,
      },
    });
  }

  // 5. Seed scene children only after all hotspot target scenes exist.
  for (const scene of demoTour.scenes) {
    for (const hotspot of scene.hotspots) {
      await prisma.hotspot.upsert({
        where: { id: hotspot.id },
        update: {},
        create: hotspot,
      });
    }

    for (const media of scene.media) {
      await prisma.media.upsert({
        where: { id: media.id },
        update: {},
        create: media,
      });
    }
  }

  // 6. Seed Floor Plans (Create if not existing - NEVER overwrite user edits)
  for (const plan of demoTour.floorPlans ?? []) {
    const create = {
      id: plan.id,
      tourId: plan.tourId,
      titleVi: plan.titleVi,
      titleEn: plan.titleEn,
      imageUrl: plan.imageUrl,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
    };

    if (plan.isDefault) {
      await prisma.$transaction(async (transaction) => {
        const existingDefault = await transaction.floorPlan.findFirst({
          where: {
            tourId: plan.tourId,
            isDefault: true,
            id: { not: plan.id },
          },
          select: { id: true },
        });

        await transaction.floorPlan.upsert({
          where: { id: plan.id },
          update: {},
          create: { ...create, isDefault: existingDefault === null },
        });
      });
    } else {
      await prisma.floorPlan.upsert({
        where: { id: plan.id },
        update: {},
        create,
      });
    }

    for (const marker of plan.markers) {
      await prisma.floorPlanMarker.upsert({
        where: { id: marker.id },
        update: {},
        create: marker,
      });
    }
  }

  // 7. Assign the bundled default only after its scene has been seeded.
  await prisma.tour.update({
    where: { id: demoTour.id },
    data: { defaultSceneId: demoTour.defaultSceneId },
  });

  console.info(
    "Idempotent seed complete. Existing demo content fields were preserved.",
  );
}

const isDirectInvocation =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  seed()
    .catch((error: unknown) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
