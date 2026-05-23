-- Schema fix migration applied AFTER 00-create-database.sql.
-- Idempotent where MySQL allows; otherwise commented as one-shot.

USE voice_input;

-- 1. hotword: per-user lookup index used by HotwordMapper.findByUserIdAndGroupNameOrderByIdAsc / findByUserIdOrderByGroupNameAscIdAsc.
CREATE INDEX idx_hotword_user_group ON hotword (user_id, group_name);

-- 2. hotword: prevent duplicate (user, group, word) inserts (used by import-from-seed).
--    A plain UNIQUE on (user_id, group_name, word) lets the same word live in different groups.
CREATE UNIQUE INDEX uk_hotword_user_group_word ON hotword (user_id, group_name, word);

-- 3. transcript: history endpoint sorts by created_at desc per user.
CREATE INDEX idx_transcript_user_created ON transcript (user_id, created_at);

-- 4. New shared seed library populated by the scheduled crawler.
CREATE TABLE IF NOT EXISTS hotword_seed
(
    `id`         bigint                                  NOT NULL AUTO_INCREMENT,
    `word`       varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `group_name` varchar(32) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `source`     varchar(32) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `score`      int                                     NOT NULL DEFAULT 0,
    `created_at` datetime(6)                             NOT NULL,
    `updated_at` datetime(6)                             NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY uk_seed_source_word (`source`, `word`),
    KEY idx_seed_group_score (`group_name`, `score`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
