-- CreateTable
CREATE TABLE `weekly_menu` (
    `id` VARCHAR(191) NOT NULL,
    `day` VARCHAR(20) NOT NULL,
    `breakfast` TEXT NULL,
    `lunch` TEXT NULL,
    `dinner` TEXT NULL,
    `created_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `weekly_menu_day_key`(`day`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
