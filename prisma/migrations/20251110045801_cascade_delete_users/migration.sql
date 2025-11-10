-- DropForeignKey
ALTER TABLE `coupons` DROP FOREIGN KEY `coupons_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `daily_deliveries` DROP FOREIGN KEY `daily_deliveries_delivery_assignments_id_fkey`;

-- DropForeignKey
ALTER TABLE `daily_deliveries` DROP FOREIGN KEY `daily_deliveries_delivery_partner_id_fkey`;

-- DropForeignKey
ALTER TABLE `daily_deliveries` DROP FOREIGN KEY `daily_deliveries_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `daily_deliveries` DROP FOREIGN KEY `daily_deliveries_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `delivery_assignments` DROP FOREIGN KEY `delivery_assignments_assigned_by_fkey`;

-- DropForeignKey
ALTER TABLE `delivery_assignments` DROP FOREIGN KEY `delivery_assignments_delivery_partner_id_fkey`;

-- DropForeignKey
ALTER TABLE `delivery_assignments` DROP FOREIGN KEY `delivery_assignments_meal_id_fkey`;

-- DropForeignKey
ALTER TABLE `delivery_assignments` DROP FOREIGN KEY `delivery_assignments_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `order_meal_preferences` DROP FOREIGN KEY `order_meal_preferences_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `order_pauses` DROP FOREIGN KEY `order_pauses_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_coupon_id_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_meal_type_id_fkey`;

-- DropForeignKey
ALTER TABLE `orders` DROP FOREIGN KEY `orders_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_order_id_fkey`;

-- DropForeignKey
ALTER TABLE `transactions` DROP FOREIGN KEY `transactions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `user_otps` DROP FOREIGN KEY `user_otps_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_region_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_role_id_fkey`;

-- DropForeignKey
ALTER TABLE `weekly_menu` DROP FOREIGN KEY `weekly_menu_region_id_fkey`;

-- DropIndex
DROP INDEX `weekly_menu_region_id_fkey` ON `weekly_menu`;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_coupon_id_fkey` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_meal_type_id_fkey` FOREIGN KEY (`meal_type_id`) REFERENCES `meal_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_meal_preferences` ADD CONSTRAINT `order_meal_preferences_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_deliveries` ADD CONSTRAINT `daily_deliveries_delivery_assignments_id_fkey` FOREIGN KEY (`delivery_assignments_id`) REFERENCES `delivery_assignments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_deliveries` ADD CONSTRAINT `daily_deliveries_delivery_partner_id_fkey` FOREIGN KEY (`delivery_partner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_deliveries` ADD CONSTRAINT `daily_deliveries_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `daily_deliveries` ADD CONSTRAINT `daily_deliveries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_assigned_by_fkey` FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_delivery_partner_id_fkey` FOREIGN KEY (`delivery_partner_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_meal_id_fkey` FOREIGN KEY (`meal_id`) REFERENCES `meal_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_otps` ADD CONSTRAINT `user_otps_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_pauses` ADD CONSTRAINT `order_pauses_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `weekly_menu` ADD CONSTRAINT `weekly_menu_region_id_fkey` FOREIGN KEY (`region_id`) REFERENCES `regions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
