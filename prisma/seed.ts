import "dotenv/config";
import { hash } from "bcryptjs";

import { Prisma } from "../generated/prisma/client";
import { demoTour } from "../lib/demo-data";
import { prisma } from "../lib/database/client";

async function seed() {
  const adminEmail = process.env.ADMIN_SEED_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (!adminEmail || !adminPassword || adminPassword.length < 10) {
    throw new Error(
      "Set ADMIN_SEED_EMAIL and an ADMIN_SEED_PASSWORD of at least 10 characters before seeding.",
    );
  }

  // 1. Seed Admin User (Create if not existing)
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingUser) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: await hash(adminPassword, 12),
        role: "ADMIN",
      },
    });
  }

  // 2. Seed Categories (Create if not existing - NEVER overwrite user edits)
  for (const category of demoTour.categories) {
    const existing = await prisma.category.findUnique({ where: { id: category.id } });
    if (!existing) {
      await prisma.category.create({ data: category });
    }
  }

  // 3. Seed Tour (Create if not existing - NEVER overwrite user edits)
  const existingTour = await prisma.tour.findUnique({ where: { id: demoTour.id } });
  if (!existingTour) {
    await prisma.tour.create({
      data: {
        id: demoTour.id,
        slug: demoTour.slug,
        titleVi: demoTour.titleVi,
        titleEn: demoTour.titleEn,
        descriptionVi: demoTour.descriptionVi,
        descriptionEn: demoTour.descriptionEn,
        coverImageUrl: demoTour.coverImageUrl,
        welcomeImageUrl: demoTour.welcomeImageUrl,
        isPublished: true,
      },
    });
  }

  // 4. Seed Scenes (Create if not existing - NEVER overwrite user edits)
  for (const scene of demoTour.scenes) {
    const existingScene = await prisma.scene.findUnique({ where: { id: scene.id } });
    if (!existingScene) {
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
      await prisma.scene.create({
        data: {
          ...sceneData,
          multiresConfig: multiresConfig
            ? (multiresConfig as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      });
    }
  }

  // 5. Seed Floor Plans (Create if not existing - NEVER overwrite user edits)
  if (demoTour.floorPlans) {
    for (const plan of demoTour.floorPlans) {
      const existingPlan = await prisma.floorPlan.findUnique({ where: { id: plan.id } });
      if (!existingPlan) {
        await prisma.floorPlan.create({
          data: {
            id: plan.id,
            tourId: plan.tourId,
            titleVi: plan.titleVi,
            titleEn: plan.titleEn,
            imageUrl: plan.imageUrl,
            isDefault: plan.isDefault,
            sortOrder: plan.sortOrder,
          },
        });
      }

      for (const marker of plan.markers) {
        const existingMarker = await prisma.floorPlanMarker.findUnique({ where: { id: marker.id } });
        if (!existingMarker) {
          await prisma.floorPlanMarker.create({
            data: {
              id: marker.id,
              floorPlanId: plan.id,
              sceneId: marker.sceneId,
              x: marker.x,
              y: marker.y,
              labelVi: marker.labelVi,
              labelEn: marker.labelEn,
              icon: marker.icon,
              colorTheme: marker.colorTheme,
            },
          });
        }
      }
    }
  }

  console.info(
    `Non-destructive seed complete. All existing user data preserved.`,
  );
}

seed()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
