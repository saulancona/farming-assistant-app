-- =====================================================
-- Debug Script - Run this to see what exists
-- =====================================================

-- 1. Check what tables exist
SELECT 'EXISTING TABLES:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('user_profiles', 'account_links', 'linking_requests')
ORDER BY table_name;

-- 2. Check columns in user_profiles if it exists
SELECT 'COLUMNS IN user_profiles:' as info;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Check existing triggers
SELECT 'EXISTING TRIGGERS:' as info;
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
   OR event_object_table = 'users';

-- 4. Check existing functions
SELECT 'EXISTING FUNCTIONS:' as info;
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('handle_new_user', 'handle_updated_at', 'get_user_with_linked_accounts', 'link_account');
