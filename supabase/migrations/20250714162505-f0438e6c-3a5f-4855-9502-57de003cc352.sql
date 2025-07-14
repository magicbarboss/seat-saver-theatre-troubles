-- Fix Kelly Foote and Mrs Emma McNab pizza and drinks flags
UPDATE public.guests 
SET interval_pizza_order = true, interval_drinks_order = true
WHERE booker_name IN ('Kelly Foote', 'Mrs Emma McNab');

-- Let's also check what ticket_data looks like for these guests
SELECT booker_name, booking_code, total_quantity, ticket_data, interval_pizza_order, interval_drinks_order
FROM public.guests 
WHERE booker_name IN ('Kelly Foote', 'Mrs Emma McNab', 'Dominic', 'Edward Williams', 'Graham Northam')
ORDER BY booker_name;