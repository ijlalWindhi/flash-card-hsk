ALTER TABLE `vocabulary` ADD `hsk_level` integer;--> statement-breakpoint
-- Backfill rows seeded before the column existed: an official external_id is
-- `hsk<standard>-<level>-<nnnn>`, so the level is its sixth character.
UPDATE `vocabulary` SET `hsk_level` = CAST(substr(`external_id`, 6, 1) AS integer) WHERE `kind` = 'official';
