-- ============================================================
-- 0024: Clubs Reddit-Like System
-- Upvote/downvote em posts e comments, threading, flairs
-- ============================================================

-- ─── 1. Adicionar colunas em club_posts ──────────────────────────────────────

ALTER TABLE "club_posts"
  ADD COLUMN "score"          integer NOT NULL DEFAULT 0,
  ADD COLUMN "upvote_count"   integer NOT NULL DEFAULT 0,
  ADD COLUMN "downvote_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN "flair"          text,
  ADD COLUMN "flair_color"    text;

-- ─── 2. Adicionar colunas em club_post_comments ──────────────────────────────

ALTER TABLE "club_post_comments"
  ADD COLUMN "parent_id"      uuid REFERENCES "club_post_comments"("id") ON DELETE CASCADE,
  ADD COLUMN "score"          integer NOT NULL DEFAULT 0,
  ADD COLUMN "upvote_count"   integer NOT NULL DEFAULT 0,
  ADD COLUMN "downvote_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN "depth"          integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "idx_post_comments_parent" ON "club_post_comments"("parent_id");

-- ─── 3. Nova tabela: club_post_votes ─────────────────────────────────────────

CREATE TABLE "club_post_votes" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id"    uuid        NOT NULL REFERENCES "club_posts"("id") ON DELETE CASCADE,
  "user_id"    uuid        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "value"      integer     NOT NULL CHECK ("value" IN (1, -1)),
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_post_vote" UNIQUE("post_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_post_votes_post" ON "club_post_votes"("post_id");

-- ─── 4. Nova tabela: club_comment_votes ──────────────────────────────────────

CREATE TABLE "club_comment_votes" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "comment_id" uuid        NOT NULL REFERENCES "club_post_comments"("id") ON DELETE CASCADE,
  "user_id"    uuid        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "value"      integer     NOT NULL CHECK ("value" IN (1, -1)),
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_comment_vote" UNIQUE("comment_id", "user_id")
);

CREATE INDEX IF NOT EXISTS "idx_comment_votes_comment" ON "club_comment_votes"("comment_id");

-- ─── 5. Nova tabela: club_flairs ─────────────────────────────────────────────

CREATE TABLE "club_flairs" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "club_id"    uuid        NOT NULL REFERENCES "clubs"("id") ON DELETE CASCADE,
  "name"       text        NOT NULL,
  "color"      text        NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  CONSTRAINT "unique_club_flair" UNIQUE("club_id", "name")
);

CREATE INDEX IF NOT EXISTS "idx_club_flairs_club" ON "club_flairs"("club_id");

-- ─── 6. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE "club_post_votes"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "club_comment_votes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "club_flairs"        ENABLE ROW LEVEL SECURITY;

-- CLUB POST VOTES
-- Membros do club podem ver todos os votos do post
CREATE POLICY "club_post_votes_select" ON "club_post_votes" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_posts p
    WHERE p.id = post_id AND is_club_member(p.club_id)
  )
);
-- Apenas membros podem votar em posts do seu club
CREATE POLICY "club_post_votes_insert" ON "club_post_votes" FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM club_posts p
    WHERE p.id = post_id AND is_club_member(p.club_id)
  )
);
-- Usuário pode atualizar/remover o próprio voto
CREATE POLICY "club_post_votes_update" ON "club_post_votes" FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "club_post_votes_delete" ON "club_post_votes" FOR DELETE USING (
  auth.uid() = user_id
);

-- CLUB COMMENT VOTES
-- Membros podem ver votos em comments do seu club
CREATE POLICY "club_comment_votes_select" ON "club_comment_votes" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM club_post_comments c
    JOIN club_posts p ON p.id = c.post_id
    WHERE c.id = comment_id AND is_club_member(p.club_id)
  )
);
CREATE POLICY "club_comment_votes_insert" ON "club_comment_votes" FOR INSERT WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM club_post_comments c
    JOIN club_posts p ON p.id = c.post_id
    WHERE c.id = comment_id AND is_club_member(p.club_id)
  )
);
CREATE POLICY "club_comment_votes_update" ON "club_comment_votes" FOR UPDATE USING (
  auth.uid() = user_id
);
CREATE POLICY "club_comment_votes_delete" ON "club_comment_votes" FOR DELETE USING (
  auth.uid() = user_id
);

-- CLUB FLAIRS
-- Membros podem ver os flairs do club
CREATE POLICY "club_flairs_select" ON "club_flairs" FOR SELECT USING (
  is_club_member(club_id)
);
-- Apenas mods/owner podem criar flairs
CREATE POLICY "club_flairs_insert" ON "club_flairs" FOR INSERT WITH CHECK (
  is_club_mod(club_id)
);
-- Apenas mods/owner podem editar flairs
CREATE POLICY "club_flairs_update" ON "club_flairs" FOR UPDATE USING (
  is_club_mod(club_id)
);
-- Apenas mods/owner podem deletar flairs
CREATE POLICY "club_flairs_delete" ON "club_flairs" FOR DELETE USING (
  is_club_mod(club_id)
);
