-- AlterTable
ALTER TABLE `daily_deliveries` ADD COLUMN `status` ENUM('pending', 'skipped', 'delivered', 'cancelled', 'generated') NOT NULL DEFAULT 'pending';
