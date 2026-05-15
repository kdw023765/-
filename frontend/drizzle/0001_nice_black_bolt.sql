CREATE TABLE `highlights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`videoId` int NOT NULL,
	`type` enum('goal','post','foul') NOT NULL,
	`startTime` int NOT NULL,
	`endTime` int NOT NULL,
	`clipUrl` text,
	`clipKey` text,
	`clipSize` int,
	`confidence` int,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `highlights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`videoUrl` text NOT NULL,
	`videoKey` text NOT NULL,
	`fileSize` int,
	`duration` int,
	`status` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`progress` int NOT NULL DEFAULT 0,
	`statusMessage` text,
	`sessionId` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `videos_id` PRIMARY KEY(`id`)
);
