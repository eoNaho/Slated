-- ================================================
-- MIGRATION 0025: Security Fixes
-- Date: 2026-03-28
-- Fixes 6 critical/high vulnerabilities found during security audit
-- ================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 1: user_similarity_cache — ALL USING (true) aberto a todos
-- Antes: qualquer um podia ler, inserir, atualizar e deletar toda a tabela
-- Depois: apenas service_role gerencia; usuários só veem sua própria cache
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Service can manage similarity cache" ON user_similarity_cache;
DROP POLICY IF EXISTS "Users can view own similarity cache" ON user_similarity_cache;

CREATE POLICY "service_role_manages_similarity_cache"
  ON user_similarity_cache FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "users_view_own_similarity_cache"
  ON user_similarity_cache FOR SELECT
  USING (auth.uid() = user_id_a OR auth.uid() = user_id_b);


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 2: clubs DELETE — bug de lógica (comparava club_members com ele mesmo)
-- Antes: club_members.club_id = club_members.id → sempre falso, owners não conseguiam deletar
-- Depois: referência correta para clubs.id
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "clubs_delete" ON clubs;

CREATE POLICY "clubs_delete"
  ON clubs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM club_members
      WHERE club_members.club_id = clubs.id
        AND club_members.user_id = auth.uid()
        AND club_members.role = 'owner'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 3: diary — SELECT público para todos (exposia diário privado de todos)
-- Antes: USING (true) → qualquer pessoa lia o diário de qualquer usuário
-- Depois: respeita visibility_diary da tabela user_settings
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Diary entries are viewable by everyone" ON diary;

CREATE POLICY "diary_select_with_privacy"
  ON diary FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_settings s
      WHERE s.user_id = diary.user_id
        AND s.visibility_diary = 'public'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 4: episode_progress — SELECT público para todos
-- Antes: USING (true) → histórico de episódios de todos os usuários exposto
-- Depois: dono vê o próprio; outros só se visibility_activity = 'public'
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Episode progress is viewable by everyone" ON episode_progress;

CREATE POLICY "episode_progress_select_with_privacy"
  ON episode_progress FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_settings s
      WHERE s.user_id = episode_progress.user_id
        AND s.visibility_activity = 'public'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 5: current_activity — SELECT público para todos
-- Antes: USING (true) → o que cada usuário está assistindo AGORA era visível a todos
-- Depois: dono vê o próprio; outros só se visibility_activity = 'public'
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Anyone can view current activity" ON current_activity;

CREATE POLICY "current_activity_select_with_privacy"
  ON current_activity FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM user_settings s
      WHERE s.user_id = current_activity.user_id
        AND s.visibility_activity = 'public'
    )
  );


-- ─────────────────────────────────────────────────────────────────────────────
-- FIX 6: Funções SECURITY DEFINER — EXECUTE aberto ao anon e authenticated
-- Antes: qualquer chamador (incluindo anon via REST) podia invocar diretamente
-- Depois: apenas service_role (backend) pode chamar essas funções privilegiadas
--
-- Nota: is_club_member e is_club_mod NÃO são revogados — são usados em políticas RLS
-- ─────────────────────────────────────────────────────────────────────────────

-- add_user_xp: permitia dar XP arbitrário para qualquer user_id
REVOKE EXECUTE ON FUNCTION add_user_xp(uuid, integer, text, text) FROM anon, authenticated;

-- create_notification: permitia spam de notificações para qualquer usuário
REVOKE EXECUTE ON FUNCTION create_notification(uuid, text, text, text, jsonb) FROM anon, authenticated;

-- cleanup_expired_sessions: permitia destruir todas as sessões ativas do sistema
REVOKE EXECUTE ON FUNCTION cleanup_expired_sessions() FROM anon, authenticated;

-- increment_likes / decrement_likes: permitia manipular contadores de likes arbitrariamente
REVOKE EXECUTE ON FUNCTION increment_likes(text, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION decrement_likes(text, uuid) FROM anon, authenticated;

-- log_audit_event: permitia injetar eventos falsos no log de auditoria
REVOKE EXECUTE ON FUNCTION log_audit_event(uuid, text, text, uuid, inet, text, jsonb) FROM anon, authenticated;
