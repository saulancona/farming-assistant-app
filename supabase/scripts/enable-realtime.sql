-- Enable Supabase Realtime for all tables
-- Run this in Supabase SQL Editor

-- Enable realtime on fields table
ALTER PUBLICATION supabase_realtime ADD TABLE fields;

-- Enable realtime on expenses table
ALTER PUBLICATION supabase_realtime ADD TABLE expenses;

-- Enable realtime on income table
ALTER PUBLICATION supabase_realtime ADD TABLE income;

-- Enable realtime on tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Enable realtime on inventory table
ALTER PUBLICATION supabase_realtime ADD TABLE inventory;

-- Enable realtime on storage_bins table
ALTER PUBLICATION supabase_realtime ADD TABLE storage_bins;

-- Verify realtime is enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

SELECT 'Realtime enabled for all tables!' as result;
