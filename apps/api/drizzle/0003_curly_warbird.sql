-- Custom SQL migration file, put your code below! ---- ================================================
-- CLUBS SYSTEM: Schema + RLS
-- ================================================

-- ─── Enums ───────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE club_role AS ENUM ('owner', 'moderator', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE club_invite_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE club_join_request_status AS ENUM ('pending', 'accepted', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE club_event_rsvp_status AS ENUM ('going', 'interested', 'not_going');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── clubs ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "clubs" (
  "id"                  uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name"                text NOT NULL,
  "slug"                text UNIQUE NOT NULL,
  "description"         text,
  "cover_url"           text,
  "is_public"           boolean NOT NULL DEFAULT true,
  "allow_join_requests" boolean NOT NULL DEFAULT false,
  "categories"          text[] NOT NULL DEFAULT '{}',
  "member_count"        integer NOT NULL DEFAULT 1,
  "max_members"         integer NOT NULL,
  "owner_id"            uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at"          timestamptz DEFAULT now(),
  "updated_at"          timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_clubs_owner   ON clubs (owner_id);
CREATE INDEX IF NOT EXISTS idx_clubs_public  ON clubs (is_public);
CREATE INDEX IF NOT EXISTS idx_clubs_created ON clubs (created_at);

-- ─── club_members ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_members" (
  "id"        uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id"   uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  "user_id"   uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "role"      club_role NOT NULL DEFAULT 'member',
  "joined_at" timestamptz DEFAULT now(),
  UNIQUE ("club_id", "user_id")
);

CREATE INDEX IF NOT EXISTS idx_club_members_club ON club_members (club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user ON club_members (user_id);

-- ─── club_invites ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_invites" (
  "id"               uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id"          uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  "invited_by"       uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "invited_user_id"  uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "status"           club_invite_status NOT NULL DEFAULT 'pending',
  "expires_at"       timestamptz NOT NULL,
  "created_at"       timestamptz DEFAULT now(),
  UNIQUE ("club_id", "invited_user_id")
);

CREATE INDEX IF NOT EXISTS idx_club_invites_invited ON club_invites (invited_user_id);
CREATE INDEX IF NOT EXISTS idx_club_invites_club    ON club_invites (club_id);

-- ─── club_join_requests ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_join_requests" (
  "id"            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id"       uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  "user_id"       uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "message"       text,
  "status"        club_join_request_status NOT NULL DEFAULT 'pending',
  "responded_by"  uuid REFERENCES "user"(id),
  "responded_at"  timestamptz,
  "created_at"    timestamptz DEFAULT now(),
  UNIQUE ("club_id", "user_id")
);

CREATE INDEX IF NOT EXISTS idx_join_requests_club ON club_join_requests (club_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_user ON club_join_requests (user_id);

-- ─── club_watchlist_items ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_watchlist_items" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id"            uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  "media_id"           uuid REFERENCES media(id) ON DELETE CASCADE,
  "media_title"        text NOT NULL,
  "media_poster_path"  text,
  "media_type"         text NOT NULL,
  "suggested_by"       uuid REFERENCES "user"(id) ON DELETE SET NULL,
  "note"               text,
  "is_watched"         boolean NOT NULL DEFAULT false,
  "watched_at"         timestamptz,
  "added_at"           timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_watchlist_club   ON club_watchlist_items (club_id);
CREATE INDEX IF NOT EXISTS idx_club_watchlist_media  ON club_watchlist_items (media_id);

-- ─── club_screening_events ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_screening_events" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id"            uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  "title"              text NOT NULL,
  "description"        text,
  "media_id"           uuid REFERENCES media(id) ON DELETE SET NULL,
  "media_title"        text,
  "media_poster_path"  text,
  "scheduled_at"       timestamptz NOT NULL,
  "meet_link"          text,
  "going_count"        integer NOT NULL DEFAULT 0,
  "interested_count"   integer NOT NULL DEFAULT 0,
  "created_by"         uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "created_at"         timestamptz DEFAULT now(),
  "updated_at"         timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_events_club      ON club_screening_events (club_id);
CREATE INDEX IF NOT EXISTS idx_club_events_scheduled ON club_screening_events (scheduled_at);

-- ─── club_event_rsvps ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_event_rsvps" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "event_id"   uuid NOT NULL REFERENCES club_screening_events(id) ON DELETE CASCADE,
  "user_id"    uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "status"     club_event_rsvp_status NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  UNIQUE ("event_id", "user_id")
);

CREATE INDEX IF NOT EXISTS idx_event_rsvps_event ON club_event_rsvps (event_id);
CREATE INDEX IF NOT EXISTS idx_event_rsvps_user  ON club_event_rsvps (user_id);

-- ─── club_posts ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_posts" (
  "id"             uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id"        uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  "user_id"        uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "media_id"       uuid REFERENCES media(id) ON DELETE SET NULL,
  "media_title"    text,
  "title"          text NOT NULL,
  "content"        text NOT NULL,
  "is_pinned"      boolean NOT NULL DEFAULT false,
  "comments_count" integer NOT NULL DEFAULT 0,
  "created_at"     timestamptz DEFAULT now(),
  "updated_at"     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_posts_club   ON club_posts (club_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_user   ON club_posts (user_id);
CREATE INDEX IF NOT EXISTS idx_club_posts_pinned ON club_posts (club_id, is_pinned);

-- ─── club_post_comments ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_post_comments" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id"    uuid NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
  "user_id"    uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "content"    text NOT NULL,
  "created_at" timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON club_post_comments (post_id);

-- ─── club_polls ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_polls" (
  "id"          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "club_id"     uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  "created_by"  uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "question"    text NOT NULL,
  "total_votes" integer NOT NULL DEFAULT 0,
  "expires_at"  timestamptz,
  "created_at"  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_club_polls_club ON club_polls (club_id);

-- ─── club_poll_options ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_poll_options" (
  "id"                 uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "poll_id"            uuid NOT NULL REFERENCES club_polls(id) ON DELETE CASCADE,
  "text"               text NOT NULL,
  "media_id"           uuid REFERENCES media(id) ON DELETE SET NULL,
  "media_poster_path"  text,
  "votes_count"        integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON club_poll_options (poll_id);

-- ─── club_poll_votes ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "club_poll_votes" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "poll_id"    uuid NOT NULL REFERENCES club_polls(id) ON DELETE CASCADE,
  "option_id"  uuid NOT NULL REFERENCES club_poll_options(id) ON DELETE CASCADE,
  "user_id"    uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now(),
  UNIQUE ("poll_id", "user_id")
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON club_poll_votes (poll_id);

-- ================================================
-- RLS: BETTER AUTH TABLES
-- These tables are managed exclusively by the API
-- server using the service role. Direct client
-- access is blocked entirely.
-- ================================================

ALTER TABLE "user"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "two_factor"   ENABLE ROW LEVEL SECURITY;

-- No permissive policies — service role bypasses RLS;
-- anon / authenticated roles get no direct access.

-- ================================================
-- RLS: CLUBS TABLES
-- ================================================

ALTER TABLE clubs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_members         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_invites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_join_requests   ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_watchlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_screening_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_event_rsvps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_posts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_post_comments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_polls           ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_poll_options    ENABLE ROW LEVEL SECURITY;
ALTER TABLE club_poll_votes      ENABLE ROW LEVEL SECURITY;

-- Helper: is the calling user a member of a club?
CREATE OR REPLACE FUNCTION is_club_member(p_club_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is the calling user owner or moderator?
CREATE OR REPLACE FUNCTION is_club_mod(p_club_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM club_members
    WHERE club_id = p_club_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'moderator')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- CLUBS
-- Public clubs are readable by all; private clubs only by members.
CREATE POLICY "clubs_select" ON clubs FOR SELECT USING (
  is_public = true OR is_club_member(id)
);
CREATE POLICY "clubs_insert" ON clubs FOR INSERT WITH CHECK (
  auth.uid() = owner_id
);
CREATE POLICY "clubs_update" ON clubs FOR UPDATE USING (
  is_club_mod(id)
);
CREATE POLICY "clubs_delete" ON clubs FOR DELETE USING (
  EXISTS (SELECT 1 FROM club_members WHERE club_id = id AND user_id = auth.uid() AND role = 'owner')
);

-- CLUB MEMBERS
CREATE POLICY "club_members_select" ON club_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM clubs WHERE clubs.id = club_id AND (clubs.is_public = true OR is_club_member(club_id)))
);
CREATE POLICY "club_members_insert" ON club_members FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "club_members_delete" ON club_members FOR DELETE USING (
  auth.uid() = user_id OR is_club_mod(club_id)
);
CREATE POLICY "club_members_update" ON club_members FOR UPDATE USING (
  is_club_mod(club_id)
);

-- CLUB INVITES
CREATE POLICY "club_invites_select" ON club_invites FOR SELECT USING (
  auth.uid() = invited_user_id OR auth.uid() = invited_by OR is_club_mod(club_id)
);
CREATE POLICY "club_invites_insert" ON club_invites FOR INSERT WITH CHECK (
  is_club_member(club_id)
);
CREATE POLICY "club_invites_update" ON club_invites FOR UPDATE USING (
  auth.uid() = invited_user_id OR is_club_mod(club_id)
);
CREATE POLICY "club_invites_delete" ON club_invites FOR DELETE USING (
  auth.uid() = invited_by OR is_club_mod(club_id)
);

-- CLUB JOIN REQUESTS
CREATE POLICY "club_join_requests_select" ON club_join_requests FOR SELECT USING (
  auth.uid() = user_id OR is_club_mod(club_id)
);
CREATE POLICY "club_join_requests_insert" ON club_join_requests FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "club_join_requests_update" ON club_join_requests FOR UPDATE USING (
  is_club_mod(club_id)
);
CREATE POLICY "club_join_requests_delete" ON club_join_requests FOR DELETE USING (
  auth.uid() = user_id OR is_club_mod(club_id)
);

-- CLUB WATCHLIST ITEMS (members only)
CREATE POLICY "club_watchlist_select" ON club_watchlist_items FOR SELECT USING (
  is_club_member(club_id)
);
CREATE POLICY "club_watchlist_insert" ON club_watchlist_items FOR INSERT WITH CHECK (
  is_club_member(club_id)
);
CREATE POLICY "club_watchlist_update" ON club_watchlist_items FOR UPDATE USING (
  is_club_member(club_id)
);
CREATE POLICY "club_watchlist_delete" ON club_watchlist_items FOR DELETE USING (
  auth.uid() = suggested_by OR is_club_mod(club_id)
);

-- CLUB SCREENING EVENTS (members only)
CREATE POLICY "club_events_select" ON club_screening_events FOR SELECT USING (
  is_club_member(club_id)
);
CREATE POLICY "club_events_insert" ON club_screening_events FOR INSERT WITH CHECK (
  is_club_mod(club_id)
);
CREATE POLICY "club_events_update" ON club_screening_events FOR UPDATE USING (
  auth.uid() = created_by OR is_club_mod(club_id)
);
CREATE POLICY "club_events_delete" ON club_screening_events FOR DELETE USING (
  auth.uid() = created_by OR is_club_mod(club_id)
);

-- CLUB EVENT RSVPs
CREATE POLICY "club_rsvps_select" ON club_event_rsvps FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_screening_events e
    WHERE e.id = event_id AND is_club_member(e.club_id)
  )
);
CREATE POLICY "club_rsvps_insert" ON club_event_rsvps FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "club_rsvps_update" ON club_event_rsvps FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "club_rsvps_delete" ON club_event_rsvps FOR DELETE USING (
  auth.uid() = user_id
);

-- CLUB POSTS (members only)
CREATE POLICY "club_posts_select" ON club_posts FOR SELECT USING (
  is_club_member(club_id)
);
CREATE POLICY "club_posts_insert" ON club_posts FOR INSERT WITH CHECK (
  is_club_member(club_id) AND auth.uid() = user_id
);
CREATE POLICY "club_posts_update" ON club_posts FOR UPDATE USING (
  auth.uid() = user_id OR is_club_mod(club_id)
);
CREATE POLICY "club_posts_delete" ON club_posts FOR DELETE USING (
  auth.uid() = user_id OR is_club_mod(club_id)
);

-- CLUB POST COMMENTS
CREATE POLICY "club_comments_select" ON club_post_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_posts p
    WHERE p.id = post_id AND is_club_member(p.club_id)
  )
);
CREATE POLICY "club_comments_insert" ON club_post_comments FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM club_posts p
    WHERE p.id = post_id AND is_club_member(p.club_id)
  )
);
CREATE POLICY "club_comments_delete" ON club_post_comments FOR DELETE USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM club_posts p
    JOIN club_members m ON m.club_id = p.club_id
    WHERE p.id = post_id AND m.user_id = auth.uid() AND m.role IN ('owner', 'moderator')
  )
);

-- CLUB POLLS
CREATE POLICY "club_polls_select" ON club_polls FOR SELECT USING (
  is_club_member(club_id)
);
CREATE POLICY "club_polls_insert" ON club_polls FOR INSERT WITH CHECK (
  is_club_mod(club_id) AND auth.uid() = created_by
);
CREATE POLICY "club_polls_update" ON club_polls FOR UPDATE USING (
  auth.uid() = created_by OR is_club_mod(club_id)
);
CREATE POLICY "club_polls_delete" ON club_polls FOR DELETE USING (
  auth.uid() = created_by OR is_club_mod(club_id)
);

-- CLUB POLL OPTIONS
CREATE POLICY "club_poll_options_select" ON club_poll_options FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_polls p
    WHERE p.id = poll_id AND is_club_member(p.club_id)
  )
);
CREATE POLICY "club_poll_options_insert" ON club_poll_options FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM club_polls p
    WHERE p.id = poll_id AND is_club_mod(p.club_id)
  )
);

-- CLUB POLL VOTES
CREATE POLICY "club_poll_votes_select" ON club_poll_votes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_polls p
    WHERE p.id = poll_id AND is_club_member(p.club_id)
  )
);
CREATE POLICY "club_poll_votes_insert" ON club_poll_votes FOR INSERT WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM club_polls p
    WHERE p.id = poll_id AND is_club_member(p.club_id)
  )
);
CREATE POLICY "club_poll_votes_update" ON club_poll_votes FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "club_poll_votes_delete" ON club_poll_votes FOR DELETE USING (
  auth.uid() = user_id
);
