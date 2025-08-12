/*
  Warnings:

  - Added the required column `meal_type` to the `daily_deliveries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `daily_deliveries` ADD COLUMN `meal_type` ENUM('breakfast', 'lunch', 'dinner') NOT NULL;
