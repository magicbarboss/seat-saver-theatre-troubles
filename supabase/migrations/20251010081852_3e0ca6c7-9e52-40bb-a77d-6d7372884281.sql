-- Add pizza selection tracking to guests table
ALTER TABLE guests 
ADD COLUMN IF NOT EXISTS interval_pizza_selection jsonb DEFAULT '[]'::jsonb;

-- Add pizza selections tracking to checkin_sessions table
ALTER TABLE checkin_sessions 
ADD COLUMN IF NOT EXISTS pizza_selections jsonb DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN guests.interval_pizza_selection IS 'Array of selected pizza types for interval orders';
COMMENT ON COLUMN checkin_sessions.pizza_selections IS 'Map of guest indices to their pizza selections';