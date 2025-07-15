-- Clear stale checkin_sessions that don't match current guest counts
-- This will force a fresh session initialization
DELETE FROM public.checkin_sessions 
WHERE guest_list_id = '128fecb0-d90e-47a3-8acf-31129d1776f9';