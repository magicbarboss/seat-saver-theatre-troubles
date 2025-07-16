-- Clean up duplicate guest entries by keeping only one unique entry per booking_code + booker_name combination
-- This will fix the Kitchen Prep Summary calculation issues

WITH duplicate_stats AS (
  SELECT booking_code, booker_name, COUNT(*) as duplicate_count
  FROM guests 
  WHERE booking_code IS NOT NULL AND booker_name IS NOT NULL
  GROUP BY booking_code, booker_name
  HAVING COUNT(*) > 1
),
guests_to_keep AS (
  SELECT DISTINCT ON (booking_code, booker_name) 
    id, booking_code, booker_name
  FROM guests 
  WHERE (booking_code, booker_name) IN (
    SELECT booking_code, booker_name FROM duplicate_stats
  )
  ORDER BY booking_code, booker_name, 
    -- Prioritize guests with more complete data
    CASE WHEN is_checked_in THEN 1 ELSE 2 END,
    CASE WHEN pager_number IS NOT NULL THEN 1 ELSE 2 END,
    id -- Use id as final sort criteria instead of created_at
)
-- Delete all duplicate entries except the ones we want to keep
DELETE FROM guests 
WHERE (booking_code, booker_name) IN (
  SELECT booking_code, booker_name FROM duplicate_stats
)
AND id NOT IN (SELECT id FROM guests_to_keep);

-- Log the cleanup results
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % duplicate guest entries', deleted_count;
END $$;