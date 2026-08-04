CREATE TABLE `users` (
  `id` VARCHAR(191) NOT NULL,
  `email` VARCHAR(254) NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `users_email_key` (`email`),
  INDEX `users_role_idx` (`role`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tours` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(80) NOT NULL,
  `titleVi` VARCHAR(160) NOT NULL,
  `titleEn` VARCHAR(160) NOT NULL,
  `descriptionVi` TEXT NOT NULL,
  `descriptionEn` TEXT NOT NULL,
  `coverImageUrl` VARCHAR(2048) NOT NULL,
  `welcomeImageUrl` VARCHAR(2048) NOT NULL,
  `defaultSceneId` VARCHAR(191) NULL,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `tours_slug_key` (`slug`),
  UNIQUE INDEX `tours_defaultSceneId_key` (`defaultSceneId`),
  INDEX `tours_slug_idx` (`slug`),
  INDEX `tours_isPublished_createdAt_idx` (`isPublished`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `categories` (
  `id` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(80) NOT NULL,
  `nameVi` VARCHAR(120) NOT NULL,
  `nameEn` VARCHAR(120) NOT NULL,
  `icon` VARCHAR(64) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `categories_slug_key` (`slug`),
  INDEX `categories_slug_idx` (`slug`),
  INDEX `categories_sortOrder_idx` (`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `scenes` (
  `id` VARCHAR(191) NOT NULL,
  `tourId` VARCHAR(191) NOT NULL,
  `categoryId` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(80) NOT NULL,
  `titleVi` VARCHAR(160) NOT NULL,
  `titleEn` VARCHAR(160) NOT NULL,
  `shortDescriptionVi` VARCHAR(300) NOT NULL,
  `shortDescriptionEn` VARCHAR(300) NOT NULL,
  `fullDescriptionVi` TEXT NOT NULL,
  `fullDescriptionEn` TEXT NOT NULL,
  `panoramaType` ENUM('EQUIRECTANGULAR', 'CUBEMAP', 'MULTIRES') NOT NULL DEFAULT 'EQUIRECTANGULAR',
  `panoramaUrl` VARCHAR(2048) NULL,
  `previewImageUrl` VARCHAR(2048) NOT NULL,
  `multiresConfig` JSON NULL,
  `initialPitch` DOUBLE NOT NULL DEFAULT 0,
  `initialYaw` DOUBLE NOT NULL DEFAULT 0,
  `initialHfov` DOUBLE NOT NULL DEFAULT 90,
  `minimumHfov` DOUBLE NOT NULL DEFAULT 45,
  `maximumHfov` DOUBLE NOT NULL DEFAULT 120,
  `latitude` DOUBLE NOT NULL,
  `longitude` DOUBLE NOT NULL,
  `narrationAudioVi` VARCHAR(2048) NULL,
  `narrationAudioEn` VARCHAR(2048) NULL,
  `attribution` VARCHAR(500) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isPublished` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  UNIQUE INDEX `scenes_tourId_slug_key` (`tourId`, `slug`),
  INDEX `scenes_tourId_isPublished_sortOrder_idx` (`tourId`, `isPublished`, `sortOrder`),
  INDEX `scenes_categoryId_isPublished_sortOrder_idx` (`categoryId`, `isPublished`, `sortOrder`),
  INDEX `scenes_slug_idx` (`slug`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `hotspots` (
  `id` VARCHAR(191) NOT NULL,
  `sceneId` VARCHAR(191) NOT NULL,
  `type` ENUM('SCENE_LINK', 'INFORMATION', 'IMAGE', 'AUDIO', 'EXTERNAL_LINK') NOT NULL,
  `pitch` DOUBLE NOT NULL,
  `yaw` DOUBLE NOT NULL,
  `labelVi` VARCHAR(160) NOT NULL,
  `labelEn` VARCHAR(160) NOT NULL,
  `contentVi` TEXT NULL,
  `contentEn` TEXT NULL,
  `icon` VARCHAR(64) NULL,
  `targetSceneId` VARCHAR(191) NULL,
  `imageUrl` VARCHAR(2048) NULL,
  `audioUrl` VARCHAR(2048) NULL,
  `externalUrl` VARCHAR(2048) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isVisible` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `hotspots_sceneId_isVisible_sortOrder_idx` (`sceneId`, `isVisible`, `sortOrder`),
  INDEX `hotspots_targetSceneId_idx` (`targetSceneId`),
  INDEX `hotspots_type_idx` (`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `media` (
  `id` VARCHAR(191) NOT NULL,
  `sceneId` VARCHAR(191) NULL,
  `type` ENUM('IMAGE', 'AUDIO', 'VIDEO') NOT NULL,
  `url` VARCHAR(2048) NOT NULL,
  `thumbnailUrl` VARCHAR(2048) NULL,
  `titleVi` VARCHAR(160) NOT NULL,
  `titleEn` VARCHAR(160) NOT NULL,
  `attribution` VARCHAR(500) NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `media_sceneId_sortOrder_idx` (`sceneId`, `sortOrder`),
  INDEX `media_type_idx` (`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `tour_view_events` (
  `id` VARCHAR(191) NOT NULL,
  `tourId` VARCHAR(191) NOT NULL,
  `sceneId` VARCHAR(191) NULL,
  `eventType` VARCHAR(40) NOT NULL,
  `anonymousSessionId` VARCHAR(64) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `tour_view_events_tourId_createdAt_idx` (`tourId`, `createdAt`),
  INDEX `tour_view_events_sceneId_createdAt_idx` (`sceneId`, `createdAt`),
  INDEX `tour_view_events_anonymousSessionId_createdAt_idx` (`anonymousSessionId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `scenes`
  ADD CONSTRAINT `scenes_tourId_fkey` FOREIGN KEY (`tourId`) REFERENCES `tours` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `scenes_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `tours`
  ADD CONSTRAINT `tours_defaultSceneId_fkey` FOREIGN KEY (`defaultSceneId`) REFERENCES `scenes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `hotspots`
  ADD CONSTRAINT `hotspots_sceneId_fkey` FOREIGN KEY (`sceneId`) REFERENCES `scenes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `hotspots_targetSceneId_fkey` FOREIGN KEY (`targetSceneId`) REFERENCES `scenes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `media`
  ADD CONSTRAINT `media_sceneId_fkey` FOREIGN KEY (`sceneId`) REFERENCES `scenes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `tour_view_events`
  ADD CONSTRAINT `tour_view_events_tourId_fkey` FOREIGN KEY (`tourId`) REFERENCES `tours` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `tour_view_events_sceneId_fkey` FOREIGN KEY (`sceneId`) REFERENCES `scenes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
