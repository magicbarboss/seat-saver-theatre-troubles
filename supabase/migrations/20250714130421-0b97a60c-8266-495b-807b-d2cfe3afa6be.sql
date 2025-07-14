-- Fix pizza and drinks detection by checking keys and extracted_tickets
UPDATE guests 
SET 
  interval_pizza_order = CASE
    WHEN EXISTS (
      SELECT 1 
      FROM jsonb_each_text(ticket_data) 
      WHERE key ILIKE '%pizza%'
    ) 
    OR (
      ticket_data ? 'extracted_tickets' 
      AND ticket_data->'extracted_tickets' IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_each_text(ticket_data->'extracted_tickets')
        WHERE key ILIKE '%pizza%' 
          AND value::int > 0
      )
    )
    THEN true
    ELSE false
  END,
  interval_drinks_order = CASE
    WHEN EXISTS (
      SELECT 1 
      FROM jsonb_each_text(ticket_data) 
      WHERE key ILIKE '%drink%'
    )
    OR (
      ticket_data ? 'extracted_tickets' 
      AND ticket_data->'extracted_tickets' IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM jsonb_each_text(ticket_data->'extracted_tickets')
        WHERE key ILIKE '%drink%' 
          AND value::int > 0
      )
    )
    THEN true
    ELSE false
  END
WHERE ticket_data IS NOT NULL;