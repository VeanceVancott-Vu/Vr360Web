CREATE TABLE `floor_plans` (
  `id` VARCHAR(191) NOT NULL,
  `tourId` VARCHAR(191) NOT NULL,
  `titleVi` VARCHAR(160) NOT NULL,
  `titleEn` VARCHAR(160) NOT NULL,
  `imageUrl` VARCHAR(2048) NOT NULL,
  `isDefault` BOOLEAN NOT NULL DEFAULT false,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `floor_plans_tourId_sortOrder_idx` (`tourId`, `sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `floor_plan_markers` (
  `id` VARCHAR(191) NOT NULL,
  `floorPlanId` VARCHAR(191) NOT NULL,
  `sceneId` VARCHAR(191) NOT NULL,
  `x` DOUBLE NOT NULL,
  `y` DOUBLE NOT NULL,
  `labelVi` VARCHAR(160) NOT NULL,
  `labelEn` VARCHAR(160) NOT NULL,
  `icon` VARCHAR(64) NOT NULL DEFAULT 'MapPin',
  `colorTheme` VARCHAR(32) NOT NULL DEFAULT 'blue',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `floor_plan_markers_floorPlanId_idx` (`floorPlanId`),
  INDEX `floor_plan_markers_sceneId_idx` (`sceneId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `floor_plans`
  ADD CONSTRAINT `floor_plans_tourId_fkey` FOREIGN KEY (`tourId`) REFERENCES `tours` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `floor_plan_markers`
  ADD CONSTRAINT `floor_plan_markers_floorPlanId_fkey` FOREIGN KEY (`floorPlanId`) REFERENCES `floor_plans` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `floor_plan_markers_sceneId_fkey` FOREIGN KEY (`sceneId`) REFERENCES `scenes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;
