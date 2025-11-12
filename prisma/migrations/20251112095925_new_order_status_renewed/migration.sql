-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('pending', 'active', 'paused', 'completed', 'cancelled', 'renewed') NOT NULL DEFAULT 'active';
