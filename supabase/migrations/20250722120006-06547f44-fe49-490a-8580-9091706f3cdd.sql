
-- Clean up duplicate Charlie Poole entries, keeping only one record
WITH charlie_duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY booking_code, booker_name 
           ORDER BY created_at DESC
         ) as rn
  FROM guests 
  WHERE booker_name = 'Charlie Poole' 
    AND booking_code = 'RYRM-040725'
)
DELETE FROM guests 
WHERE id IN (
  SELECT id FROM charlie_duplicates WHERE rn > 1
);

-- Log the cleanup results
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM guests 
  WHERE booker_name = 'Charlie Poole' AND booking_code = 'RYRM-040725';
  
  RAISE NOTICE 'Charlie Poole cleanup complete. Remaining entries: %', remaining_count;
END $$;
