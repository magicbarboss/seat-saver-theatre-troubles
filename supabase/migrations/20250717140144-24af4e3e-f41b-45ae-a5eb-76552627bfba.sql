-- Add diet_info and magic_info columns to guests table for safety and show enhancement
ALTER TABLE public.guests 
ADD COLUMN diet_info text,
ADD COLUMN magic_info text;