-- ============================================================
-- Migration: Full Series System (tables + ratings)
-- Creates: seasons, episodes, episode_progress, season_ratings
-- ============================================================

-- 1. Seasons table
CREATE TABLE IF NOT EXISTS "seasons" (
  "id"                     uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "media_id"               uuid NOT NULL,
  "tmdb_id"                integer NOT NULL,
  "season_number"          integer NOT NULL,
  "name"                   text,
  "overview"               text,
  "poster_path"            text,
  "air_date"               date,
  "episode_count"          integer DEFAULT 0,
  "average_episode_rating" real,
  "synced_at"              timestamp with time zone,
  "created_at"             timestamp with time zone DEFAULT now(),
  "updated_at"             timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_media_season" UNIQUE ("media_id", "season_number"),
  CONSTRAINT "seasons_media_id_media_id_fk"
    FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_seasons_media" ON "seasons" USING btree ("media_id");
CREATE INDEX IF NOT EXISTS "idx_seasons_tmdb"  ON "seasons" USING btree ("tmdb_id");

-- 2. Episodes table
CREATE TABLE IF NOT EXISTS "episodes" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "season_id"       uuid NOT NULL,
  "tmdb_id"         integer NOT NULL,
  "episode_number"  integer NOT NULL,
  "name"            text,
  "overview"        text,
  "still_path"      text,
  "air_date"        date,
  "runtime"         integer,
  "vote_average"    real,
  "vote_count"      integer DEFAULT 0,
  "created_at"      timestamp with time zone DEFAULT now(),
  "updated_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_season_episode" UNIQUE ("season_id", "episode_number"),
  CONSTRAINT "episodes_season_id_seasons_id_fk"
    FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_episodes_season"   ON "episodes" USING btree ("season_id");
CREATE INDEX IF NOT EXISTS "idx_episodes_tmdb"     ON "episodes" USING btree ("tmdb_id");
CREATE INDEX IF NOT EXISTS "idx_episodes_air_date" ON "episodes" USING btree ("air_date");

-- 3. Episode Progress (user tracking)
CREATE TABLE IF NOT EXISTS "episode_progress" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL,
  "episode_id" uuid NOT NULL,
  "watched_at" timestamp with time zone DEFAULT now(),
  "rating"     real,
  "notes"      text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_user_episode" UNIQUE ("user_id", "episode_id"),
  CONSTRAINT "episode_progress_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE,
  CONSTRAINT "episode_progress_episode_id_episodes_id_fk"
    FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_episode_progress_user"    ON "episode_progress" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_episode_progress_episode" ON "episode_progress" USING btree ("episode_id");
CREATE INDEX IF NOT EXISTS "idx_episode_progress_watched" ON "episode_progress" USING btree ("watched_at");

-- 4. Season Ratings table
CREATE TABLE IF NOT EXISTS "season_ratings" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL,
  "season_id"  uuid NOT NULL,
  "rating"     real NOT NULL,
  "source"     text NOT NULL DEFAULT 'manual',
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_user_season_rating" UNIQUE ("user_id", "season_id"),
  CONSTRAINT "season_ratings_user_id_user_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE CASCADE,
  CONSTRAINT "season_ratings_season_id_seasons_id_fk"
    FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "idx_season_ratings_user"   ON "season_ratings" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_season_ratings_season" ON "season_ratings" USING btree ("season_id");

-- 5. RLS Policies

-- seasons: catalog data, public read only
-- (writes come from service role / API which bypasses RLS)
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Seasons are viewable by everyone" ON "seasons" FOR SELECT USING (true);

-- episodes: catalog data, public read only
ALTER TABLE "episodes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Episodes are viewable by everyone" ON "episodes" FOR SELECT USING (true);

-- episode_progress: public read (for stats/feed), users manage their own
ALTER TABLE "episode_progress" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Episode progress is viewable by everyone" ON "episode_progress" FOR SELECT USING (true);
CREATE POLICY "Users can insert own episode progress" ON "episode_progress" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own episode progress" ON "episode_progress" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own episode progress" ON "episode_progress" FOR DELETE USING (auth.uid() = user_id);

-- season_ratings: public read (for aggregate stats), users manage their own
ALTER TABLE "season_ratings" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Season ratings are viewable by everyone" ON "season_ratings" FOR SELECT USING (true);
CREATE POLICY "Users can insert own season ratings" ON "season_ratings" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own season ratings" ON "season_ratings" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own season ratings" ON "season_ratings" FOR DELETE USING (auth.uid() = user_id);

