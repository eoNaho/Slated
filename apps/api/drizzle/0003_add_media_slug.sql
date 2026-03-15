-- Migration: Add slug field to media table
-- Description: Adds a slug column for URL-friendly media lookups
-- Logic: Year is only added when there's a naming conflict

-- Add slug column (nullable first for existing data)
ALTER TABLE media ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create a function to generate base slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT) RETURNS TEXT AS $$
BEGIN
  RETURN TRIM(BOTH '-' FROM
    LOWER(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            TRANSLATE(title, 'áàâãäåéèêëíìîïóòôõöúùûüñçÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÑÇ', 'aaaaaaeeeeiiiiooooouuuuncaaaaaaeeeeiiiiooooouuuunc'),
            '[^a-zA-Z0-9\s-]', '', 'g'
          ),
          '\s+', '-', 'g'
        ),
        '-+', '-', 'g'
      )
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Populate slugs for existing media
-- Step 1: Set base slug for all (title only)
UPDATE media
SET slug = generate_slug(title)
WHERE slug IS NULL;

-- Step 2: Find and fix duplicates by adding year
WITH duplicates AS (
  SELECT id, slug, release_date,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY release_date ASC NULLS LAST, created_at ASC) as rn
  FROM media
  WHERE slug IN (SELECT slug FROM media GROUP BY slug HAVING COUNT(*) > 1)
)
UPDATE media m
SET slug = m.slug || '-' || EXTRACT(YEAR FROM m.release_date)::TEXT
FROM duplicates d
WHERE m.id = d.id AND d.rn > 1 AND m.release_date IS NOT NULL;

-- Step 3: Fix remaining duplicates (no year) by adding ID suffix
WITH duplicates AS (
  SELECT id, slug,
    ROW_NUMBER() OVER (PARTITION BY slug ORDER BY created_at ASC) as rn
  FROM media
  WHERE slug IN (SELECT slug FROM media GROUP BY slug HAVING COUNT(*) > 1)
)
UPDATE media m
SET slug = m.slug || '-' || SUBSTRING(m.id::TEXT, 1, 8)
FROM duplicates d
WHERE m.id = d.id AND d.rn > 1;

-- Make slug NOT NULL and add unique constraint
ALTER TABLE media ALTER COLUMN slug SET NOT NULL;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'media_slug_unique'
  ) THEN
    ALTER TABLE media ADD CONSTRAINT media_slug_unique UNIQUE (slug);
  END IF;
END $$;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_media_slug ON media(slug);

-- Create trigger to auto-generate smart slug on insert
CREATE OR REPLACE FUNCTION set_media_slug() RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  year_suffix TEXT;
BEGIN
  -- Generate base slug from title only
  base_slug := generate_slug(NEW.title);
  final_slug := base_slug;
  
  -- Check if base slug exists
  IF EXISTS (SELECT 1 FROM media WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    -- Add year if available
    IF NEW.release_date IS NOT NULL THEN
      year_suffix := EXTRACT(YEAR FROM NEW.release_date)::TEXT;
      final_slug := base_slug || '-' || year_suffix;
    END IF;
    
    -- If still exists, add counter
    IF EXISTS (SELECT 1 FROM media WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
      DECLARE
        counter INTEGER := 2;
      BEGIN
        WHILE EXISTS (SELECT 1 FROM media WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
          final_slug := base_slug || '-' || year_suffix || '-' || counter::TEXT;
          counter := counter + 1;
        END LOOP;
      END;
    END IF;
  END IF;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new media
DROP TRIGGER IF EXISTS trigger_set_media_slug ON media;
CREATE TRIGGER trigger_set_media_slug
  BEFORE INSERT ON media
  FOR EACH ROW
  WHEN (NEW.slug IS NULL OR NEW.slug = '')
  EXECUTE FUNCTION set_media_slug();
