CREATE TABLE `life_events` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `kind` ENUM('MOVED', 'STARTED_JOB', 'GRADUATED', 'OTHER') NOT NULL,
    `title` VARCHAR(120) NOT NULL,
    `happened_on` DATE NOT NULL,
    `privacy` ENUM('PUBLIC', 'FRIENDS', 'ONLY_ME') NOT NULL DEFAULT 'FRIENDS',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX `life_events_user_id_happened_on_idx`(`user_id`, `happened_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `life_events` ADD CONSTRAINT `life_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
