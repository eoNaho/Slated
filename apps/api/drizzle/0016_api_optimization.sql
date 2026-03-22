-- API Optimization: indexes, trigram search, release_year generated column

-- ── Composite indexes for common query patterns ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_username_status
  ON "user"(username, status);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read
  ON notifications(user_id, is_read);

CREATE INDEX IF NOT EXISTS idx_media_vote_average
  ON media(vote_average DESC);

CREATE INDEX IF NOT EXISTS idx_activities_target_type
  ON activities(target_type, target_id);

-- ── Trigram indexes for fast ILIKE search ─────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_user_username_trgm
  ON "user" USING gin(username gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_user_display_name_trgm
  ON "user" USING gin(display_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_media_title_trgm
  ON media USING gin(title gin_trgm_ops);

-- ── Generated release_year column to avoid EXTRACT() preventing index use ─────
ALTER TABLE media
  ADD COLUMN IF NOT EXISTS release_year smallint
  GENERATED ALWAYS AS (EXTRACT(YEAR FROM release_date)::smallint) STORED;

CREATE INDEX IF NOT EXISTS idx_media_release_year
  ON media(release_year);

-- ── Indexes for stories feed performance ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_stories_visibility_expired
  ON stories(user_id, visibility, is_expired);

-- ── Indexes for activity feed performance ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_activities_user_created
  ON activities(user_id, created_at DESC);

-- ── Indexes for diary lookups ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_diary_user_watched
  ON diary(user_id, watched_at DESC);

-- ── Indexes for list items cover fetching ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_list_items_list_position
  ON list_items(list_id, position);
