-- ====================================================
-- MUNICIPAL COMMUNITY TOOL AND EQUIPMENT BANK (MCTEB)
-- Municipality of Basco, Batanes
-- Database Schema for Future MySQL Migration
-- ====================================================

CREATE DATABASE IF NOT EXISTS `basco_mcteb`
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `basco_mcteb`;

-- ----------------------------------------------------
-- 1. Users Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` VARCHAR(32) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `middle_name` VARCHAR(100) NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `birthday` DATE NOT NULL,
  `age` INT NOT NULL,
  `contact_number` VARCHAR(20) NOT NULL,
  `house_number` VARCHAR(50) NOT NULL,
  `street` VARCHAR(150) NOT NULL,
  `barangay` ENUM(
    'Ihuvok I (Kaychanarianan)',
    'Ihuvok II (Kayvaluganan)',
    'San Antonio',
    'San Joaquin',
    'Chanarian',
    'Kayhuvokan'
  ) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role` ENUM('Administrator', 'Municipal Staff', 'Borrower') NOT NULL DEFAULT 'Borrower',
  `status` ENUM('Active', 'Pending Verification', 'Suspended') NOT NULL DEFAULT 'Active',
  `avatar` VARCHAR(255) NULL,
  `failed_login_attempts` INT NOT NULL DEFAULT 0,
  `locked_until` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role`),
  INDEX `idx_users_barangay` (`barangay`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 2. Tools and Equipment Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `tools` (
  `tool_id` VARCHAR(32) NOT NULL,
  `tool_name` VARCHAR(150) NOT NULL,
  `category` ENUM(
    'Agricultural Tools',
    'Fishing Equipment',
    'Carpentry Tools',
    'Construction Tools',
    'Electrical Tools',
    'Mechanical Tools',
    'Emergency Response Equipment'
  ) NOT NULL,
  `description` TEXT NOT NULL,
  `specifications` TEXT NOT NULL,
  `availability_status` ENUM(
    'Available',
    'Reserved',
    'Borrowed',
    'Returned',
    'Maintenance',
    'Damaged',
    'Archived'
  ) NOT NULL DEFAULT 'Available',
  `equipment_condition` ENUM(
    'Excellent',
    'Good',
    'Fair',
    'Needs Repair',
    'Under Maintenance'
  ) NOT NULL DEFAULT 'Good',
  `rental_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `deposit_fee` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `quantity_total` INT NOT NULL DEFAULT 1,
  `quantity_available` INT NOT NULL DEFAULT 1,
  `image_path` VARCHAR(255) NULL,
  `serial_number` VARCHAR(100) NULL,
  `acquisition_date` DATE NULL,
  `total_times_borrowed` INT NOT NULL DEFAULT 0,
  `is_archived` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tool_id`),
  INDEX `idx_tools_category` (`category`),
  INDEX `idx_tools_status` (`availability_status`),
  INDEX `idx_tools_condition` (`equipment_condition`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 3. Reservations Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `reservations` (
  `reservation_id` VARCHAR(32) NOT NULL,
  `user_id` VARCHAR(32) NOT NULL,
  `tool_id` VARCHAR(32) NOT NULL,
  `reservation_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `pickup_date` DATE NOT NULL,
  `return_date` DATE NOT NULL,
  `purpose` TEXT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected', 'Cancelled', 'Completed') NOT NULL DEFAULT 'Pending',
  `staff_notes` TEXT NULL,
  `reviewed_by` VARCHAR(32) NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`reservation_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`tool_id`) REFERENCES `tools`(`tool_id`) ON DELETE CASCADE,
  INDEX `idx_reservations_user` (`user_id`),
  INDEX `idx_reservations_tool` (`tool_id`),
  INDEX `idx_reservations_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 4. Rentals Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `rentals` (
  `rental_id` VARCHAR(32) NOT NULL,
  `reservation_id` VARCHAR(32) NULL,
  `user_id` VARCHAR(32) NOT NULL,
  `tool_id` VARCHAR(32) NOT NULL,
  `rental_date` DATETIME NOT NULL,
  `due_date` DATE NOT NULL,
  `actual_return_date` DATETIME NULL,
  `rental_status` ENUM('Pending', 'Reserved', 'Borrowed', 'Returned', 'Completed') NOT NULL DEFAULT 'Borrowed',
  `initial_condition` VARCHAR(50) NOT NULL DEFAULT 'Good',
  `returned_condition` VARCHAR(50) NULL,
  `released_by` VARCHAR(32) NOT NULL,
  `received_by` VARCHAR(32) NULL,
  `inspection_notes` TEXT NULL,
  `overdue_penalty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `damage_penalty` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`rental_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`tool_id`) REFERENCES `tools`(`tool_id`) ON DELETE CASCADE,
  INDEX `idx_rentals_user` (`user_id`),
  INDEX `idx_rentals_status` (`rental_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 5. Payments Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `payments` (
  `payment_id` VARCHAR(32) NOT NULL,
  `receipt_id` VARCHAR(32) NOT NULL UNIQUE,
  `user_id` VARCHAR(32) NOT NULL,
  `reservation_id` VARCHAR(32) NULL,
  `rental_id` VARCHAR(32) NULL,
  `tool_id` VARCHAR(32) NOT NULL,
  `amount` DECIMAL(10,2) NOT NULL,
  `reference_number` VARCHAR(100) NOT NULL,
  `payment_method` ENUM('GCash', 'Maya', 'Bank Transfer (Landbank/BDO)', 'Cash at Municipal Treasury') NOT NULL,
  `payment_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `payment_status` ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
  `proof_image` VARCHAR(255) NULL,
  `verified_by` VARCHAR(32) NULL,
  `verified_at` DATETIME NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_payments_receipt` (`receipt_id`),
  INDEX `idx_payments_status` (`payment_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 6. Maintenance & Damage Reports Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `maintenance` (
  `maintenance_id` VARCHAR(32) NOT NULL,
  `tool_id` VARCHAR(32) NOT NULL,
  `reported_by` VARCHAR(32) NOT NULL,
  `rental_id` VARCHAR(32) NULL,
  `issue_description` TEXT NOT NULL,
  `severity` ENUM('Minor', 'Moderate', 'Severe', 'Critical') NOT NULL DEFAULT 'Moderate',
  `status` ENUM('Reported', 'Scheduled', 'In Progress', 'Completed', 'Decommissioned') NOT NULL DEFAULT 'Reported',
  `assigned_technician` VARCHAR(150) NULL,
  `estimated_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `actual_cost` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  `scheduled_date` DATE NULL,
  `completed_date` DATE NULL,
  `resolution_notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`maintenance_id`),
  FOREIGN KEY (`tool_id`) REFERENCES `tools`(`tool_id`) ON DELETE CASCADE,
  INDEX `idx_maintenance_tool` (`tool_id`),
  INDEX `idx_maintenance_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 7. Feedback & Reviews Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `feedback` (
  `feedback_id` VARCHAR(32) NOT NULL,
  `rental_id` VARCHAR(32) NULL,
  `tool_id` VARCHAR(32) NOT NULL,
  `user_id` VARCHAR(32) NOT NULL,
  `rating` INT NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `tool_condition_rating` INT NOT NULL CHECK (`tool_condition_rating` BETWEEN 1 AND 5),
  `service_rating` INT NOT NULL CHECK (`service_rating` BETWEEN 1 AND 5),
  `comments` TEXT NULL,
  `is_public` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`feedback_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  FOREIGN KEY (`tool_id`) REFERENCES `tools`(`tool_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 8. Notifications Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `notification_id` VARCHAR(32) NOT NULL,
  `user_id` VARCHAR(32) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `message` TEXT NOT NULL,
  `type` ENUM('info', 'success', 'warning', 'danger') NOT NULL DEFAULT 'info',
  `link` VARCHAR(255) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`notification_id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`user_id`) ON DELETE CASCADE,
  INDEX `idx_notifications_user_read` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------
-- 9. Audit Logs Table
-- ----------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `log_id` VARCHAR(32) NOT NULL,
  `user_id` VARCHAR(32) NULL,
  `user_name` VARCHAR(150) NULL,
  `action` VARCHAR(100) NOT NULL,
  `target_type` VARCHAR(50) NOT NULL,
  `target_id` VARCHAR(50) NULL,
  `details` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`log_id`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
