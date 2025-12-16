-- Check RLS Status for All Tables
-- Run this in Supabase SQL Editor to verify RLS is enabled

-- Check if RLS is enabled on tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('fields', 'expenses', 'income', 'tasks', 'inventory', 'storage_bins', 'community_posts', 'knowledge_articles')
ORDER BY tablename;

-- List all policies for our tables
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('fields', 'expenses', 'income', 'tasks', 'inventory', 'storage_bins', 'community_posts', 'knowledge_articles')
ORDER BY tablename, policyname;

-- Check if user_id column exists in all tables
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('fields', 'expenses', 'income', 'tasks', 'inventory', 'storage_bins', 'community_posts', 'knowledge_articles')
  AND column_name = 'user_id'
ORDER BY table_name;
