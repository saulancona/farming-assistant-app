-- =====================================================
-- Cleanup Script - Run this FIRST before 001_account_linking.sql
-- =====================================================

-- Drop all objects that might conflict
DROP TABLE IF EXISTS public.linking_requests CASCADE;
DROP TABLE IF EXISTS public.account_links CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS user_profiles_updated_at ON public.user_profiles;
DROP TRIGGER IF EXISTS account_links_updated_at ON public.account_links;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_updated_at();
DROP FUNCTION IF EXISTS public.get_user_with_linked_accounts(uuid);
DROP FUNCTION IF EXISTS public.link_account(uuid, text, text, text);

-- Success message
SELECT 'Cleanup complete! Now run 001_account_linking.sql' as message;
