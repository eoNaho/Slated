-- Migration: Add Better Auth tables and migrate user data
-- The old 'users' table stays for backward-compat FKs; new 'user' table is for Better Auth

-- 1. Create Better Auth core tables
CREATE TABLE IF NOT EXISTS "user" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "display_name" text,
    "email" text NOT NULL UNIQUE,
    "is_verified" boolean DEFAULT false NOT NULL,
    "avatar_url" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "two_factor_enabled" boolean DEFAULT false,
    "username" text UNIQUE,
    "display_username" text,
    "bio" text,
    "cover_url" text,
    "location" text,
    "website" text,
    "is_premium" boolean DEFAULT false,
    "role" text DEFAULT 'user',
    "status" text DEFAULT 'active',
    "last_active_at" timestamp
);

CREATE TABLE IF NOT EXISTS "session" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "expires_at" timestamp NOT NULL,
    "token" text NOT NULL UNIQUE,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL,
    "ip_address" text,
    "user_agent" text,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "account" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "account_id" text NOT NULL,
    "provider_id" text NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
    "access_token" text,
    "refresh_token" text,
    "id_token" text,
    "access_token_expires_at" timestamp,
    "refresh_token_expires_at" timestamp,
    "scope" text,
    "password" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "verification" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "two_factor" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "secret" text NOT NULL,
    "backup_codes" text NOT NULL,
    "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id");
CREATE INDEX IF NOT EXISTS "account_user_id_idx" ON "account" ("user_id");
CREATE INDEX IF NOT EXISTS "two_factor_user_id_idx" ON "two_factor" ("user_id");
CREATE INDEX IF NOT EXISTS "verification_identifier_idx" ON "verification" ("identifier");

-- 3. Migrate existing users data into the new 'user' table
-- Cast role/status from enum to text
INSERT INTO "user" (
    "id", "display_name", "email", "is_verified", "avatar_url",
    "created_at", "updated_at", "username", "bio", "cover_url",
    "location", "website", "is_premium", "role", "status", "last_active_at"
)
SELECT
    u.id,
    u.display_name,
    COALESCE(u.email, u.id::text || '@placeholder.local'),
    u.is_verified,
    u.avatar_url,
    COALESCE(u.created_at, now()),
    COALESCE(u.updated_at, now()),
    u.username,
    u.bio,
    u.cover_url,
    u.location,
    u.website,
    u.is_premium,
    u.role::text,
    u.status::text,
    u.last_active_at
FROM "users" u
ON CONFLICT ("id") DO NOTHING;
