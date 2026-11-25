-- CreateIndex
CREATE INDEX `audit_logs_created_at_idx` ON `audit_logs`(`created_at`);

-- CreateIndex
CREATE INDEX `friendships_addressee_id_status_created_at_idx` ON `friendships`(`addressee_id`, `status`, `created_at`);

-- CreateIndex
CREATE INDEX `friendships_requester_id_status_created_at_idx` ON `friendships`(`requester_id`, `status`, `created_at`);

-- CreateIndex
CREATE INDEX `likes_post_id_created_at_idx` ON `likes`(`post_id`, `created_at`);

-- CreateIndex
CREATE INDEX `likes_comment_id_created_at_idx` ON `likes`(`comment_id`, `created_at`);

-- CreateIndex
CREATE INDEX `notifications_user_id_created_at_idx` ON `notifications`(`user_id`, `created_at`);

-- CreateIndex
CREATE INDEX `photos_album_id_created_at_idx` ON `photos`(`album_id`, `created_at`);
