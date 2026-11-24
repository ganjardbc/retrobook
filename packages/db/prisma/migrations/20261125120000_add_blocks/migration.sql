CREATE TABLE `blocks` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `blocker_id` INTEGER NOT NULL,
  `blocked_id` INTEGER NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `blocks_blocker_id_blocked_id_key`(`blocker_id`, `blocked_id`),
  INDEX `blocks_blocked_id_idx`(`blocked_id`),
  PRIMARY KEY (`id`),
  CONSTRAINT `blocks_blocker_id_fkey` FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `blocks_blocked_id_fkey` FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
