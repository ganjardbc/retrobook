-- CreateTable
CREATE TABLE `bot_profiles` (
    `user_id` INTEGER NOT NULL,
    `persona` TEXT NOT NULL,
    `posts_per_day` INTEGER NOT NULL DEFAULT 2,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `last_post_at` DATETIME(3) NULL,
    `last_tick_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`user_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bot_profiles` ADD CONSTRAINT `bot_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

