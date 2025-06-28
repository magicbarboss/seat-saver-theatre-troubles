
-- Add columns to the guests table to track check-in system state
ALTER TABLE public.guests 
ADD COLUMN IF NOT EXISTS booking_comments TEXT,
ADD COLUMN IF NOT EXISTS interval_pizza_order BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS interval_drinks_order BOOLEAN DEFAULT FALSE;

-- Update the guests table to have better indexing for real-time queries
CREATE INDEX IF NOT EXISTS idx_guests_guest_list_checked_in ON public.guests(guest_list_id, is_checked_in);
CREATE INDEX IF NOT EXISTS idx_guests_guest_list_seated ON public.guests(guest_list_id, is_seated);
