-- Fix pizza and drinks detection based on actual ticket data
UPDATE guests 
SET 
  interval_pizza_order = CASE
    WHEN EXISTS (
      SELECT 1 
      FROM jsonb_each_text(ticket_data) 
      WHERE (key ILIKE '%pizza%' OR key ILIKE '%PIzza%') 
        AND value IS NOT NULL 
        AND value != '' 
        AND value != '0'
    ) THEN true
    ELSE false
  END,
  interval_drinks_order = CASE
    WHEN EXISTS (
      SELECT 1 
      FROM jsonb_each_text(ticket_data) 
      WHERE key ILIKE '%drink%' 
        AND value IS NOT NULL 
        AND value != '' 
        AND value != '0'
    ) THEN true
    ELSE false
  END
WHERE ticket_data IS NOT NULL;