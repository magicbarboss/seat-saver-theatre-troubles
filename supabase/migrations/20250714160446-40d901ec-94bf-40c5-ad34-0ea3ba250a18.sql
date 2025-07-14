-- Comprehensive cleanup of ALL duplicate guest entries
-- This will keep only one entry per unique booking code + booker name combination
-- and remove all duplicates, which should restore the missing guests

WITH duplicate_groups AS (
  SELECT booking_code, booker_name, COUNT(*) as count
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
    SELECT booking_code, booker_name FROM duplicate_groups
  )
  ORDER BY booking_code, booker_name, created_at DESC -- Keep the most recent entry
)
-- Delete all duplicate entries except the ones we want to keep
DELETE FROM guests 
WHERE (booking_code, booker_name) IN (
  SELECT booking_code, booker_name FROM duplicate_groups
)
AND id NOT IN (SELECT id FROM guests_to_keep);

-- Update the specific entries that need pizza/drinks flags
UPDATE guests 
SET interval_pizza_order = true, interval_drinks_order = true
WHERE booking_code = 'PHRX-060725' AND booker_name = 'Kelly Foote';

UPDATE guests 
SET interval_pizza_order = true, interval_drinks_order = true
WHERE booking_code = 'BDTD-270625' AND booker_name = 'Mrs Emma McNab';