ALTER TABLE `videos` ADD `team` varchar(100);--> statement-breakpoint
ALTER TABLE `videos` ADD `minHighlightDuration` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `maxHighlightDuration` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `highlightTypes` json;--> statement-breakpoint
ALTER TABLE `videos` ADD `minConfidence` int DEFAULT 70 NOT NULL;