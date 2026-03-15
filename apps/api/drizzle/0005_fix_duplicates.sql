-- Fix duplicate entries in media_genres and media_credits tables
-- Also add unique constraints to prevent future duplicates

-- =============================================================================
-- 1. Remove duplicate media_genres entries
-- =============================================================================
DELETE FROM media_genres a
USING media_genres b
WHERE a.ctid < b.ctid
  AND a.media_id = b.media_id
  AND a.genre_id = b.genre_id;

-- Add unique constraint
ALTER TABLE media_genres
ADD CONSTRAINT media_genres_unique UNIQUE (media_id, genre_id);

-- =============================================================================
-- 2. Remove duplicate media_credits entries
-- =============================================================================
-- Keep only the first credit for each (media_id, person_id, credit_type) combination
DELETE FROM media_credits a
USING media_credits b
WHERE a.ctid < b.ctid
  AND a.media_id = b.media_id
  AND a.person_id = b.person_id
  AND a.credit_type = b.credit_type;

-- Add unique constraint
ALTER TABLE media_credits
ADD CONSTRAINT media_credits_unique UNIQUE (media_id, person_id, credit_type);
