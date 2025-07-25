-- Add guest_notes column to checkin_sessions table
ALTER TABLE public.checkin_sessions 
ADD COLUMN guest_notes jsonb DEFAULT '{}'::jsonb;