CREATE TABLE `events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(120) NOT NULL,
    `description` TEXT NOT NULL,
    `location` VARCHAR(120) NOT NULL,
    `starts_at` DATETIME(3) NOT NULL,
    `created_by` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `events_starts_at_idx`(`starts_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `event_rsvps` (
    `event_id` INTEGER NOT NULL,
    `user_id` INTEGER NOT NULL,
    `status` ENUM('GOING', 'MAYBE', 'DECLINED') NOT NULL DEFAULT 'MAYBE',
    `updated_at` DATETIME(3) NOT NULL,
    INDEX `event_rsvps_user_id_updated_at_idx`(`user_id`, `updated_at`),
    PRIMARY KEY (`event_id`, `user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `events` ADD CONSTRAINT `events_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `event_rsvps` ADD CONSTRAINT `event_rsvps_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `event_rsvps` ADD CONSTRAINT `event_rsvps_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
