-- Fix incorrect extracted_tickets data for bookings where ticket columns contain text values
-- This specifically fixes VMLK-010725 and other similar issues

-- Update VMLK-010725 specifically first
UPDATE guests 
SET ticket_data = jsonb_set(
  ticket_data, 
  '{extracted_tickets}', 
  '{"House Magicians Show Ticket & 2 Drinks": 4}'::jsonb
)
WHERE booking_code = 'VMLK-010725';

-- Fix other bookings where House Magicians Show Ticket & 2 Drinks column has text but extracted_tickets doesn't include it
UPDATE guests
SET ticket_data = jsonb_set(
  ticket_data,
  '{extracted_tickets}',
  (
    CASE 
      WHEN ticket_data->>'House Magicians Show Ticket & 2 Drinks' IS NOT NULL 
           AND ticket_data->>'House Magicians Show Ticket & 2 Drinks' != ''
           AND ticket_data->>'House Magicians Show Ticket & 2 Drinks' !~ '^[0-9]+$'
      THEN jsonb_build_object('House Magicians Show Ticket & 2 Drinks', total_quantity)
      ELSE ticket_data->'extracted_tickets'
    END
  )
)
WHERE ticket_data->>'House Magicians Show Ticket & 2 Drinks' IS NOT NULL 
  AND ticket_data->>'House Magicians Show Ticket & 2 Drinks' != ''
  AND ticket_data->>'House Magicians Show Ticket & 2 Drinks' !~ '^[0-9]+$'
  AND (ticket_data->'extracted_tickets'->>'House Magicians Show Ticket & 2 Drinks' IS NULL
       OR ticket_data->'extracted_tickets' = '{}'::jsonb);

-- Fix similar issues for other ticket types that might have text values
UPDATE guests
SET ticket_data = jsonb_set(
  ticket_data,
  '{extracted_tickets}',
  (
    SELECT jsonb_object_agg(ticket_type, total_quantity)
    FROM (
      SELECT unnest(ARRAY[
        'House Magicians Show Ticket',
        'House Magicians Show Ticket & 2 Drinks', 
        'House Magicians Show Ticket & 1 Pizza',
        'House Magicians Show Ticket includes 2 Drinks + 1 Pizza',
        'House Magicians Show Ticket & 2 soft drinks'
      ]) as ticket_type
    ) ticket_types
    WHERE ticket_data->>ticket_type IS NOT NULL
      AND ticket_data->>ticket_type != ''
      AND (ticket_data->>ticket_type !~ '^[0-9]+$' OR (ticket_data->>ticket_type)::int > 0)
  )
)
WHERE EXISTS (
  SELECT 1 FROM unnest(ARRAY[
    'House Magicians Show Ticket',
    'House Magicians Show Ticket & 2 Drinks', 
    'House Magicians Show Ticket & 1 Pizza',
    'House Magicians Show Ticket includes 2 Drinks + 1 Pizza',
    'House Magicians Show Ticket & 2 soft drinks'
  ]) as ticket_type
  WHERE ticket_data->>ticket_type IS NOT NULL
    AND ticket_data->>ticket_type != ''
    AND ticket_data->>ticket_type !~ '^[0-9]+$'
)
AND (ticket_data->'extracted_tickets' = '{}'::jsonb 
     OR ticket_data->'extracted_tickets' IS NULL);