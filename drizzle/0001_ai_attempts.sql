CREATE TABLE `ai_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`user` text NOT NULL,
	`at` integer NOT NULL,
	`day` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ai_attempts_user_day` ON `ai_attempts` (`user`, `day`);
--> statement-breakpoint
CREATE INDEX `ai_attempts_user_at` ON `ai_attempts` (`user`, `at`);
