CREATE TABLE "watch_party_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"room_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"left_at" timestamp with time zone,
	CONSTRAINT "unique_wp_member" UNIQUE("room_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "watch_party_rooms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"host_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"media_title" text,
	"media_source" text,
	"media_url" text,
	"max_members" integer DEFAULT 8 NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	CONSTRAINT "watch_party_rooms_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "watch_party_members" ADD CONSTRAINT "watch_party_members_room_id_watch_party_rooms_id_fk" FOREIGN KEY ("room_id") REFERENCES "public"."watch_party_rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_party_members" ADD CONSTRAINT "watch_party_members_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_party_rooms" ADD CONSTRAINT "watch_party_rooms_host_user_id_user_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_wp_members_room" ON "watch_party_members" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "idx_wp_members_user" ON "watch_party_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_wp_rooms_code" ON "watch_party_rooms" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_wp_rooms_host" ON "watch_party_rooms" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "idx_wp_rooms_status" ON "watch_party_rooms" USING btree ("status");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE watch_party_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_party_members ENABLE ROW LEVEL SECURITY;

-- WATCH PARTY ROOMS
-- Anyone can read a room (needed to show join preview by code)
CREATE POLICY "Watch party rooms are publicly readable"
  ON watch_party_rooms FOR SELECT
  USING (true);

-- Only authenticated user can create a room they own
CREATE POLICY "Users can create own watch party rooms"
  ON watch_party_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_user_id);

-- Only the host can update room metadata (title, status, etc.)
CREATE POLICY "Host can update own watch party room"
  ON watch_party_rooms FOR UPDATE
  USING (auth.uid() = host_user_id);

-- Only the host can delete the room
CREATE POLICY "Host can delete own watch party room"
  ON watch_party_rooms FOR DELETE
  USING (auth.uid() = host_user_id);

-- WATCH PARTY MEMBERS
-- Members of the room can see who else is in it
CREATE POLICY "Room members can view membership"
  ON watch_party_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM watch_party_members m2
      WHERE m2.room_id = watch_party_members.room_id
        AND m2.user_id = auth.uid()
    )
  );

-- Users can only insert their own membership row
CREATE POLICY "Users can join watch party rooms"
  ON watch_party_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own membership (e.g. set left_at)
CREATE POLICY "Users can update own membership"
  ON watch_party_members FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can leave (delete their own membership), host can remove anyone
CREATE POLICY "Users can leave or host can remove members"
  ON watch_party_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM watch_party_rooms r
      WHERE r.id = watch_party_members.room_id
        AND r.host_user_id = auth.uid()
    )
  );