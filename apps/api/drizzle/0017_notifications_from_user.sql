-- Add from_user_id to notifications for block filtering

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "from_user_id" uuid REFERENCES "user"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_notifications_from_user" ON "notifications" ("from_user_id");
