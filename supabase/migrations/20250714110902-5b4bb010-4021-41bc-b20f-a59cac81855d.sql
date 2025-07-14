-- Clean up duplicate entries, prioritizing records with extracted_tickets data
WITH duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY booker_name, booking_code, guest_list_id 
           ORDER BY 
             CASE WHEN ticket_data->'extracted_tickets' IS NOT NULL THEN 0 ELSE 1 END,
             id DESC
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

-- For records with missing extracted_tickets, re-extract from ticket_data
UPDATE guests 
SET 
  ticket_data = jsonb_set(
    ticket_data,
    '{extracted_tickets}',
    (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each_text(ticket_data) 
      WHERE key NOT IN ('booker_name', 'booking_code', 'notes', 'show_time')
        AND value ~ '^[0-9]+$'
        AND value::integer > 0
    )
  )
WHERE ticket_data->'extracted_tickets' IS NULL
  AND ticket_data IS NOT NULL;

-- Update interval_pizza_order and interval_drinks_order for all guests
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
  );