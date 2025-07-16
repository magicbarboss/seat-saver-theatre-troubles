-- Clean up duplicate guest entries by keeping the first record (by creation order) for each booking_code + booker_name combination

-- STEP 1: Back up duplicate guests to a temp table
DROP TABLE IF EXISTS duplicate_guest_backup;

CREATE TEMP TABLE duplicate_guest_backup AS
SELECT *
FROM guests g1
WHERE EXISTS (
  SELECT 1 
  FROM guests g2 
  WHERE g1.booking_code = g2.booking_code 
    AND g1.booker_name = g2.booker_name
    AND g1.booking_code IS NOT NULL 
    AND g1.booker_name IS NOT NULL
    AND g1.id != g2.id
);

-- STEP 2: Log how many duplicates were found
SELECT 'Guests identified as duplicates:' AS message, COUNT(*) AS count
FROM duplicate_guest_backup;

-- STEP 3: Keep only the first record for each booking_code + booker_name combination
WITH guests_to_keep AS (
  SELECT DISTINCT ON (booking_code, booker_name) id
  FROM guests
  WHERE booking_code IS NOT NULL AND booker_name IS NOT NULL
  ORDER BY booking_code, booker_name, id
)
DELETE FROM guests
WHERE booking_code IS NOT NULL 
  AND booker_name IS NOT NULL
  AND id NOT IN (SELECT id FROM guests_to_keep);

-- STEP 4: Confirm final count
SELECT 'Remaining unique guests:' AS message, COUNT(*) AS total_guests
FROM guests;

-- STEP 5: Sanity check: Should return 0 rows if all duplicates are removed
SELECT booking_code, booker_name, COUNT(*) as duplicate_count
FROM guests
WHERE booking_code IS NOT NULL AND booker_name IS NOT NULL
GROUP BY booking_code, booker_name
HAVING COUNT(*) > 1;