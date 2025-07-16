-- Robust duplicate guest cleanup - keeping earliest ID per booking_code + booker_name
-- Step 1: Show current duplicate status
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT booking_code, booker_name, COUNT(*) as cnt
        FROM guests 
        WHERE booking_code IS NOT NULL AND booker_name IS NOT NULL
        GROUP BY booking_code, booker_name
        HAVING COUNT(*) > 1
    ) duplicates;
    
    RAISE NOTICE 'Found % booking combinations with duplicates', duplicate_count;
END $$;

-- Step 2: Create permanent backup table for deleted duplicates
DROP TABLE IF EXISTS public.guest_duplicates_backup;
CREATE TABLE public.guest_duplicates_backup AS
SELECT g.*
FROM guests g
WHERE EXISTS (
    SELECT 1 FROM guests g2 
    WHERE g.booking_code = g2.booking_code 
    AND g.booker_name = g2.booker_name
    AND g.booking_code IS NOT NULL 
    AND g.booker_name IS NOT NULL
    AND g.id != g2.id
);

-- Step 3: Log backup count
DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM public.guest_duplicates_backup;
    RAISE NOTICE 'Backed up % duplicate guest records', backup_count;
END $$;

-- Step 4: Delete duplicates, keeping the record with the smallest ID (earliest)
DELETE FROM guests 
WHERE id IN (
    SELECT g1.id
    FROM guests g1
    INNER JOIN (
        SELECT booking_code, booker_name, MIN(id) as keep_id
        FROM guests 
        WHERE booking_code IS NOT NULL AND booker_name IS NOT NULL
        GROUP BY booking_code, booker_name
        HAVING COUNT(*) > 1
    ) keepers ON g1.booking_code = keepers.booking_code 
                AND g1.booker_name = keepers.booker_name
    WHERE g1.id != keepers.keep_id
);

-- Step 5: Verify cleanup success
DO $$
DECLARE
    remaining_duplicates INTEGER;
    total_guests INTEGER;
    deleted_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT booking_code, booker_name, COUNT(*) as cnt
        FROM guests 
        WHERE booking_code IS NOT NULL AND booker_name IS NOT NULL
        GROUP BY booking_code, booker_name
        HAVING COUNT(*) > 1
    ) still_duplicated;
    
    SELECT COUNT(*) INTO total_guests FROM guests;
    SELECT COUNT(*) INTO deleted_count FROM public.guest_duplicates_backup;
    
    RAISE NOTICE 'Cleanup complete: % total guests remain, % duplicates deleted, % duplicate combinations still exist', 
                 total_guests, deleted_count, remaining_duplicates;
                 
    IF remaining_duplicates > 0 THEN
        RAISE WARNING 'Still have % duplicate combinations - manual review needed', remaining_duplicates;
    END IF;
END $$;