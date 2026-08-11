CREATE TABLE `vocabulary` (
	`id` text PRIMARY KEY NOT NULL,
	`external_id` text,
	`hanzi` text NOT NULL,
	`pinyin` text NOT NULL,
	`pinyin_sort_key` text NOT NULL,
	`translation_id` text NOT NULL,
	`translation_en` text NOT NULL,
	`kind` text NOT NULL,
	`source_name` text,
	`source_url` text,
	`source_version` text,
	`verified_at` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vocabulary_external_id_unique` ON `vocabulary` (`external_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `vocabulary_manual_hanzi_pinyin_unique` ON `vocabulary` (`hanzi`,`pinyin`) WHERE "vocabulary"."kind" = 'manual';