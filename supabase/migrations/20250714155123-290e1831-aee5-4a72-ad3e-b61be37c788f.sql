-- First, clean up duplicate entries for Kelly Foote (keeping only one with correct data)
DELETE FROM guests 
WHERE booking_code = 'PHRX-060725' 
AND booker_name = 'Kelly Foote'
AND id NOT IN (
  SELECT MIN(id) 
  FROM guests 
  WHERE booking_code = 'PHRX-060725' 
  AND booker_name = 'Kelly Foote'
);

-- Clean up duplicate entries for Kelly Ridout
DELETE FROM guests 
WHERE booking_code = 'FMAM-220625' 
AND booker_name = 'Kelly Ridout'
AND id NOT IN (
  SELECT MIN(id) 
  FROM guests 
  WHERE booking_code = 'FMAM-220625' 
  AND booker_name = 'Kelly Ridout'
);

-- Clean up duplicate entries for Mrs Emma McNab
DELETE FROM guests 
WHERE booking_code = 'BDTD-270625' 
AND booker_name = 'Mrs Emma McNab'
AND id NOT IN (
  SELECT MIN(id) 
  FROM guests 
  WHERE booking_code = 'BDTD-270625' 
  AND booker_name = 'Mrs Emma McNab'
);

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