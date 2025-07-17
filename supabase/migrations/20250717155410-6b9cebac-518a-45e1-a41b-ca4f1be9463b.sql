-- Clean approach: Keep the record with correct extracted_tickets and delete the rest
WITH correct_record AS (
  SELECT id 
  FROM guests 
  WHERE booker_name = 'Denise O''Keeffe' 
  AND booking_code = 'VMLK-010725'
  AND ticket_data->>'extracted_tickets' = '{"House Magicians Show Ticket & 2 Drinks": 4}'
  LIMIT 1
)
DELETE FROM guests 
WHERE booker_name = 'Denise O''Keeffe' 
AND booking_code = 'VMLK-010725'
AND id NOT IN (SELECT id FROM correct_record);