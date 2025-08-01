/*
  Warnings:

  - You are about to drop the column `region_id` on the `weekly_menu` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[day]` on the table `weekly_menu` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `weekly_menu` DROP FOREIGN KEY `weekly_menu_region_id_fkey`;

-- DropIndex
DROP INDEX `weekly_menu_day_region_id_key` ON `weekly_menu`;

-- DropIndex
DROP INDEX `weekly_menu_region_id_fkey` ON `weekly_menu`;

-- AlterTable
ALTER TABLE `weekly_menu` DROP COLUMN `region_id`;

-- CreateIndex
CREATE UNIQUE INDEX `weekly_menu_day_key` ON `weekly_menu`(`day`);
