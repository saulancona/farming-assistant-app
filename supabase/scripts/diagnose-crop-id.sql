-- =============================================
-- DIAGNOSTIC: Find where crop_id is referenced
-- Run this FIRST to identify the issue
-- =============================================

-- Check for triggers that might reference crop_id
SELECT
    t.trigger_name,
    t.event_manipulation,
    t.event_object_table,
    t.action_statement
FROM information_schema.triggers t
WHERE t.action_statement ILIKE '%crop_id%'
   OR t.trigger_name ILIKE '%crop%';

-- Check for functions that might reference crop_id
SELECT
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND pg_get_functiondef(p.oid) ILIKE '%crop_id%';

-- Check for policies that might reference crop_id
SELECT
    schemaname,
    tablename,
    policyname,
    qual,
    with_check
FROM pg_policies
WHERE qual::text ILIKE '%crop_id%'
   OR with_check::text ILIKE '%crop_id%';

-- Check if any table actually has a crop_id column
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE column_name = 'crop_id'
  AND table_schema = 'public';

-- Check for foreign key constraints involving crop_id
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND (kcu.column_name = 'crop_id' OR ccu.column_name = 'crop_id');

-- List all existing tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
