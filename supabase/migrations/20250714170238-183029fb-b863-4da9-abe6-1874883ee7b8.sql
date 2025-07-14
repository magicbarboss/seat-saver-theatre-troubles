-- Step 1: Clean up duplicate entries, keeping most recent record for each booker/booking combination
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY booker_name, booking_code, guest_list_id 
           ORDER BY id DESC
         ) as rn
  FROM guests 
  WHERE booker_name IS NOT NULL 
    AND booking_code IS NOT NULL
    AND booker_name != ''
    AND booking_code != ''
)
DELETE FROM guests 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Step 2: Fix empty extracted_tickets by extracting from ticket_data
UPDATE guests 
SET extracted_tickets = (
  SELECT jsonb_object_agg(
    key, 
    CASE 
      WHEN jsonb_typeof(value) = 'number' THEN value::int
      ELSE 1
    END
  )
  FROM jsonb_each(ticket_data) 
  WHERE key NOT IN ('booker_name', 'booking_code', 'notes', 'show_time', 'extracted_tickets')
    AND key != ''
    AND value IS NOT NULL
)
WHERE ticket_data IS NOT NULL 
  AND (extracted_tickets IS NULL OR extracted_tickets = '{}');

-- Step 3: Update interval_pizza_order and interval_drinks_order based on ticket_data keys
UPDATE guests 
SET 
  interval_pizza_order = (
    CASE 
      WHEN ticket_data IS NOT NULL THEN
        EXISTS (
          SELECT 1 
          FROM jsonb_object_keys(ticket_data) AS key 
          WHERE key NOT IN ('booker_name', 'booking_code', 'notes', 'show_time', 'extracted_tickets')
            AND LOWER(key) LIKE '%pizza%'
        )
      ELSE false
    END
  ),
  interval_drinks_order = (
    CASE 
      WHEN ticket_data IS NOT NULL THEN
        EXISTS (
          SELECT 1 
          FROM jsonb_object_keys(ticket_data) AS key 
          WHERE key NOT IN ('booker_name', 'booking_code', 'notes', 'show_time', 'extracted_tickets')
            AND (LOWER(key) LIKE '%drink%' OR LOWER(key) LIKE '%cocktail%' OR LOWER(key) LIKE '%prosecco%')
        )
      ELSE false
    END
  );

-- Step 4: Add unique constraint to prevent future duplicates
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_guests_unique_booking 
ON guests (booker_name, booking_code, guest_list_id) 
WHERE booker_name IS NOT NULL AND booking_code IS NOT NULL AND booker_name != '' AND booking_code != '';