-- Recommendation system tables
-- Phase 1: Base 4 tables (expanded) + 3 new tables

-- ── user_taste_snapshots ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user_taste_snapshots" (
  "user_id" uuid PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "top_genres" jsonb NOT NULL DEFAULT '[]',
  "top_decades" jsonb NOT NULL DEFAULT '[]',
  "top_languages" jsonb NOT NULL DEFAULT '[]',
  "avg_rating" real DEFAULT 3.0,
  "rating_std_dev" real DEFAULT 0,
  "genre_vector" jsonb NOT NULL DEFAULT '[]',
  "total_watched" integer DEFAULT 0,
  "review_rate" real DEFAULT 0,
  "activity_level" text DEFAULT 'low',
  "diversity_score" real DEFAULT 0,
  "mainstream_score" real DEFAULT 0,
  "preferred_runtime" integer,
  "computed_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

-- ── recommendation_feedback ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "recommendation_feedback" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "rec_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "feedback" text NOT NULL,
  "impact_score" real DEFAULT 0,
  "source" text,
  "context" text,
  "converted_to_watch" boolean DEFAULT false,
  "converted_to_follow" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_feedback" UNIQUE ("user_id", "rec_type", "target_id")
);
CREATE INDEX IF NOT EXISTS "idx_feedback_user" ON "recommendation_feedback"("user_id");
CREATE INDEX IF NOT EXISTS "idx_feedback_target" ON "recommendation_feedback"("rec_type", "target_id");

-- ── user_similarity_cache ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user_similarity_cache" (
  "user_id_a" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "user_id_b" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "similarity" real NOT NULL,
  "common_media" integer DEFAULT 0,
  "computed_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("user_id_a", "user_id_b")
);
CREATE INDEX IF NOT EXISTS "idx_similarity_user_a" ON "user_similarity_cache"("user_id_a", "similarity");
CREATE INDEX IF NOT EXISTS "idx_similarity_user_b" ON "user_similarity_cache"("user_id_b", "similarity");

-- ── feed_impressions ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "feed_impressions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "activity_id" uuid NOT NULL,
  "score" real,
  "position" integer,
  "clicked" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_impressions_user" ON "feed_impressions"("user_id", "created_at");

-- ── user_onboarding_preferences ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user_onboarding_preferences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "selected_genre_ids" jsonb NOT NULL DEFAULT '[]',
  "seed_media_ids" jsonb NOT NULL DEFAULT '[]',
  "completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamptz,
  "created_at" timestamptz DEFAULT now()
);

-- ── recommendation_explanations ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "recommendation_explanations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "target_media_id" uuid NOT NULL,
  "source_media_id" uuid,
  "source_user_id" uuid,
  "explanation_type" text NOT NULL,
  "explanation_text" text NOT NULL,
  "score" real,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_explanations_user_target" ON "recommendation_explanations"("user_id", "target_media_id");
CREATE INDEX IF NOT EXISTS "idx_explanations_user_date" ON "recommendation_explanations"("user_id", "created_at");

-- ── recommendation_batches ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "recommendation_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "batch_type" text NOT NULL,
  "items" jsonb NOT NULL DEFAULT '[]',
  "parameters" jsonb NOT NULL DEFAULT '{}',
  "computed_at" timestamptz DEFAULT now(),
  "expires_at" timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS "idx_batches_user_type" ON "recommendation_batches"("user_id", "batch_type", "expires_at");

-- ── Row Level Security ────────────────────────────────────────────────────────

-- user_taste_snapshots (internal cache — only owner)
ALTER TABLE "user_taste_snapshots" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own taste snapshots" ON "user_taste_snapshots"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own taste snapshots" ON "user_taste_snapshots"
  FOR ALL USING (auth.uid() = user_id);

-- recommendation_feedback (private — only owner)
ALTER TABLE "recommendation_feedback" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own feedback" ON "recommendation_feedback"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own feedback" ON "recommendation_feedback"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own feedback" ON "recommendation_feedback"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own feedback" ON "recommendation_feedback"
  FOR DELETE USING (auth.uid() = user_id);

-- user_similarity_cache (read by owner — A or B side)
ALTER TABLE "user_similarity_cache" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own similarity cache" ON "user_similarity_cache"
  FOR SELECT USING (auth.uid() = user_id_a OR auth.uid() = user_id_b);
CREATE POLICY "Service can manage similarity cache" ON "user_similarity_cache"
  FOR ALL USING (true);

-- feed_impressions (private analytics — only owner)
ALTER TABLE "feed_impressions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own impressions" ON "feed_impressions"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own impressions" ON "feed_impressions"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own impressions" ON "feed_impressions"
  FOR UPDATE USING (auth.uid() = user_id);

-- user_onboarding_preferences (private — only owner)
ALTER TABLE "user_onboarding_preferences" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own onboarding" ON "user_onboarding_preferences"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own onboarding" ON "user_onboarding_preferences"
  FOR ALL USING (auth.uid() = user_id);

-- recommendation_explanations (private — only owner)
ALTER TABLE "recommendation_explanations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own explanations" ON "recommendation_explanations"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own explanations" ON "recommendation_explanations"
  FOR ALL USING (auth.uid() = user_id);

-- recommendation_batches (private — only owner)
ALTER TABLE "recommendation_batches" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own batches" ON "recommendation_batches"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own batches" ON "recommendation_batches"
  FOR ALL USING (auth.uid() = user_id);
