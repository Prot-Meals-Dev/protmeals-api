/*
  Warnings:

  - A unique constraint covering the columns `[provider_order_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `orders` ADD COLUMN `payment_status` ENUM('pending', 'paid', 'failed', 'refunded') NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `currency` VARCHAR(191) NOT NULL DEFAULT 'INR',
    ADD COLUMN `error_code` VARCHAR(191) NULL,
    ADD COLUMN `error_description` VARCHAR(191) NULL,
    ADD COLUMN `notes` JSON NULL,
    ADD COLUMN `provider` VARCHAR(191) NOT NULL DEFAULT 'razorpay',
    ADD COLUMN `provider_order_id` VARCHAR(191) NULL,
    ADD COLUMN `provider_payment_id` VARCHAR(191) NULL,
    ADD COLUMN `provider_signature` VARCHAR(191) NULL,
    ADD COLUMN `receipt` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `transactions_provider_order_id_key` ON `transactions`(`provider_order_id`);
