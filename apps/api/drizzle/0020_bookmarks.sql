CREATE TABLE IF NOT EXISTS "bookmarks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "target_type" text NOT NULL,
  "target_id" uuid NOT NULL,
  "note" text,
  "created_at" timestamp with time zone DEFAULT now(),
  CONSTRAINT "unique_user_bookmark" UNIQUE("user_id", "target_type", "target_id")
);

CREATE INDEX IF NOT EXISTS "idx_bookmarks_user" ON "bookmarks" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_bookmarks_target" ON "bookmarks" ("target_type", "target_id");
CREATE INDEX IF NOT EXISTS "idx_bookmarks_user_type" ON "bookmarks" ("user_id", "target_type");

-- Row Level Security
ALTER TABLE "bookmarks" ENABLE ROW LEVEL SECURITY;

-- Bookmarks are private — only the owner can view, insert, update, or delete
CREATE POLICY "Users can view own bookmarks" ON "bookmarks"
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks" ON "bookmarks"
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookmarks" ON "bookmarks"
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks" ON "bookmarks"
  FOR DELETE USING (auth.uid() = user_id);
