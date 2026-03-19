-- Add slug column to lists table
ALTER TABLE "lists" ADD COLUMN "slug" text;

-- Generate slugs for existing lists (very basic slugification)
UPDATE "lists" SET "slug" = LOWER(REPLACE(name, ' ', '-')) WHERE "slug" IS NULL;

-- Make slug NOT NULL
ALTER TABLE "lists" ALTER COLUMN "slug" SET NOT NULL;

-- Add unique constraint
ALTER TABLE "lists" ADD CONSTRAINT "unique_user_list_slug" UNIQUE ("user_id", "slug");
