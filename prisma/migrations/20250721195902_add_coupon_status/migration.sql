/*
  Warnings:

  - A unique constraint covering the columns `[text]` on the table `coupons` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `coupons` ADD COLUMN `status` ENUM('active', 'used', 'expired') NOT NULL DEFAULT 'active';

-- CreateIndex
CREATE UNIQUE INDEX `coupons_text_key` ON `coupons`(`text`);
