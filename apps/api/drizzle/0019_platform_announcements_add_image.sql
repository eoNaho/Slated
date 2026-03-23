-- Add image_url column to platform_announcements
ALTER TABLE platform_announcements
  ADD COLUMN IF NOT EXISTS image_url TEXT;
