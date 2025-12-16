-- ============================================
-- DIAGNOSTIC SCRIPT - Check Current State
-- ============================================
-- Run this to see what warnings might be appearing

-- ============================================
-- 1. CHECK ALL RLS POLICIES
-- ============================================
SELECT
  tablename,
  policyname,
  cmd AS operation,
  permissive,
  CASE
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END AS using_status,
  CASE
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END AS check_status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd, policyname;

-- ============================================
-- 2. CHECK FOR TABLES WITHOUT RLS ENABLED
-- ============================================
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY tablename;

-- ============================================
-- 3. CHECK ALL INDEXES
-- ============================================
SELECT
  schemaname,
  tablename,
  indexname,
  CASE
    WHEN indexdef LIKE '%UNIQUE%' THEN 'UNIQUE'
    WHEN indexdef LIKE '%GIN%' THEN 'GIN'
    WHEN indexdef LIKE '%GIST%' THEN 'GIST'
    ELSE 'BTREE'
  END AS index_type
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 4. CHECK FUNCTIONS AND THEIR SECURITY
-- ============================================
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END AS security_type,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'increment_post_likes_count',
    'decrement_post_likes_count',
    'increment_post_comments_count',
    'decrement_post_comments_count',
    'increment_article_likes_count',
    'decrement_article_likes_count',
    'increment_article_views',
    'get_or_create_conversation',
    'mark_messages_read',
    'update_updated_at_column'
  )
ORDER BY p.proname;

-- ============================================
-- 5. CHECK CONSTRAINTS
-- ============================================
SELECT
  conrelid::regclass AS table_name,
  conname AS constraint_name,
  CASE contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 't' THEN 'TRIGGER'
  END AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid::regclass::text IN (
  'community_posts', 'post_likes', 'post_comments', 'conversations',
  'messages', 'knowledge_articles', 'article_likes', 'article_bookmarks'
)
ORDER BY table_name, constraint_type, constraint_name;

-- ============================================
-- 6. CHECK TRIGGERS
-- ============================================
SELECT
  event_object_table AS table_name,
  trigger_name,
  event_manipulation AS event,
  action_timing AS timing,
  action_statement AS function
FROM information_schema.triggers
WHERE event_object_schema = 'public'
ORDER BY table_name, trigger_name;

-- ============================================
-- 7. CHECK TABLE SIZES (for performance context)
-- ============================================
SELECT
  schemaname,
  relname AS table_name,
  n_live_tup AS row_count,
  pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
  pg_size_pretty(pg_relation_size(relid)) AS table_size,
  pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(relid) DESC;

-- ============================================
-- 8. CHECK FOR MISSING POLICIES (common warning source)
-- ============================================
-- Tables that have RLS enabled but might be missing some policies
WITH policy_coverage AS (
  SELECT
    t.tablename,
    t.rowsecurity AS rls_enabled,
    COUNT(CASE WHEN p.cmd = 'SELECT' THEN 1 END) AS select_policies,
    COUNT(CASE WHEN p.cmd = 'INSERT' THEN 1 END) AS insert_policies,
    COUNT(CASE WHEN p.cmd = 'UPDATE' THEN 1 END) AS update_policies,
    COUNT(CASE WHEN p.cmd = 'DELETE' THEN 1 END) AS delete_policies
  FROM pg_tables t
  LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
  WHERE t.schemaname = 'public'
  GROUP BY t.tablename, t.rowsecurity
)
SELECT
  tablename,
  CASE WHEN rls_enabled THEN 'Enabled' ELSE 'Disabled' END AS rls_status,
  select_policies,
  insert_policies,
  update_policies,
  delete_policies,
  CASE
    WHEN rls_enabled AND (select_policies = 0 OR insert_policies = 0 OR update_policies = 0 OR delete_policies = 0)
    THEN '⚠️ Missing policies!'
    ELSE '✓ OK'
  END AS status
FROM policy_coverage
ORDER BY tablename;
