-- Update existing guest records to extract show times from item_details
UPDATE public.guests 
SET show_time = CASE 
  WHEN item_details ~ '\[7:00pm\]' THEN '7pm'
  WHEN item_details ~ '\[8:00pm\]' THEN '8pm'
  WHEN item_details ~ '\[9:00pm\]' THEN '9pm'
  WHEN item_details ~ '7:00pm' THEN '7pm'
  WHEN item_details ~ '8:00pm' THEN '8pm'
  WHEN item_details ~ '9:00pm' THEN '9pm'
  ELSE show_time
END
WHERE (show_time IS NULL OR show_time = '') 
  AND item_details IS NOT NULL 
  AND item_details != '';