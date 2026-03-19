-- ==========================================
-- PixelReel Activity Tracking & Scrobbles
-- Safe Supabase Migration with RLS
-- ==========================================

-- 1. Create Tables

CREATE TABLE IF NOT EXISTS "public"."activity_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token_hash" text NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "activity_tokens_token_hash_unique" UNIQUE("token_hash"),
    CONSTRAINT "activity_tokens_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "public"."current_activity" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"tmdb_id" integer,
	"media_type" text,
	"title" text NOT NULL,
	"season" integer,
	"episode" integer,
	"progress" real,
	"source" text,
	"status" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "current_activity_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE TABLE IF NOT EXISTS "public"."scrobbles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"tmdb_id" integer,
	"media_type" text NOT NULL,
	"title" text NOT NULL,
	"season" integer,
	"episode" integer,
	"runtime_minutes" integer,
	"source" text NOT NULL,
	"progress" real,
	"is_manual" boolean DEFAULT false,
	"watched_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_auto_scrobble" UNIQUE("user_id","tmdb_id","media_type","season","episode","watched_at"),
    CONSTRAINT "scrobbles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action
);

-- 2. Create Indexes

CREATE INDEX IF NOT EXISTS "idx_activity_tokens_user" ON "public"."activity_tokens" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_tokens_hash" ON "public"."activity_tokens" USING btree ("token_hash");
CREATE INDEX IF NOT EXISTS "idx_current_activity_updated" ON "public"."current_activity" USING btree ("updated_at");
CREATE INDEX IF NOT EXISTS "idx_scrobbles_user" ON "public"."scrobbles" USING btree ("user_id");
CREATE INDEX IF NOT EXISTS "idx_scrobbles_user_watched" ON "public"."scrobbles" USING btree ("user_id","watched_at");
CREATE INDEX IF NOT EXISTS "idx_scrobbles_tmdb" ON "public"."scrobbles" USING btree ("tmdb_id");

-- 3. Row Level Security (RLS)

ALTER TABLE "public"."activity_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."current_activity" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."scrobbles" ENABLE ROW LEVEL SECURITY;

-- Note: Since the backend uses Better-Auth and Drizzle ORM connecting
-- directly via a Postgres connection (bypassing RLS inherently using the service_role or superuser), 
-- these RLS policies are mainly for direct Supabase API access and best practices protection.

-- Activity Tokens RLS (Private)
CREATE POLICY "Users can view their own activity tokens" 
ON "public"."activity_tokens" FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity tokens" 
ON "public"."activity_tokens" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity tokens" 
ON "public"."activity_tokens" FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity tokens" 
ON "public"."activity_tokens" FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Current Activity RLS (Public read, private write)
CREATE POLICY "Anyone can view current activity" 
ON "public"."current_activity" FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert their own current activity" 
ON "public"."current_activity" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own current activity" 
ON "public"."current_activity" FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own current activity" 
ON "public"."current_activity" FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Scrobbles RLS (Public read, private write)
CREATE POLICY "Anyone can view scrobbles" 
ON "public"."scrobbles" FOR SELECT TO public USING (true);

CREATE POLICY "Users can insert their own scrobbles" 
ON "public"."scrobbles" FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own scrobbles" 
ON "public"."scrobbles" FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scrobbles" 
ON "public"."scrobbles" FOR DELETE TO authenticated USING (auth.uid() = user_id);
