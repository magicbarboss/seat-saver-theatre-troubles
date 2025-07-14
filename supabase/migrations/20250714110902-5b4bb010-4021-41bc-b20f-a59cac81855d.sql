-- Update existing guests to set interval_pizza_order and interval_drinks_order based on their ticket data
UPDATE guests 
SET 
  interval_pizza_order = (
    CASE 
      WHEN ticket_data->'extracted_tickets' IS NOT NULL THEN
        EXISTS (
          SELECT 1 
          FROM jsonb_object_keys(ticket_data->'extracted_tickets') AS key 
          WHERE LOWER(key) LIKE '%pizza%'
        )
      ELSE false
    END
  ),
  interval_drinks_order = (
    CASE 
      WHEN ticket_data->'extracted_tickets' IS NOT NULL THEN
        EXISTS (
          SELECT 1 
          FROM jsonb_object_keys(ticket_data->'extracted_tickets') AS key 
          WHERE LOWER(key) LIKE '%drink%'
        )
      ELSE false
    END
  )
WHERE ticket_data->'extracted_tickets' IS NOT NULL;

-- Clean up duplicate entries for guests with the same booker_name and booking_code
-- Keep only the most recent entry for each unique combination
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