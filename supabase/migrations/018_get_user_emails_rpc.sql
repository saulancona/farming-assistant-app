-- =====================================================
-- Migration 018: Get User Emails RPC Function
-- =====================================================
-- Creates a secure function to get user emails from auth.users
-- This is needed because user_profiles.email may not be populated
-- for all users, but auth.users always has the email.
-- =====================================================

-- Function to get emails for multiple user IDs
-- Returns a table of id and email
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids uuid[])
RETURNS TABLE (id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.id,
    au.email
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_emails(uuid[]) TO authenticated;

-- Also sync any missing emails from auth.users to user_profiles
-- This fixes existing users who don't have email in user_profiles
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id
  AND (up.email IS NULL OR up.email = '')
  AND au.email IS NOT NULL;
