/*
  Warnings:

  - A unique constraint covering the columns `[day,region_id]` on the table `weekly_menu` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `region_id` to the `weekly_menu` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `weekly_menu_day_key` ON `weekly_menu`;

-- First, add the column as nullable
ALTER TABLE `weekly_menu` ADD COLUMN `region_id` VARCHAR(191);

-- Get the first region ID and update existing records
UPDATE `weekly_menu` SET `region_id` = (SELECT `id` FROM `regions` LIMIT 1) WHERE `region_id` IS NULL;

-- Now make the column NOT NULL
ALTER TABLE `weekly_menu` MODIFY COLUMN `region_id` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `weekly_menu_day_region_id_key` ON `weekly_menu`(`day`, `region_id`);

-- AddForeignKey
ALTER TABLE `weekly_menu` ADD CONSTRAINT `weekly_menu_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
