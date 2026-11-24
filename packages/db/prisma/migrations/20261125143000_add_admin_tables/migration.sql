CREATE TABLE `reports` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `reporter_id` INTEGER NOT NULL,
  `target_type` ENUM('POST', 'COMMENT', 'USER') NOT NULL,
  `target_id` INTEGER NOT NULL,
  `reason` ENUM('SPAM', 'HARASSMENT', 'INAPPROPRIATE', 'OTHER') NOT NULL,
  `note` TEXT NULL,
  `status` ENUM('PENDING', 'REVIEWED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
  `handled_by` INTEGER NULL,
  `handled_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `reports_reporter_id_target_type_target_id_key` (`reporter_id`, `target_type`, `target_id`),
  INDEX `reports_status_created_at_idx` (`status`, `created_at`),
  INDEX `reports_target_type_target_id_idx` (`target_type`, `target_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `reports_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `reports_handled_by_fkey` FOREIGN KEY (`handled_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `admin_id` INTEGER NOT NULL,
  `action` VARCHAR(60) NOT NULL,
  `target_type` VARCHAR(30) NULL,
  `target_id` INTEGER NULL,
  `detail` JSON NULL,
  `ip` VARCHAR(45) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `audit_logs_admin_id_created_at_idx` (`admin_id`, `created_at`),
  INDEX `audit_logs_action_created_at_idx` (`action`, `created_at`),
  PRIMARY KEY (`id`),
  CONSTRAINT `audit_logs_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `settings` (
  `key` VARCHAR(60) NOT NULL,
  `value` JSON NOT NULL,
  `updated_by` INTEGER NULL,
  `updated_at` DATETIME(3) NOT NULL,
  PRIMARY KEY (`key`),
  CONSTRAINT `settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `announcements` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(120) NOT NULL,
  `body` TEXT NOT NULL,
  `created_by` INTEGER NOT NULL,
  `active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  CONSTRAINT `announcements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `blocked_words` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `word` VARCHAR(60) NOT NULL,
  `created_by` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `blocked_words_word_key` (`word`),
  PRIMARY KEY (`id`),
  CONSTRAINT `blocked_words_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `notifications`
  ADD COLUMN `announcement_id` INTEGER NULL,
  ADD INDEX `notifications_announcement_id_idx` (`announcement_id`),
  ADD CONSTRAINT `notifications_announcement_id_fkey` FOREIGN KEY (`announcement_id`) REFERENCES `announcements` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `settings` (`key`, `value`, `updated_by`, `updated_at`) VALUES
  ('maintenance_mode', CAST('false' AS JSON), NULL, CURRENT_TIMESTAMP(3)),
  ('registration_open', CAST('true' AS JSON), NULL, CURRENT_TIMESTAMP(3));
