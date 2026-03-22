-- Moderation system: new tables + column additions

-- user_blocks
CREATE TABLE IF NOT EXISTS "user_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "blocker_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "blocked_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "reason" text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_block" UNIQUE("blocker_id", "blocked_id"),
  CONSTRAINT "no_self_block" CHECK ("blocker_id" != "blocked_id")
);
CREATE INDEX IF NOT EXISTS "idx_blocks_blocker" ON "user_blocks" ("blocker_id");
CREATE INDEX IF NOT EXISTS "idx_blocks_blocked" ON "user_blocks" ("blocked_id");

-- moderation_actions
CREATE TABLE IF NOT EXISTS "moderation_actions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "moderator_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "target_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "action" text NOT NULL,
  "reason" text,
  "report_id" uuid REFERENCES "reports"("id") ON DELETE SET NULL,
  "metadata" text,
  "automated" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_mod_actions_target_user" ON "moderation_actions" ("target_user_id");
CREATE INDEX IF NOT EXISTS "idx_mod_actions_moderator" ON "moderation_actions" ("moderator_id");
CREATE INDEX IF NOT EXISTS "idx_mod_actions_created" ON "moderation_actions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_mod_actions_target" ON "moderation_actions" ("target_type", "target_id");

-- content_flags
CREATE TABLE IF NOT EXISTS "content_flags" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "flag_type" text NOT NULL,
  "severity" text NOT NULL DEFAULT 'low',
  "details" text,
  "auto_actioned" boolean DEFAULT false,
  "reviewed_by" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "reviewed_at" timestamp with time zone,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp with time zone DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_content_flags_target" ON "content_flags" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "idx_content_flags_status" ON "content_flags" ("status");
CREATE INDEX IF NOT EXISTS "idx_content_flags_created" ON "content_flags" ("created_at");

-- word_blocklist
CREATE TABLE IF NOT EXISTS "word_blocklist" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "word" text NOT NULL,
  "match_type" text NOT NULL DEFAULT 'exact',
  "severity" text NOT NULL DEFAULT 'medium',
  "category" text NOT NULL DEFAULT 'profanity',
  "is_active" boolean NOT NULL DEFAULT true,
  "added_by" uuid REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_blocklist_word" UNIQUE("word", "match_type")
);
CREATE INDEX IF NOT EXISTS "idx_blocklist_active" ON "word_blocklist" ("is_active");

-- Add moderation columns to reviews
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "hidden_reason" text;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "hidden_at" timestamp with time zone;
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "hidden_by" uuid REFERENCES "user"("id") ON DELETE SET NULL;

-- Add moderation columns to comments
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "is_hidden" boolean DEFAULT false;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "hidden_reason" text;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "hidden_at" timestamp with time zone;
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "hidden_by" uuid REFERENCES "user"("id") ON DELETE SET NULL;

-- Add resolution_note to reports
ALTER TABLE "reports" ADD COLUMN IF NOT EXISTS "resolution_note" text;

-- ================================================
-- ROW LEVEL SECURITY
-- ================================================

-- Enable RLS on new tables
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_blocklist ENABLE ROW LEVEL SECURITY;

-- USER BLOCKS
-- Users manage their own blocks; blocked party can see they are blocked (to know why content is filtered)
CREATE POLICY "Users can view own blocks" ON user_blocks
  FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
CREATE POLICY "Users can create own blocks" ON user_blocks
  FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can delete own blocks" ON user_blocks
  FOR DELETE USING (auth.uid() = blocker_id);

-- MODERATION ACTIONS
-- Only staff (moderator/admin) can read; inserts via service role only
CREATE POLICY "Staff can view moderation actions" ON moderation_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );
-- Target user can see actions against them (so they understand why content was hidden)
CREATE POLICY "Users can view own moderation history" ON moderation_actions
  FOR SELECT USING (auth.uid() = target_user_id);

-- CONTENT FLAGS
-- Only staff can view and manage content flags
CREATE POLICY "Staff can manage content flags" ON content_flags
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );

-- WORD BLOCKLIST
-- Only admins can manage; read allowed for staff (to inspect current list)
CREATE POLICY "Staff can view blocklist" ON word_blocklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role IN ('admin', 'moderator')
    )
  );
CREATE POLICY "Admins can manage blocklist" ON word_blocklist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM "user" u WHERE u.id = auth.uid() AND u.role = 'admin'
    )
  );
