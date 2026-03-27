-- Privacy system: add follow request status and typed privacy columns to user_settings

-- A. Add status column to follows table
-- Default 'accepted' ensures all existing follows remain valid (backward-compatible)
ALTER TABLE "follows" ADD COLUMN "status" text NOT NULL DEFAULT 'accepted';
CREATE INDEX "idx_follows_status" ON "follows" ("following_id", "status");

-- B. Add typed privacy columns to user_settings
-- All default to public/false so existing users are unaffected
ALTER TABLE "user_settings" ADD COLUMN "is_private" boolean NOT NULL DEFAULT false;
ALTER TABLE "user_settings" ADD COLUMN "visibility_diary" text NOT NULL DEFAULT 'public';
ALTER TABLE "user_settings" ADD COLUMN "visibility_watchlist" text NOT NULL DEFAULT 'public';
ALTER TABLE "user_settings" ADD COLUMN "visibility_activity" text NOT NULL DEFAULT 'public';
ALTER TABLE "user_settings" ADD COLUMN "visibility_reviews" text NOT NULL DEFAULT 'public';
ALTER TABLE "user_settings" ADD COLUMN "visibility_lists" text NOT NULL DEFAULT 'public';
ALTER TABLE "user_settings" ADD COLUMN "visibility_likes" text NOT NULL DEFAULT 'public';
