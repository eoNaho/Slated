ALTER TABLE "media" ADD COLUMN "imdb_rating" real;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "imdb_votes" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "metacritic_score" integer;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "rotten_tomatoes_score" integer;--> statement-breakpoint
CREATE INDEX "idx_media_imdb_rating" ON "media" USING btree ("imdb_rating");--> statement-breakpoint
CREATE INDEX "idx_media_metacritic_score" ON "media" USING btree ("metacritic_score");