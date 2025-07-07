/*
  Warnings:

  - Added the required column `order_id` to the `daily_deliveries` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `daily_deliveries` ADD COLUMN `order_id` VARCHAR(191) NOT NULL;

-- AddForeignKey
ALTER TABLE `daily_deliveries` ADD CONSTRAINT `daily_deliveries_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
