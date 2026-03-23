-- ================================================
-- PLATFORM ANNOUNCEMENTS
-- ================================================

CREATE TABLE IF NOT EXISTS platform_announcements (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  message          TEXT NOT NULL,
  type             TEXT NOT NULL DEFAULT 'info',        -- info | warning | success | promo
  image_url        TEXT,
  action_label     TEXT,
  action_url       TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  dismissible      BOOLEAN DEFAULT TRUE,
  target_audience  TEXT NOT NULL DEFAULT 'all',         -- all | premium | free
  start_at         TIMESTAMPTZ DEFAULT NOW(),
  end_at           TIMESTAMPTZ,                         -- NULL = sem expiração
  created_by       UUID REFERENCES "user"(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active      ON platform_announcements (is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by  ON platform_announcements (created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_start_at    ON platform_announcements (start_at DESC);

-- ── Auto-update updated_at ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_announcements_updated_at
  BEFORE UPDATE ON platform_announcements
  FOR EACH ROW EXECUTE FUNCTION update_announcements_updated_at();

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Anyone can read active announcements (public endpoint)
CREATE POLICY "Announcements are publicly readable"
  ON platform_announcements
  FOR SELECT
  USING (
    is_active = TRUE
    AND start_at <= NOW()
    AND (end_at IS NULL OR end_at > NOW())
  );

-- Only admins (service role / backend) can insert
CREATE POLICY "Only service role can insert announcements"
  ON platform_announcements
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Only admins can update
CREATE POLICY "Only service role can update announcements"
  ON platform_announcements
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Only admins can delete
CREATE POLICY "Only service role can delete announcements"
  ON platform_announcements
  FOR DELETE
  USING (auth.role() = 'service_role');
