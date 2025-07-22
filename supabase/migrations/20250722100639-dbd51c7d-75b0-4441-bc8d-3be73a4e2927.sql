
-- Add event_date column to guest_lists table
ALTER TABLE public.guest_lists 
ADD COLUMN event_date date;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.guest_lists.event_date IS 'The actual event date extracted from the filename, used for Viator logic and planning';
