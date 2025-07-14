-- Clean up duplicate entries, keeping most recent record for each booker/booking combination
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

-- Update interval_pizza_order and interval_drinks_order based on ticket_data keys
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