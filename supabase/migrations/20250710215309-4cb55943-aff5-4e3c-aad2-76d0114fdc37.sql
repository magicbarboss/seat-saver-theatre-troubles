-- Create table to store check-in system state
CREATE TABLE public.checkin_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  guest_list_id UUID NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  checked_in_guests INTEGER[] DEFAULT '{}',
  seated_guests INTEGER[] DEFAULT '{}', 
  seated_sections TEXT[] DEFAULT '{}',
  allocated_guests INTEGER[] DEFAULT '{}',
  guest_table_allocations JSONB DEFAULT '{}',
  pager_assignments JSONB DEFAULT '{}',
  party_groups JSONB DEFAULT '{}',
  booking_comments JSONB DEFAULT '{}',
  walk_in_guests JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.checkin_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view their own checkin sessions" 
ON public.checkin_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checkin sessions" 
ON public.checkin_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkin sessions" 
ON public.checkin_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checkin sessions" 
ON public.checkin_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create unique constraint to ensure one session per user per guest list per date
CREATE UNIQUE INDEX idx_checkin_sessions_user_guestlist_date 
ON public.checkin_sessions(user_id, guest_list_id, session_date);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_checkin_session_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_checkin_sessions_updated_at
BEFORE UPDATE ON public.checkin_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_checkin_session_updated_at();