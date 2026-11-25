-- Semua PK dan FK integer menjadi UUID v4 (CHAR(36)). Dibuat dari `prisma migrate diff`.
-- Baris lama TIDAK dikonversi menjadi UUID valid (hanya diubah tipenya): kosongkan data dev sesudahnya
-- (SEED_RESET=true pnpm --filter @retrobook/db seed). Aturan CHECK pada friendships tetap berlaku.

-- DropForeignKey
ALTER TABLE `albums` DROP FOREIGN KEY `albums_owner_id_fkey`;

-- DropForeignKey
ALTER TABLE `announcements` DROP FOREIGN KEY `announcements_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_admin_id_fkey`;

-- DropForeignKey
ALTER TABLE `blocked_words` DROP FOREIGN KEY `blocked_words_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `blocks` DROP FOREIGN KEY `blocks_blocked_id_fkey`;

-- DropForeignKey
ALTER TABLE `blocks` DROP FOREIGN KEY `blocks_blocker_id_fkey`;

-- DropForeignKey
ALTER TABLE `bot_profiles` DROP FOREIGN KEY `bot_profiles_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `comments` DROP FOREIGN KEY `comments_author_id_fkey`;

-- DropForeignKey
ALTER TABLE `comments` DROP FOREIGN KEY `comments_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `conversation_states` DROP FOREIGN KEY `conversation_states_peer_id_fkey`;

-- DropForeignKey
ALTER TABLE `conversation_states` DROP FOREIGN KEY `conversation_states_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_rsvps` DROP FOREIGN KEY `event_rsvps_event_id_fkey`;

-- DropForeignKey
ALTER TABLE `event_rsvps` DROP FOREIGN KEY `event_rsvps_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `events` DROP FOREIGN KEY `events_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `friendships` DROP FOREIGN KEY `friendships_addressee_id_fkey`;

-- DropForeignKey
ALTER TABLE `friendships` DROP FOREIGN KEY `friendships_requester_id_fkey`;

-- DropForeignKey
ALTER TABLE `group_members` DROP FOREIGN KEY `group_members_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `group_members` DROP FOREIGN KEY `group_members_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `groups` DROP FOREIGN KEY `groups_created_by_fkey`;

-- DropForeignKey
ALTER TABLE `life_events` DROP FOREIGN KEY `life_events_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `likes` DROP FOREIGN KEY `likes_comment_id_fkey`;

-- DropForeignKey
ALTER TABLE `likes` DROP FOREIGN KEY `likes_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `likes` DROP FOREIGN KEY `likes_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `messages_receiver_id_fkey`;

-- DropForeignKey
ALTER TABLE `messages` DROP FOREIGN KEY `messages_sender_id_fkey`;

-- DropForeignKey
ALTER TABLE `notes` DROP FOREIGN KEY `notes_author_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_actor_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_announcement_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_comment_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `notifications` DROP FOREIGN KEY `notifications_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `password_reset_tokens` DROP FOREIGN KEY `password_reset_tokens_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `photos` DROP FOREIGN KEY `photos_album_id_fkey`;

-- DropForeignKey
ALTER TABLE `photos` DROP FOREIGN KEY `photos_owner_id_fkey`;

-- DropForeignKey
ALTER TABLE `pokes` DROP FOREIGN KEY `pokes_from_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `pokes` DROP FOREIGN KEY `pokes_to_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `post_hashtags` DROP FOREIGN KEY `post_hashtags_hashtag_id_fkey`;

-- DropForeignKey
ALTER TABLE `post_hashtags` DROP FOREIGN KEY `post_hashtags_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `post_tags` DROP FOREIGN KEY `post_tags_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `post_tags` DROP FOREIGN KEY `post_tags_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_author_id_fkey`;

-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_group_id_fkey`;

-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_shared_from_id_fkey`;

-- DropForeignKey
ALTER TABLE `posts` DROP FOREIGN KEY `posts_wall_owner_id_fkey`;

-- DropForeignKey
ALTER TABLE `refresh_tokens` DROP FOREIGN KEY `refresh_tokens_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `reports` DROP FOREIGN KEY `reports_handled_by_fkey`;

-- DropForeignKey
ALTER TABLE `reports` DROP FOREIGN KEY `reports_reporter_id_fkey`;

-- DropForeignKey
ALTER TABLE `saved_posts` DROP FOREIGN KEY `saved_posts_post_id_fkey`;

-- DropForeignKey
ALTER TABLE `saved_posts` DROP FOREIGN KEY `saved_posts_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `settings` DROP FOREIGN KEY `settings_updated_by_fkey`;

-- DropForeignKey
ALTER TABLE `sponsored` DROP FOREIGN KEY `sponsored_created_by_fkey`;

-- DropIndex
DROP INDEX `announcements_created_by_fkey` ON `announcements`;

-- DropIndex
DROP INDEX `blocked_words_created_by_fkey` ON `blocked_words`;

-- DropIndex
DROP INDEX `comments_author_id_fkey` ON `comments`;

-- DropIndex
DROP INDEX `events_created_by_fkey` ON `events`;

-- DropIndex
DROP INDEX `groups_created_by_fkey` ON `groups`;

-- DropIndex
DROP INDEX `notifications_actor_id_fkey` ON `notifications`;

-- DropIndex
DROP INDEX `notifications_comment_id_fkey` ON `notifications`;

-- DropIndex
DROP INDEX `notifications_post_id_fkey` ON `notifications`;

-- DropIndex
DROP INDEX `post_tags_user_id_fkey` ON `post_tags`;

-- DropIndex
DROP INDEX `posts_shared_from_id_fkey` ON `posts`;

-- DropIndex
DROP INDEX `reports_handled_by_fkey` ON `reports`;

-- DropIndex
DROP INDEX `saved_posts_post_id_fkey` ON `saved_posts`;

-- DropIndex
DROP INDEX `settings_updated_by_fkey` ON `settings`;

-- DropIndex
DROP INDEX `sponsored_created_by_fkey` ON `sponsored`;

-- AlterTable
ALTER TABLE `albums` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `owner_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `announcements` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `created_by` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `audit_logs` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `admin_id` CHAR(36) NOT NULL,
    MODIFY `target_id` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `blocked_words` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `created_by` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `blocks` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `blocker_id` CHAR(36) NOT NULL,
    MODIFY `blocked_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `bot_profiles` DROP PRIMARY KEY,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`user_id`);

-- AlterTable
ALTER TABLE `comments` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `post_id` CHAR(36) NOT NULL,
    MODIFY `author_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `conversation_states` DROP PRIMARY KEY,
    MODIFY `user_id` CHAR(36) NOT NULL,
    MODIFY `peer_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`user_id`, `peer_id`);

-- AlterTable
ALTER TABLE `event_rsvps` DROP PRIMARY KEY,
    MODIFY `event_id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`event_id`, `user_id`);

-- AlterTable
ALTER TABLE `events` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `created_by` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `friendships` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `requester_id` CHAR(36) NOT NULL,
    MODIFY `addressee_id` CHAR(36) NOT NULL,
    MODIFY `pair_low_id` CHAR(36) NOT NULL,
    MODIFY `pair_high_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `group_members` DROP PRIMARY KEY,
    MODIFY `group_id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`group_id`, `user_id`);

-- AlterTable
ALTER TABLE `groups` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `created_by` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `hashtags` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `life_events` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `likes` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    MODIFY `post_id` CHAR(36) NULL,
    MODIFY `comment_id` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `messages` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `sender_id` CHAR(36) NOT NULL,
    MODIFY `receiver_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `notes` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `author_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `notifications` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    MODIFY `actor_id` CHAR(36) NULL,
    MODIFY `post_id` CHAR(36) NULL,
    MODIFY `comment_id` CHAR(36) NULL,
    MODIFY `announcement_id` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `password_reset_tokens` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `photos` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `album_id` CHAR(36) NOT NULL,
    MODIFY `owner_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `pokes` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `from_user_id` CHAR(36) NOT NULL,
    MODIFY `to_user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `post_hashtags` DROP PRIMARY KEY,
    MODIFY `post_id` CHAR(36) NOT NULL,
    MODIFY `hashtag_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`post_id`, `hashtag_id`);

-- AlterTable
ALTER TABLE `post_tags` DROP PRIMARY KEY,
    MODIFY `post_id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`post_id`, `user_id`);

-- AlterTable
ALTER TABLE `posts` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `author_id` CHAR(36) NOT NULL,
    MODIFY `wall_owner_id` CHAR(36) NULL,
    MODIFY `shared_from_id` CHAR(36) NULL,
    MODIFY `group_id` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `refresh_tokens` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `user_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `reports` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `reporter_id` CHAR(36) NOT NULL,
    MODIFY `target_id` CHAR(36) NOT NULL,
    MODIFY `handled_by` CHAR(36) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `saved_posts` DROP PRIMARY KEY,
    MODIFY `user_id` CHAR(36) NOT NULL,
    MODIFY `post_id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`user_id`, `post_id`);

-- AlterTable
ALTER TABLE `settings` MODIFY `updated_by` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `sponsored` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `created_by` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_wall_owner_id_fkey` FOREIGN KEY (`wall_owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_shared_from_id_fkey` FOREIGN KEY (`shared_from_id`) REFERENCES `posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `likes` ADD CONSTRAINT `likes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `likes` ADD CONSTRAINT `likes_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `likes` ADD CONSTRAINT `likes_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_posts` ADD CONSTRAINT `saved_posts_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_posts` ADD CONSTRAINT `saved_posts_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_tags` ADD CONSTRAINT `post_tags_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_tags` ADD CONSTRAINT `post_tags_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_hashtags` ADD CONSTRAINT `post_hashtags_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `post_hashtags` ADD CONSTRAINT `post_hashtags_hashtag_id_fkey` FOREIGN KEY (`hashtag_id`) REFERENCES `hashtags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_requester_id_fkey` FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `friendships` ADD CONSTRAINT `friendships_addressee_id_fkey` FOREIGN KEY (`addressee_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blocker_id_fkey` FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocks` ADD CONSTRAINT `blocks_blocked_id_fkey` FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pokes` ADD CONSTRAINT `pokes_from_user_id_fkey` FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pokes` ADD CONSTRAINT `pokes_to_user_id_fkey` FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_states` ADD CONSTRAINT `conversation_states_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversation_states` ADD CONSTRAINT `conversation_states_peer_id_fkey` FOREIGN KEY (`peer_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_actor_id_fkey` FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_post_id_fkey` FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_comment_id_fkey` FOREIGN KEY (`comment_id`) REFERENCES `comments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_announcement_id_fkey` FOREIGN KEY (`announcement_id`) REFERENCES `announcements`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_handled_by_fkey` FOREIGN KEY (`handled_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_admin_id_fkey` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `settings` ADD CONSTRAINT `settings_updated_by_fkey` FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `announcements` ADD CONSTRAINT `announcements_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `blocked_words` ADD CONSTRAINT `blocked_words_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bot_profiles` ADD CONSTRAINT `bot_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sponsored` ADD CONSTRAINT `sponsored_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `password_reset_tokens` ADD CONSTRAINT `password_reset_tokens_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `albums` ADD CONSTRAINT `albums_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photos` ADD CONSTRAINT `photos_album_id_fkey` FOREIGN KEY (`album_id`) REFERENCES `albums`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `photos` ADD CONSTRAINT `photos_owner_id_fkey` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `groups` ADD CONSTRAINT `groups_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_group_id_fkey` FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `group_members` ADD CONSTRAINT `group_members_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_created_by_fkey` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_rsvps` ADD CONSTRAINT `event_rsvps_event_id_fkey` FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `event_rsvps` ADD CONSTRAINT `event_rsvps_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notes` ADD CONSTRAINT `notes_author_id_fkey` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `life_events` ADD CONSTRAINT `life_events_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

