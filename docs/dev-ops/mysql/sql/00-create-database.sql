CREATE DATABASE IF NOT EXISTS voice_input
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_unicode_ci;

USE voice_input;

CREATE TABLE `hotword`
(
    `id`         bigint                                  NOT NULL AUTO_INCREMENT,
    `created_at` datetime(6)                             NOT NULL,
    `group_name` varchar(32) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `user_id`    bigint                                  NOT NULL,
    `word`       varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_hotword_user_group_word` (`user_id`, `group_name`, `word`),
    KEY `idx_hotword_user_group` (`user_id`, `group_name`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `hotword_seed`
(
    `id`         bigint                                  NOT NULL AUTO_INCREMENT,
    `word`       varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `group_name` varchar(32) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `source`     varchar(32) COLLATE utf8mb4_unicode_ci  NOT NULL,
    `score`      int                                     NOT NULL DEFAULT 0,
    `created_at` datetime(6)                             NOT NULL,
    `updated_at` datetime(6)                             NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_seed_source_word` (`source`, `word`),
    KEY `idx_seed_group_score` (`group_name`, `score`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `transcript`
(
    `id`            bigint                                 NOT NULL AUTO_INCREMENT,
    `created_at`    datetime(6)                            NOT NULL,
    `duration_ms`   bigint DEFAULT NULL,
    `polished_text` text COLLATE utf8mb4_unicode_ci,
    `raw_text`      text COLLATE utf8mb4_unicode_ci        NOT NULL,
    `session_id`    varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
    `user_id`       bigint                                 NOT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_transcript_user_created` (`user_id`, `created_at`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;

CREATE TABLE `users`
(
    `id`            bigint                                  NOT NULL AUTO_INCREMENT,
    `created_at`    datetime(6)                             NOT NULL,
    `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
    `username`      varchar(64) COLLATE utf8mb4_unicode_ci  NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `UKr43af9ap4edm43mmtq01oddj6` (`username`)
) ENGINE = InnoDB
  DEFAULT CHARSET = utf8mb4
  COLLATE = utf8mb4_unicode_ci;
