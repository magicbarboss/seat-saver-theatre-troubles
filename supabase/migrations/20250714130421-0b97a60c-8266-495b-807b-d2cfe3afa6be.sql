-- Fix pizza and drinks detection by checking only the Item field
UPDATE guests 
SET 
  interval_pizza_order = CASE
    WHEN jsonb_extract_path_text(ticket_data, 'Item') ILIKE '%pizza%'
    THEN true
    ELSE false
  END,
  interval_drinks_order = CASE
    WHEN jsonb_extract_path_text(ticket_data, 'Item') ILIKE '%drink%'
    THEN true
    ELSE false
  END
WHERE ticket_data IS NOT NULL;