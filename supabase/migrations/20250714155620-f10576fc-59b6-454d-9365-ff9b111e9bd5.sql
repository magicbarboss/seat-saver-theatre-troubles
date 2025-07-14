-- Clean up duplicate entries using a different approach
-- First, create a temporary table with unique entries
WITH unique_guests AS (
  SELECT DISTINCT ON (booking_code, booker_name) 
    id, booking_code, booker_name
  FROM guests 
  WHERE (booking_code = 'PHRX-060725' AND booker_name = 'Kelly Foote')
     OR (booking_code = 'FMAM-220625' AND booker_name = 'Kelly Ridout')
     OR (booking_code = 'BDTD-270625' AND booker_name = 'Mrs Emma McNab')
  ORDER BY booking_code, booker_name, id
)
-- Delete all duplicates except the ones in unique_guests
DELETE FROM guests 
WHERE ((booking_code = 'PHRX-060725' AND booker_name = 'Kelly Foote')
    OR (booking_code = 'FMAM-220625' AND booker_name = 'Kelly Ridout')
    OR (booking_code = 'BDTD-270625' AND booker_name = 'Mrs Emma McNab'))
  AND id NOT IN (SELECT id FROM unique_guests);

-- Update Kelly Foote to have correct pizza and drinks flags
UPDATE guests 
SET interval_pizza_order = true, interval_drinks_order = true
WHERE booking_code = 'PHRX-060725' 
AND booker_name = 'Kelly Foote';

-- Update Emma McNab to have correct pizza and drinks flags  
UPDATE guests 
SET interval_pizza_order = true, interval_drinks_order = true
WHERE booking_code = 'BDTD-270625' 
AND booker_name = 'Mrs Emma McNab';