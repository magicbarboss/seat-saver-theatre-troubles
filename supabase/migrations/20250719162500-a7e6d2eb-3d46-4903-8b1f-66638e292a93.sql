-- Add manual override flag to guests table to prevent automatic processing from overriding manual edits
ALTER TABLE public.guests 
ADD COLUMN manual_override boolean DEFAULT false;

-- Add comment to explain the purpose
COMMENT ON COLUMN public.guests.manual_override IS 'Flag to indicate this guest data was manually edited and should not be processed by automatic GYG/Viator logic';