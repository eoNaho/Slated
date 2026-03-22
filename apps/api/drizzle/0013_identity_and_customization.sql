-- Migration: 0013_identity_and_customization
-- Adds identity/customization system: profile frames, titles, user identity perks,
-- media custom covers, plan feature flags, and new columns on user/user_settings.

-- ============================================================
-- 1. Alter existing tables
-- ============================================================

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "bio_extended" text;

ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "accent_color" text;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "profile_theme" text;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "layout_config" text;
ALTER TABLE "user_settings" ADD COLUMN IF NOT EXISTS "showcased_badges" text;

-- ============================================================
-- 2. Profile Frames — catalog of avatar frames
-- ============================================================

CREATE TABLE IF NOT EXISTS "profile_frames" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"        text NOT NULL,
  "slug"        text UNIQUE NOT NULL,
  "color"       text NOT NULL,
  "is_animated" boolean DEFAULT false,
  "min_plan"    text NOT NULL DEFAULT 'pro',
  "preview_url" text,
  "created_at"  timestamptz DEFAULT now()
);

-- ============================================================
-- 3. Profile Titles — catalog of title badges
-- ============================================================

CREATE TABLE IF NOT EXISTS "profile_titles" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name"           text NOT NULL,
  "slug"           text UNIQUE NOT NULL,
  "bg_color"       text NOT NULL,
  "text_color"     text NOT NULL,
  "source"         text NOT NULL, -- 'plan' | 'xp' | 'achievement'
  "min_plan"       text,
  "xp_required"    integer,
  "achievement_id" uuid REFERENCES "achievements"("id") ON DELETE SET NULL,
  "created_at"     timestamptz DEFAULT now()
);

-- ============================================================
-- 4. User Titles — unlocked titles per user
-- ============================================================

CREATE TABLE IF NOT EXISTS "user_titles" (
  "user_id"     uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title_id"    uuid NOT NULL REFERENCES "profile_titles"("id") ON DELETE CASCADE,
  "unlocked_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("user_id", "title_id")
);

-- ============================================================
-- 5. User Identity Perks — active identity configuration
-- ============================================================

CREATE TABLE IF NOT EXISTS "user_identity_perks" (
  "user_id"         uuid PRIMARY KEY REFERENCES "user"("id") ON DELETE CASCADE,
  "frame_id"        uuid REFERENCES "profile_frames"("id") ON DELETE SET NULL,
  "active_title_id" uuid REFERENCES "profile_titles"("id") ON DELETE SET NULL,
  "badge_enabled"   boolean DEFAULT false,
  "verified"        boolean DEFAULT false,
  "updated_at"      timestamptz DEFAULT now()
);

-- ============================================================
-- 6. Media Custom Covers — user-uploaded custom posters
-- ============================================================

CREATE TABLE IF NOT EXISTS "media_custom_covers" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "media_id"    uuid NOT NULL REFERENCES "media"("id") ON DELETE CASCADE,
  "image_path"  text NOT NULL,
  "created_at"  timestamptz DEFAULT now(),
  CONSTRAINT "unique_user_media_cover" UNIQUE ("user_id", "media_id")
);

CREATE INDEX IF NOT EXISTS "idx_custom_covers_user"  ON "media_custom_covers"("user_id");
CREATE INDEX IF NOT EXISTS "idx_custom_covers_media" ON "media_custom_covers"("media_id");

-- ============================================================
-- 7. Plan Feature Flags — toggle features per plan
-- ============================================================

CREATE TABLE IF NOT EXISTS "plan_feature_flags" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "feature_key" text NOT NULL,
  "plan"        text NOT NULL, -- 'free' | 'pro' | 'ultra'
  "enabled"     boolean DEFAULT false,
  "updated_at"  timestamptz DEFAULT now(),
  CONSTRAINT "unique_feature_plan" UNIQUE ("feature_key", "plan")
);

-- ============================================================
-- 8. Seed — Profile Frames
-- ============================================================

INSERT INTO "profile_frames" ("name", "slug", "color", "is_animated", "min_plan") VALUES
  ('Cinema',     'cinema',     '#7c3aed', false, 'pro'),
  ('Noir',       'noir',       '#374151', false, 'pro'),
  ('Cult',       'cult',       '#f97316', false, 'pro'),
  ('Golden Age', 'golden-age', '#d97706', false, 'pro'),
  ('Sci-Fi',     'sci-fi',     '#3b82f6', true,  'pro'),
  ('Horror',     'horror',     '#dc2626', true,  'pro'),
  ('Apoiador',   'supporter',  '#f59e0b', true,  'ultra'),
  ('Ultra',      'ultra',      '#a855f7', true,  'ultra')
ON CONFLICT ("slug") DO NOTHING;

-- ============================================================
-- 9. Seed — Profile Titles
-- ============================================================

INSERT INTO "profile_titles" ("name", "slug", "bg_color", "text_color", "source", "min_plan", "xp_required") VALUES
  ('Apoiador',   'apoiador',   '#d97706', '#ffffff', 'plan',        'pro',   NULL),
  ('Ultra',      'ultra',      '#a855f7', '#ffffff', 'plan',        'ultra', NULL),
  ('Cinéfilo',   'cinefilo',   '#7c3aed', '#ffffff', 'xp',          NULL,    1000),
  ('Crítico',    'critico',    '#3b82f6', '#ffffff', 'xp',          NULL,    5000),
  ('Maratonista','maratonista','#14b8a6', '#ffffff', 'xp',          NULL,    20000),
  ('Cult Lord',  'cult-lord',  '#374151', '#ffffff', 'achievement', 'pro',   NULL),
  ('Diretor',    'diretor',    '#22c55e', '#ffffff', 'achievement', 'pro',   NULL),
  ('Storyteller','storyteller','#ec4899', '#ffffff', 'achievement', 'pro',   NULL),
  ('Lendário',   'lendario',   '#f59e0b', '#1a1a1a', 'xp',          'ultra', 10000)
ON CONFLICT ("slug") DO NOTHING;

-- ============================================================
-- 10. Seed — Plan Feature Flags
-- ============================================================

INSERT INTO "plan_feature_flags" ("feature_key", "plan", "enabled") VALUES
  ('export_data',             'free',  false),
  ('export_data',             'pro',   true),
  ('export_data',             'ultra', true),
  ('custom_themes',           'free',  false),
  ('custom_themes',           'pro',   true),
  ('custom_themes',           'ultra', true),
  ('advanced_analytics',      'free',  false),
  ('advanced_analytics',      'pro',   true),
  ('advanced_analytics',      'ultra', true),
  ('letterboxd_import',       'free',  false),
  ('letterboxd_import',       'pro',   true),
  ('letterboxd_import',       'ultra', true),
  ('profile_frames',          'free',  false),
  ('profile_frames',          'pro',   true),
  ('profile_frames',          'ultra', true),
  ('custom_media_cover',      'free',  false),
  ('custom_media_cover',      'pro',   true),
  ('custom_media_cover',      'ultra', true),
  ('gif_uploads',             'free',  false),
  ('gif_uploads',             'pro',   false),
  ('gif_uploads',             'ultra', true),
  ('supporter_badge',         'free',  false),
  ('supporter_badge',         'pro',   false),
  ('supporter_badge',         'ultra', true),
  ('account_verified',        'free',  false),
  ('account_verified',        'pro',   false),
  ('account_verified',        'ultra', true),
  ('story_pin',               'free',  false),
  ('story_pin',               'pro',   true),
  ('story_pin',               'ultra', true),
  ('bio_sections',            'free',  false),
  ('bio_sections',            'pro',   true),
  ('bio_sections',            'ultra', true),
  ('bio_quote',               'free',  false),
  ('bio_quote',               'pro',   true),
  ('bio_quote',               'ultra', true),
  ('bio_extended_favorites',  'free',  false),
  ('bio_extended_favorites',  'pro',   true),
  ('bio_extended_favorites',  'ultra', true),
  ('priority_support',        'free',  false),
  ('priority_support',        'pro',   true),
  ('priority_support',        'ultra', true)
ON CONFLICT ("feature_key", "plan") DO NOTHING;

-- ============================================================
-- 11. Row Level Security (RLS)
-- ============================================================

-- Enable RLS
ALTER TABLE "profile_frames"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "profile_titles"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_titles"        ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_identity_perks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "media_custom_covers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_feature_flags" ENABLE ROW LEVEL SECURITY;

-- PROFILE FRAMES (public catalog, admin-managed via service role)
CREATE POLICY "Profile frames are viewable by everyone"
  ON "profile_frames" FOR SELECT USING (true);

-- PROFILE TITLES (public catalog, admin-managed via service role)
CREATE POLICY "Profile titles are viewable by everyone"
  ON "profile_titles" FOR SELECT USING (true);

-- USER TITLES (public — shows on profile; writes via service role / backend)
CREATE POLICY "User titles are viewable by everyone"
  ON "user_titles" FOR SELECT USING (true);
CREATE POLICY "Users can insert own titles"
  ON "user_titles" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own titles"
  ON "user_titles" FOR DELETE USING (auth.uid() = user_id);

-- USER IDENTITY PERKS (public — frame/title/badge shown on profile; owner writes)
CREATE POLICY "User identity perks are viewable by everyone"
  ON "user_identity_perks" FOR SELECT USING (true);
CREATE POLICY "Users can insert own identity perks"
  ON "user_identity_perks" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own identity perks"
  ON "user_identity_perks" FOR UPDATE USING (auth.uid() = user_id);

-- MEDIA CUSTOM COVERS (private — only owner sees and manages their covers)
CREATE POLICY "Users can view own custom covers"
  ON "media_custom_covers" FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom covers"
  ON "media_custom_covers" FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom covers"
  ON "media_custom_covers" FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom covers"
  ON "media_custom_covers" FOR DELETE USING (auth.uid() = user_id);

-- PLAN FEATURE FLAGS (public read for feature checks; writes via service role only)
CREATE POLICY "Feature flags are viewable by everyone"
  ON "plan_feature_flags" FOR SELECT USING (true);
