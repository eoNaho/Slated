CREATE TABLE "season_ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"season_id" uuid NOT NULL,
	"rating" real NOT NULL,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_user_season_rating" UNIQUE("user_id","season_id")
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"content" jsonb NOT NULL,
	"image_url" text,
	"is_pinned" boolean DEFAULT false,
	"is_expired" boolean DEFAULT false,
	"expires_at" timestamp with time zone NOT NULL,
	"views_count" integer DEFAULT 0,
	"reactions_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "story_poll_votes" (
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"option_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "story_poll_votes_story_id_user_id_pk" PRIMARY KEY("story_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "story_reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"reaction" text NOT NULL,
	"text_reply" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "unique_story_reaction" UNIQUE("story_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "story_views" (
	"story_id" uuid NOT NULL,
	"viewer_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "story_views_story_id_viewer_id_pk" PRIMARY KEY("story_id","viewer_id")
);
--> statement-breakpoint
ALTER TABLE "lists" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "average_episode_rating" real;--> statement-breakpoint
ALTER TABLE "seasons" ADD COLUMN "synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "season_ratings" ADD CONSTRAINT "season_ratings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "season_ratings" ADD CONSTRAINT "season_ratings_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_poll_votes" ADD CONSTRAINT "story_poll_votes_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_poll_votes" ADD CONSTRAINT "story_poll_votes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_reactions" ADD CONSTRAINT "story_reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_views" ADD CONSTRAINT "story_views_viewer_id_user_id_fk" FOREIGN KEY ("viewer_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_season_ratings_user" ON "season_ratings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_season_ratings_season" ON "season_ratings" USING btree ("season_id");--> statement-breakpoint
CREATE INDEX "idx_stories_user" ON "stories" USING btree ("user_id","expires_at");--> statement-breakpoint
CREATE INDEX "idx_stories_feed" ON "stories" USING btree ("is_expired","expires_at");--> statement-breakpoint
CREATE INDEX "idx_stories_created" ON "stories" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_story_poll_votes_story" ON "story_poll_votes" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_reactions_story" ON "story_reactions" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_story_views_story" ON "story_views" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "idx_episodes_air_date" ON "episodes" USING btree ("air_date");--> statement-breakpoint
ALTER TABLE "lists" ADD CONSTRAINT "unique_user_list_slug" UNIQUE("user_id","slug");