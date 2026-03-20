-- ============================================================
-- Migration: Full Series Support
-- - season_ratings table
-- - synced_at + averageEpisodeRating columns on seasons
-- - air_date index on episodes
-- ============================================================

-- 1. Add sync tracking + aggregate cache to seasons
ALTER TABLE "seasons"
  ADD COLUMN IF NOT EXISTS "average_episode_rating" real,
  ADD COLUMN IF NOT EXISTS "synced_at" timestamp with time zone;

-- 2. Add air_date index on episodes (useful for "next episode" queries)
CREATE INDEX IF NOT EXISTS "idx_episodes_air_date" ON "episodes" USING btree ("air_date");

-- 3. Season ratings table
CREATE TABLE IF NOT EXISTS "season_ratings" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL,
  "season_id"  uuid NOT NULL,
  "rating"     real NOT NULL,
  -- "manual" = user set explicitly; "auto" = calculated from episode avg
  "source"     text NOT NULL DEFAULT 'manual',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_user_season_rating" UNIQUE ("user_id", "season_id")
);

ALTER TABLE "season_ratings"
  ADD CONSTRAINT "season_ratings_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "season_ratings_season_id_seasons_id_fk"
    FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "idx_season_ratings_user"   ON "season_ratings" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_season_ratings_season" ON "season_ratings" USING btree ("season_id");

-- 4. RLS
ALTER TABLE "season_ratings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "season_ratings_select" ON "season_ratings"
  FOR SELECT USING (true);  -- public read (aggregate stats)

CREATE POLICY "season_ratings_insert" ON "season_ratings"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "season_ratings_update" ON "season_ratings"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "season_ratings_delete" ON "season_ratings"
  FOR DELETE USING (auth.uid() = user_id);
