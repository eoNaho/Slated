-- Fix Script: Remove year suffix from slugs where there's no conflict
-- Run this AFTER the original migration if you already ran the old version

-- Step 1: Identify slugs that can have year removed (no conflict without year)
-- Create temp table with proposed changes
CREATE TEMP TABLE slug_fixes AS
WITH base_slugs AS (
  SELECT 
    id,
    slug as current_slug,
    -- Extract base slug (remove -YYYY or -YYYY-N suffix at end)
    REGEXP_REPLACE(slug, '-\d{4}(-\d+)?$', '') as base_slug,
    release_date
  FROM media
  WHERE slug ~ '-\d{4}(-\d+)?$'  -- Only slugs that have year suffix
)
SELECT 
  bs.id,
  bs.current_slug,
  bs.base_slug as proposed_slug
FROM base_slugs bs
WHERE NOT EXISTS (
  -- Check if another media already uses the base slug
  SELECT 1 FROM media m 
  WHERE m.slug = bs.base_slug 
  AND m.id != bs.id
)
AND NOT EXISTS (
  -- Check if another media with same base would conflict
  SELECT 1 FROM base_slugs bs2 
  WHERE bs2.base_slug = bs.base_slug 
  AND bs2.id != bs.id
);

-- Step 2: Preview what will be changed (optional - comment out if not needed)
SELECT current_slug, proposed_slug FROM slug_fixes;

-- Step 3: Apply the fixes
UPDATE media m
SET slug = sf.proposed_slug
FROM slug_fixes sf
WHERE m.id = sf.id;

-- Step 4: Update the trigger function to use smart slug logic
CREATE OR REPLACE FUNCTION set_media_slug() RETURNS TRIGGER AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  year_suffix TEXT;
BEGIN
  -- Generate base slug from title only
  base_slug := generate_slug(NEW.title);
  final_slug := base_slug;
  
  -- Check if base slug exists for different media
  IF EXISTS (SELECT 1 FROM media WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
    -- Add year if available
    IF NEW.release_date IS NOT NULL THEN
      year_suffix := EXTRACT(YEAR FROM NEW.release_date)::TEXT;
      final_slug := base_slug || '-' || year_suffix;
    ELSE
      -- No year, use part of ID
      final_slug := base_slug || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);
    END IF;
    
    -- If still exists, add counter
    IF EXISTS (SELECT 1 FROM media WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) THEN
      DECLARE
        counter INTEGER := 2;
      BEGIN
        WHILE EXISTS (SELECT 1 FROM media WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
          IF NEW.release_date IS NOT NULL THEN
            final_slug := base_slug || '-' || year_suffix || '-' || counter::TEXT;
          ELSE
            final_slug := base_slug || '-' || counter::TEXT;
          END IF;
          counter := counter + 1;
        END LOOP;
      END;
    END IF;
  END IF;
  
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Clean up temp table
DROP TABLE IF EXISTS slug_fixes;

-- Done! Your slugs are now clean.
-- Example: "oppenheimer-2023" becomes "oppenheimer" if it's the only Oppenheimer
