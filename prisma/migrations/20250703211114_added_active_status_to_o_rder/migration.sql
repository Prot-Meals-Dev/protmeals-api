-- AlterTable
ALTER TABLE `orders` MODIFY `status` ENUM('pending', 'active', 'paused', 'completed', 'cancelled') NOT NULL DEFAULT 'active';
