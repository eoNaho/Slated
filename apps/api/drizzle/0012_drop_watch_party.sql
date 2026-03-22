-- Drop Watch Party tables and all associated objects
-- Members must be dropped before rooms due to foreign key

DROP TABLE IF EXISTS "watch_party_members";--> statement-breakpoint
DROP TABLE IF EXISTS "watch_party_rooms";
