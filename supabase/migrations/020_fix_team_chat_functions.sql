-- =====================================================
-- Migration 020: Fix Team Chat Functions
-- =====================================================
-- Recreate functions with proper permissions and error handling
-- =====================================================

-- Drop existing functions first
DROP FUNCTION IF EXISTS get_team_messages(uuid, int, int);
DROP FUNCTION IF EXISTS send_team_message(uuid, text, text);

-- Function to get team messages with pagination
CREATE OR REPLACE FUNCTION public.get_team_messages(
  p_team_id uuid,
  p_limit int DEFAULT 50,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  team_id uuid,
  sender_id uuid,
  sender_name text,
  content text,
  message_type text,
  created_at timestamptz,
  sender_role text,
  sender_avatar_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Verify user is a team member
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team_id
    AND tm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.team_id,
    m.sender_id,
    m.sender_name,
    m.content,
    m.message_type,
    m.created_at,
    COALESCE(tm.role, 'member')::text as sender_role,
    up.profile_image_url as sender_avatar_url
  FROM public.team_messages m
  LEFT JOIN public.team_members tm ON tm.team_id = m.team_id AND tm.user_id = m.sender_id
  LEFT JOIN public.user_profiles up ON up.id = m.sender_id
  WHERE m.team_id = p_team_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to send a team message
CREATE OR REPLACE FUNCTION public.send_team_message(
  p_team_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_sender_name text;
  v_message_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Verify user is a team member
  IF NOT EXISTS (
    SELECT 1 FROM public.team_members tm
    WHERE tm.team_id = p_team_id
    AND tm.user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  -- Get sender name from user_profiles first, then auth.users
  SELECT COALESCE(up.full_name, au.email, 'Team Member')
  INTO v_sender_name
  FROM auth.users au
  LEFT JOIN public.user_profiles up ON up.id = au.id
  WHERE au.id = v_user_id;

  -- Default if not found
  IF v_sender_name IS NULL THEN
    v_sender_name := 'Team Member';
  END IF;

  -- Insert message
  INSERT INTO public.team_messages (team_id, sender_id, sender_name, content, message_type)
  VALUES (p_team_id, v_user_id, v_sender_name, p_content, p_message_type)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.get_team_messages(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_team_message(uuid, text, text) TO authenticated;

-- Also grant to anon in case needed
GRANT EXECUTE ON FUNCTION public.get_team_messages(uuid, int, int) TO anon;
GRANT EXECUTE ON FUNCTION public.send_team_message(uuid, text, text) TO anon;
