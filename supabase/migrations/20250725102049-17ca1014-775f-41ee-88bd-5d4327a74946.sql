-- Add columns for staff-updated orders
ALTER TABLE public.guests 
ADD COLUMN staff_updated_order text,
ADD COLUMN order_last_updated_by uuid,
ADD COLUMN order_last_updated_at timestamp with time zone;