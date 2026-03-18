-- Add event type enum and column to club_screening_events

DO $$ BEGIN
  CREATE TYPE club_event_type AS ENUM ('watch', 'discussion');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "club_screening_events"
  ADD COLUMN IF NOT EXISTS "event_type" club_event_type NOT NULL DEFAULT 'watch';
