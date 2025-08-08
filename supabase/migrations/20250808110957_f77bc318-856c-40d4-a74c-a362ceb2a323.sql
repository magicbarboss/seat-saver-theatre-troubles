-- Add arriving_late flag to guests for late-arrival tracking
ALTER TABLE public.guests
ADD COLUMN IF NOT EXISTS arriving_late boolean NOT NULL DEFAULT false;