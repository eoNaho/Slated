-- Stories v2: archive, visibility, slides, highlights, quiz, question_box, close_friends

-- ── Add columns to stories ────────────────────────────────────────────────────
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "is_archived" boolean DEFAULT false;
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "visibility" text DEFAULT 'public';
ALTER TABLE "stories" ADD COLUMN IF NOT EXISTS "slides" jsonb;

-- ── New indexes ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS "idx_stories_archived" ON "stories"("user_id", "is_archived");
CREATE INDEX IF NOT EXISTS "idx_stories_visibility" ON "stories"("visibility");

-- ── Close Friends ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "close_friends" (
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "friend_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("user_id", "friend_id"),
  CONSTRAINT "no_self_close_friend" CHECK ("user_id" != "friend_id")
);
CREATE INDEX IF NOT EXISTS "idx_close_friends_user" ON "close_friends"("user_id");

-- ── Story Highlights ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "story_highlights" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "cover_image_url" text,
  "position" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "idx_highlights_user" ON "story_highlights"("user_id", "position");

-- ── Story Highlight Items ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "story_highlight_items" (
  "highlight_id" uuid NOT NULL REFERENCES "story_highlights"("id") ON DELETE CASCADE,
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "position" integer DEFAULT 0,
  "added_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("highlight_id", "story_id")
);
CREATE INDEX IF NOT EXISTS "idx_highlight_items" ON "story_highlight_items"("highlight_id", "position");

-- ── Story Quiz Answers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "story_quiz_answers" (
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "answer_index" integer NOT NULL,
  "is_correct" boolean NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  PRIMARY KEY ("story_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_quiz_answers_story" ON "story_quiz_answers"("story_id");

-- ── Story Question Box Responses ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "story_question_responses" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "story_id" uuid NOT NULL REFERENCES "stories"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "response" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_question_response" UNIQUE ("story_id", "user_id")
);
CREATE INDEX IF NOT EXISTS "idx_question_responses_story" ON "story_question_responses"("story_id");

-- ── Backfill: archive currently expired stories ───────────────────────────────
UPDATE "stories" SET "is_archived" = true WHERE "is_expired" = true;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE "close_friends" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_highlights" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_highlight_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_quiz_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "story_question_responses" ENABLE ROW LEVEL SECURITY;

-- CLOSE FRIENDS
CREATE POLICY "Users can view own close friends list"
  ON "close_friends" FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add close friends"
  ON "close_friends" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own close friends"
  ON "close_friends" FOR DELETE
  USING (auth.uid() = user_id);

-- STORY HIGHLIGHTS
-- Public can view highlights of any user
CREATE POLICY "Story highlights are viewable by everyone"
  ON "story_highlights" FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own highlights"
  ON "story_highlights" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own highlights"
  ON "story_highlights" FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own highlights"
  ON "story_highlights" FOR DELETE
  USING (auth.uid() = user_id);

-- STORY HIGHLIGHT ITEMS
CREATE POLICY "Highlight items are viewable by everyone"
  ON "story_highlight_items" FOR SELECT
  USING (true);

CREATE POLICY "Highlight owner can manage items"
  ON "story_highlight_items" FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "story_highlights"
      WHERE id = highlight_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Highlight owner can delete items"
  ON "story_highlight_items" FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "story_highlights"
      WHERE id = highlight_id AND user_id = auth.uid()
    )
  );

-- STORY QUIZ ANSWERS
CREATE POLICY "Quiz answers are viewable by story owner and the answerer"
  ON "story_quiz_answers" FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM stories WHERE stories.id = story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own quiz answers"
  ON "story_quiz_answers" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- STORY QUESTION RESPONSES
CREATE POLICY "Question responses viewable by story owner and the responder"
  ON "story_question_responses" FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM stories WHERE stories.id = story_id AND stories.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own question responses"
  ON "story_question_responses" FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own question responses"
  ON "story_question_responses" FOR UPDATE
  USING (auth.uid() = user_id);
