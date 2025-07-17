-- Delete duplicate records for Denise O'Keeffe, keeping only the one with correct extracted_tickets
DELETE FROM guests 
WHERE booker_name = 'Denise O''Keeffe' 
AND booking_code = 'VMLK-010725'
AND id != '2b75cab9-5407-45d1-8d92-a6783a8daaa8';