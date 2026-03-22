-- Gallery: media_videos and media_images tables

CREATE TABLE IF NOT EXISTS "media_videos" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "media_id"     uuid NOT NULL REFERENCES "media"("id") ON DELETE CASCADE,
  "tmdb_key"     text NOT NULL,
  "name"         text NOT NULL,
  "type"         text NOT NULL,
  "site"         text NOT NULL,
  "official"     boolean DEFAULT true,
  "size"         integer,
  "published_at" timestamp with time zone,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "uq_media_videos_media_key" UNIQUE ("media_id", "tmdb_key")
);

CREATE INDEX IF NOT EXISTS "idx_media_videos_media_id" ON "media_videos" ("media_id");

-- RLS
ALTER TABLE "media_videos" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_videos_read_all"  ON "media_videos" FOR SELECT USING (true);
CREATE POLICY "media_videos_write_none" ON "media_videos" FOR ALL USING (false);

-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "media_images" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "media_id"     uuid NOT NULL REFERENCES "media"("id") ON DELETE CASCADE,
  "image_type"   text NOT NULL,
  "file_path"    text NOT NULL,
  "width"        integer,
  "height"       integer,
  "language"     text,
  "vote_average" real DEFAULT 0,
  "vote_count"   integer DEFAULT 0,
  "created_at"   timestamp with time zone DEFAULT now(),
  CONSTRAINT "uq_media_images_media_type_path" UNIQUE ("media_id", "image_type", "file_path")
);

CREATE INDEX IF NOT EXISTS "idx_media_images_media_id" ON "media_images" ("media_id");
CREATE INDEX IF NOT EXISTS "idx_media_images_type"     ON "media_images" ("media_id", "image_type");

-- RLS
ALTER TABLE "media_images" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_images_read_all"   ON "media_images" FOR SELECT USING (true);
CREATE POLICY "media_images_write_none" ON "media_images" FOR ALL USING (false);
