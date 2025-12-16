-- Check what policies exist and their definitions
SELECT
  tablename,
  policyname,
  cmd as command,
  qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('fields', 'expenses', 'tasks')
ORDER BY tablename, cmd;