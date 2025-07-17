-- Add friendship_groups column to checkin_sessions table
ALTER TABLE public.checkin_sessions 
ADD COLUMN friendship_groups jsonb DEFAULT '{}'::jsonb;