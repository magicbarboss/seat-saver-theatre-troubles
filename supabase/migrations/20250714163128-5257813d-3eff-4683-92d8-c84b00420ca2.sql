-- Clean up duplicate Dominic Stewart records
WITH dominic_duplicates AS (
  SELECT id, 
         ROW_NUMBER() OVER (
           PARTITION BY booker_name, booking_code
           ORDER BY id DESC
         ) as rn
  FROM guests 
  WHERE booker_name ILIKE '%Dominic%Stewart%'
)
DELETE FROM guests 
WHERE id IN (
  SELECT id FROM dominic_duplicates WHERE rn > 1
);