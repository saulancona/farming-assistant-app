-- Simple RLS Status Check
-- This will show if Row Level Security is enabled on each table

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('fields', 'expenses', 'income', 'tasks', 'inventory', 'storage_bins', 'community_posts', 'knowledge_articles')
ORDER BY tablename;
