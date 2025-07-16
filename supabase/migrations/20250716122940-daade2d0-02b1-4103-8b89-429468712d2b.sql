-- STEP 1: Back up duplicate guests to a temp table
DROP TABLE IF EXISTS duplicate_guest_backup;

CREATE TEMP TABLE duplicate_guest_backup AS
SELECT *
FROM guests
WHERE id NOT IN (
  SELECT MIN(id)
  FROM guests
  WHERE booking_code IS NOT NULL AND booker_name IS NOT NULL
  GROUP BY booking_code, booker_name
)
AND booking_code IS NOT NULL
AND booker_name IS NOT NULL;

-- STEP 2: Log how many duplicates were found
SELECT 'Guests identified as duplicates:' AS message, COUNT(*) AS count
FROM duplicate_guest_backup;

-- STEP 3: Delete duplicates, keeping the guest with the smallest ID
DELETE FROM guests
WHERE id IN (SELECT id FROM duplicate_guest_backup);

-- STEP 4: Confirm final count
SELECT 'Remaining unique guests:' AS message, COUNT(*) AS total_guests
FROM guests;

-- STEP 5: Optional sanity check: Should return 0 rows if all duplicates are removed
SELECT booking_code, booker_name, COUNT(*)
FROM guests
GROUP BY booking_code, booker_name
HAVING COUNT(*) > 1;