-- Update checkin_sessions to support guest-list-specific sessions
-- Drop the existing unique constraint to allow multiple sessions per date
ALTER TABLE public.checkin_sessions 
DROP CONSTRAINT IF EXISTS checkin_sessions_user_id_session_date_key;

-- Add a new unique constraint that includes guest_list_id
ALTER TABLE public.checkin_sessions 
ADD CONSTRAINT checkin_sessions_user_id_guest_list_id_session_date_key 
UNIQUE (user_id, guest_list_id, session_date);