-- ============================================================
-- 0026: Consent / Terms Acceptance Tables
-- LGPD Art. 7/8 compliance - immutable consent audit log
-- Date: 2026-03-28
-- ============================================================

-- ─── 1. terms_versions — published legal document versions ───────────────────

CREATE TABLE IF NOT EXISTS "terms_versions" (
  "id"            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_type" text        NOT NULL CHECK ("document_type" IN ('terms', 'privacy')),
  "version"       text        NOT NULL,
  "effective_at"  timestamptz NOT NULL,
  "summary"       text,
  "created_at"    timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. consent_records — immutable consent audit log ────────────────────────

CREATE TABLE IF NOT EXISTS "consent_records" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          uuid        NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "terms_version_id" uuid        NOT NULL REFERENCES "terms_versions"("id"),
  "accepted_at"      timestamptz NOT NULL DEFAULT now(),
  "ip_address"       text,
  "user_agent"       text,
  "method"           text        NOT NULL DEFAULT 'signup'
    CHECK ("method" IN ('signup', 'reaccept', 'oauth_signup'))
);

CREATE INDEX IF NOT EXISTS "idx_consent_user_id"       ON "consent_records"("user_id");
CREATE INDEX IF NOT EXISTS "idx_consent_terms_version" ON "consent_records"("terms_version_id");

-- ─── 3. Row Level Security ───────────────────────────────────────────────────

-- terms_versions: leitura pública (qualquer um pode ver as versões vigentes)
-- escrita exclusiva para service_role (admin insere novas versões via backend)
ALTER TABLE "terms_versions" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "terms_versions_public_read"
  ON "terms_versions" FOR SELECT
  USING (true);

CREATE POLICY "terms_versions_service_write"
  ON "terms_versions" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- consent_records: imutável — usuário só vê e insere os próprios registros
-- sem UPDATE/DELETE para garantir o audit trail (LGPD Art. 8)
ALTER TABLE "consent_records" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "consent_records_user_read"
  ON "consent_records" FOR SELECT
  USING (auth.uid() = "user_id");

CREATE POLICY "consent_records_user_insert"
  ON "consent_records" FOR INSERT
  WITH CHECK (auth.uid() = "user_id");

CREATE POLICY "consent_records_service_all"
  ON "consent_records" FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── 4. Seed initial terms versions ──────────────────────────────────────────

INSERT INTO "terms_versions" ("document_type", "version", "effective_at", "summary")
VALUES
  ('terms',   '2026-03-28-v1', now(), 'Initial Terms of Service'),
  ('privacy', '2026-03-28-v1', now(), 'Initial Privacy Policy')
ON CONFLICT DO NOTHING;
