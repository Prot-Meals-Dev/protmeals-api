/*
  Warnings:

  - You are about to alter the column `order_id` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(20)`.
  - A unique constraint covering the columns `[order_id]` on the table `orders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` MODIFY `order_id` VARCHAR(20) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `orders_order_id_key` ON `orders`(`order_id`);
