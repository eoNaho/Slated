-- ================================================
-- STORIES SYSTEM — Tables, RLS, Triggers, Indexes
-- ================================================

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE stories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  type            text NOT NULL,  -- 'watch' | 'list' | 'rating' | 'poll' | 'hot_take' | 'rewind'
  content         jsonb NOT NULL,
  image_url       text,
  is_pinned       boolean DEFAULT false,
  is_expired      boolean DEFAULT false,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  views_count     integer DEFAULT 0,
  reactions_count integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),

  CONSTRAINT valid_story_type CHECK (type IN ('watch', 'list', 'rating', 'poll', 'hot_take', 'rewind'))
);

CREATE TABLE story_views (
  story_id    uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id   uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  viewed_at   timestamptz DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

CREATE TABLE story_reactions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id     uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  reaction     text NOT NULL,  -- 'agree' | 'disagree' | emoji string
  text_reply   text,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (story_id, user_id)
);

CREATE TABLE story_poll_votes (
  story_id      uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  option_index  integer NOT NULL,
  created_at    timestamptz DEFAULT now(),
  PRIMARY KEY (story_id, user_id)
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX idx_stories_user     ON stories(user_id, expires_at);
CREATE INDEX idx_stories_feed     ON stories(is_expired, expires_at);
CREATE INDEX idx_stories_created  ON stories(created_at);
CREATE INDEX idx_story_views_story      ON story_views(story_id);
CREATE INDEX idx_story_reactions_story  ON story_reactions(story_id);
CREATE INDEX idx_story_poll_votes_story ON story_poll_votes(story_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_poll_votes ENABLE ROW LEVEL SECURITY;

-- STORIES
-- Public can see non-expired stories (or pinned), owner sees all their own
CREATE POLICY "Stories are viewable when active or pinned"
  ON stories FOR SELECT
  USING (is_expired = false OR is_pinned = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own stories"
  ON stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stories"
  ON stories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
  ON stories FOR DELETE
  USING (auth.uid() = user_id);

-- STORY VIEWS
CREATE POLICY "Story views are insertable by authenticated users"
  ON story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Story owner can view who saw their stories"
  ON story_views FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
    OR auth.uid() = viewer_id
  );

-- STORY REACTIONS
CREATE POLICY "Reactions are viewable by everyone"
  ON story_reactions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own reactions"
  ON story_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON story_reactions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON story_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- STORY POLL VOTES
CREATE POLICY "Poll votes are viewable by everyone"
  ON story_poll_votes FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own poll votes"
  ON story_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Triggers ──────────────────────────────────────────────────────────────────

-- Auto-increment views_count when a view is inserted
CREATE OR REPLACE FUNCTION increment_story_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE stories SET views_count = views_count + 1 WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_increment_story_views
AFTER INSERT ON story_views
FOR EACH ROW EXECUTE FUNCTION increment_story_views();

-- Auto-increment/decrement reactions_count
CREATE OR REPLACE FUNCTION update_story_reactions_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE stories SET reactions_count = reactions_count + 1 WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE stories SET reactions_count = GREATEST(reactions_count - 1, 0) WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_story_reactions_count
AFTER INSERT OR DELETE ON story_reactions
FOR EACH ROW EXECUTE FUNCTION update_story_reactions_count();
