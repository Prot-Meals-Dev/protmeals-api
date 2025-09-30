-- Migration: Add remarks field to orders table
-- Date: 2025-09-27
-- Description: Adds an optional remarks field to store additional notes for orders

ALTER TABLE `orders` ADD COLUMN `remarks` TEXT DEFAULT NULL;