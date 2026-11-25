CREATE TABLE `conversation_states` (
    `user_id` INTEGER NOT NULL,
    `peer_id` INTEGER NOT NULL,
    `cleared_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `hidden_at` DATETIME(3) NULL,
    INDEX `conversation_states_peer_id_idx`(`peer_id`),
    PRIMARY KEY (`user_id`, `peer_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `conversation_states` ADD CONSTRAINT `conversation_states_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `conversation_states` ADD CONSTRAINT `conversation_states_peer_id_fkey` FOREIGN KEY (`peer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
