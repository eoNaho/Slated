-- ============================================================
-- Migration 0011: Season/episode targeting for reviews
-- + source field to distinguish diary-linked vs manual reviews
-- ============================================================

-- 1. New columns
ALTER TABLE "reviews"
  ADD COLUMN IF NOT EXISTS "season_id"  uuid REFERENCES "seasons"("id")  ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "episode_id" uuid REFERENCES "episodes"("id") ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS "source"     text NOT NULL DEFAULT 'manual';

-- 2. Drop old single unique constraint (was user_id + media_id only)
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "unique_user_media_review";

-- 3. Partial unique indexes — one review per (user, scope)
--    Scope: media-level (no season/episode), season-level, episode-level
CREATE UNIQUE INDEX IF NOT EXISTS "idx_review_unique_media"
  ON "reviews" ("user_id", "media_id")
  WHERE "season_id" IS NULL AND "episode_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_review_unique_season"
  ON "reviews" ("user_id", "season_id")
  WHERE "season_id" IS NOT NULL AND "episode_id" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_review_unique_episode"
  ON "reviews" ("user_id", "episode_id")
  WHERE "episode_id" IS NOT NULL;

-- 4. Query indexes
CREATE INDEX IF NOT EXISTS "idx_reviews_season"  ON "reviews" ("season_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_episode" ON "reviews" ("episode_id");
CREATE INDEX IF NOT EXISTS "idx_reviews_source"  ON "reviews" ("source");
