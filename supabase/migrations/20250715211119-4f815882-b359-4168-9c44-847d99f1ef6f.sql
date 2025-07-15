-- Fix pizza and drinks detection to be more precise based on exact ticket type matching
-- This fixes the issue where "House Magicians Show Ticket & 2 Drinks" was incorrectly showing pizzas

UPDATE guests 
SET 
  interval_pizza_order = CASE
    -- Check exact ticket type matches for pizza-containing packages
    WHEN ticket_data IS NOT NULL AND (
      -- Standard pizza tickets
      ticket_data ? 'House Magicians Show Ticket & 1 Pizza'
      OR ticket_data ? 'House Magicians Show Ticket includes 2 Drinks +  1 Pizza' 
      OR ticket_data ? 'House Magicians Show Ticket includes 2 Drinks + 1 Pizza'
      OR ticket_data ? 'Adult Show Ticket includes 2 Drinks + 9" Pizza'
      OR ticket_data ? 'Adult Show Ticket induces 2 soft drinks + 9" PIzza'
      OR ticket_data ? 'Adult Show Ticket induces 2 soft drinks + 9 PIzza'
      OR ticket_data ? 'Comedy ticket plus 9" Pizza'
      OR ticket_data ? 'Comedy ticket plus 9 Pizza'
      OR ticket_data ? 'Adult Comedy & Magic Show Ticket + 9" Pizza'
      OR ticket_data ? 'Adult Comedy & Magic Show Ticket + 9 Pizza'
      -- Groupon packages (all contain pizza)
      OR ticket_data ? 'Groupon Offer Prosecco Package (per person)'
      OR ticket_data ? 'Groupon Magic & Pints Package (per person)'
      OR ticket_data ? 'Groupon Magic & Cocktails Package (per person)'
      OR ticket_data ? 'Groupon Magic Show, Snack and Loaded Fries Package (per person)'
      OR ticket_data ? 'OLD Groupon Offer (per person - extras are already included)'
      -- Wowcher packages
      OR ticket_data ? 'Wowcher Magic & Cocktails Package (per person)'
      OR ticket_data ? 'Wowcher Magic & Pints Package (per person)'
      -- Any key that contains pizza but exclude non-pizza items
      OR EXISTS (
        SELECT 1 
        FROM jsonb_object_keys(ticket_data) AS key 
        WHERE LOWER(key) LIKE '%pizza%'
          AND key NOT LIKE '%drink%'
          AND key NOT LIKE '%ticket%'
          AND ticket_data->>key != '0'
      )
    ) THEN true
    ELSE false
  END,
  interval_drinks_order = CASE
    -- Check exact ticket type matches for drink-containing packages
    WHEN ticket_data IS NOT NULL AND (
      -- Standard drink tickets
      ticket_data ? 'House Magicians Show Ticket & 2 Drinks'
      OR ticket_data ? 'House Magicians Show Ticket includes 2 Drinks +  1 Pizza'
      OR ticket_data ? 'House Magicians Show Ticket includes 2 Drinks + 1 Pizza'
      OR ticket_data ? 'House Magicians Show Ticket & 2 soft drinks'
      OR ticket_data ? 'Adult Show Ticket includes 2 Drinks'
      OR ticket_data ? 'Adult Show Ticket includes 2 Drinks + 9" Pizza'
      OR ticket_data ? 'Adult Show Ticket induces 2 soft drinks'
      OR ticket_data ? 'Adult Show Ticket induces 2 soft drinks + 9" PIzza'
      OR ticket_data ? 'Adult Show Ticket induces 2 soft drinks + 9 PIzza'
      -- Groupon packages (all contain drinks)
      OR ticket_data ? 'Groupon Offer Prosecco Package (per person)'
      OR ticket_data ? 'Groupon Magic & Pints Package (per person)'
      OR ticket_data ? 'Groupon Magic & Cocktails Package (per person)'
      OR ticket_data ? 'Groupon Magic Show, Snack and Loaded Fries Package (per person)'
      OR ticket_data ? 'OLD Groupon Offer (per person - extras are already included)'
      -- Wowcher packages
      OR ticket_data ? 'Wowcher Magic & Cocktails Package (per person)'
      OR ticket_data ? 'Wowcher Magic & Pints Package (per person)'
      -- Any key that contains drink terms but exclude non-drink items
      OR EXISTS (
        SELECT 1 
        FROM jsonb_object_keys(ticket_data) AS key 
        WHERE (LOWER(key) LIKE '%drink%' OR LOWER(key) LIKE '%cocktail%' OR LOWER(key) LIKE '%prosecco%' OR LOWER(key) LIKE '%pint%')
          AND key NOT LIKE '%pizza%'
          AND key NOT LIKE '%ticket%'
          AND ticket_data->>key != '0'
      )
    ) THEN true
    ELSE false
  END
WHERE ticket_data IS NOT NULL;