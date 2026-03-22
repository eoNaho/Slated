ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cover_position" text DEFAULT '50% 50%';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "cover_zoom" integer DEFAULT 100;
