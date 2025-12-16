-- Enable DELETE events for Supabase Realtime
-- This sets replica identity to FULL so DELETE events include the old row data
-- Run this in Supabase SQL Editor

-- Set replica identity to FULL for all tables
ALTER TABLE fields REPLICA IDENTITY FULL;
ALTER TABLE expenses REPLICA IDENTITY FULL;
ALTER TABLE income REPLICA IDENTITY FULL;
ALTER TABLE tasks REPLICA IDENTITY FULL;
ALTER TABLE inventory REPLICA IDENTITY FULL;
ALTER TABLE storage_bins REPLICA IDENTITY FULL;

-- Verify replica identity is set
SELECT
  schemaname,
  tablename,
  CASE relreplident
    WHEN 'd' THEN 'default'
    WHEN 'n' THEN 'nothing'
    WHEN 'f' THEN 'full'
    WHEN 'i' THEN 'index'
  END AS replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_publication_tables pt ON pt.tablename = c.relname AND pt.schemaname = n.nspname
WHERE pt.pubname = 'supabase_realtime'
  AND n.nspname = 'public'
ORDER BY c.relname;

SELECT 'Replica identity set to FULL for DELETE events!' as result;
