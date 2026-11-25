-- BR-08: konten yang memuat kata terlarang ditandai, bukan diblokir.
ALTER TABLE `posts` ADD COLUMN `flagged` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `comments` ADD COLUMN `flagged` BOOLEAN NOT NULL DEFAULT false;
