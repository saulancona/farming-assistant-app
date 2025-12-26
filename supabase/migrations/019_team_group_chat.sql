-- =====================================================
-- Migration 019: Team Group Chat
-- =====================================================
-- Adds group chat functionality to teams
-- =====================================================

-- Team messages table for group chat
CREATE TABLE IF NOT EXISTS public.team_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name text NOT NULL,
  content text NOT NULL,
  message_type text DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'system')),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_created_at ON team_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_messages_sender_id ON team_messages(sender_id);

-- Enable RLS
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see/send messages in teams they're members of

-- Policy for selecting messages (team members only)
DROP POLICY IF EXISTS "Team members can view team messages" ON team_messages;
CREATE POLICY "Team members can view team messages"
  ON team_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_messages.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Policy for inserting messages (team members only)
DROP POLICY IF EXISTS "Team members can send team messages" ON team_messages;
CREATE POLICY "Team members can send team messages"
  ON team_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_messages.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Policy for deleting own messages
DROP POLICY IF EXISTS "Users can delete own team messages" ON team_messages;
CREATE POLICY "Users can delete own team messages"
  ON team_messages FOR DELETE
  USING (sender_id = auth.uid());

-- Function to get team messages with pagination
CREATE OR REPLACE FUNCTION get_team_messages(
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
SET search_path = public
AS $$
BEGIN
  -- Verify user is a team member
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm
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
    COALESCE(tm.role, 'member') as sender_role,
    up.profile_image_url as sender_avatar_url
  FROM team_messages m
  LEFT JOIN team_members tm ON tm.team_id = m.team_id AND tm.user_id = m.sender_id
  LEFT JOIN user_profiles up ON up.id = m.sender_id
  WHERE m.team_id = p_team_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Function to send a team message
CREATE OR REPLACE FUNCTION send_team_message(
  p_team_id uuid,
  p_content text,
  p_message_type text DEFAULT 'text'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_name text;
  v_message_id uuid;
BEGIN
  -- Verify user is a team member
  IF NOT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = p_team_id
    AND tm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a member of this team';
  END IF;

  -- Get sender name
  SELECT COALESCE(up.full_name, au.email, 'Team Member')
  INTO v_sender_name
  FROM auth.users au
  LEFT JOIN user_profiles up ON up.id = au.id
  WHERE au.id = auth.uid();

  -- Insert message
  INSERT INTO team_messages (team_id, sender_id, sender_name, content, message_type)
  VALUES (p_team_id, auth.uid(), v_sender_name, p_content, p_message_type)
  RETURNING id INTO v_message_id;

  RETURN v_message_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_team_messages(uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION send_team_message(uuid, text, text) TO authenticated;

-- Enable realtime for team_messages
ALTER PUBLICATION supabase_realtime ADD TABLE team_messages;
