
-- Create a profiles table for storing usernames and user info
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create a table to store uploaded guest lists
CREATE TABLE public.guest_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create a table to store individual guests from CSV uploads
CREATE TABLE public.guests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_list_id UUID REFERENCES public.guest_lists ON DELETE CASCADE NOT NULL,
  booking_code TEXT,
  booker_name TEXT,
  total_quantity INTEGER DEFAULT 1,
  show_time TEXT,
  item_details TEXT,
  notes TEXT,
  ticket_data JSONB, -- Store all ticket type columns as JSON
  original_row_index INTEGER,
  is_checked_in BOOLEAN DEFAULT FALSE,
  pager_number INTEGER,
  is_seated BOOLEAN DEFAULT FALSE,
  is_allocated BOOLEAN DEFAULT FALSE,
  table_assignments INTEGER[],
  checked_in_at TIMESTAMP WITH TIME ZONE,
  seated_at TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guest_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Guest lists policies  
CREATE POLICY "Authenticated users can view all guest lists" ON public.guest_lists FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can create guest lists" ON public.guest_lists FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can update guest lists" ON public.guest_lists FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can delete guest lists" ON public.guest_lists FOR DELETE USING (auth.uid() IS NOT NULL);

-- Guests policies
CREATE POLICY "Authenticated users can view all guests" ON public.guests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage guests" ON public.guests FOR ALL USING (auth.uid() IS NOT NULL);

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name'
  );
  RETURN new;
END;
$$;

-- Trigger to create profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable realtime for guests table so changes sync across devices
ALTER TABLE public.guests REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.guests;
