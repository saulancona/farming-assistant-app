-- =====================================================
-- Migration 022: Comprehensive RLS Fix
-- =====================================================
-- Completely removes all problematic recursive policies
-- and recreates them without self-referencing subqueries
-- =====================================================

-- =====================================================
-- STEP 1: Drop ALL existing policies on affected tables
-- =====================================================

-- Drop all policies on team_members
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;
DROP POLICY IF EXISTS "Users can view other members of their teams" ON team_members;
DROP POLICY IF EXISTS "team_members_select_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_insert_policy" ON team_members;
DROP POLICY IF EXISTS "team_members_delete_policy" ON team_members;

-- Drop all policies on team_messages
DROP POLICY IF EXISTS "Team members can view team messages" ON team_messages;
DROP POLICY IF EXISTS "Team members can send team messages" ON team_messages;
DROP POLICY IF EXISTS "Users can delete own team messages" ON team_messages;
DROP POLICY IF EXISTS "team_messages_select_policy" ON team_messages;
DROP POLICY IF EXISTS "team_messages_insert_policy" ON team_messages;

-- Drop all policies on team_challenge_progress
DROP POLICY IF EXISTS "Team members can view challenge progress" ON team_challenge_progress;
DROP POLICY IF EXISTS "Users can view their team challenge progress" ON team_challenge_progress;
DROP POLICY IF EXISTS "team_challenge_progress_select_policy" ON team_challenge_progress;

-- =====================================================
-- STEP 2: Create helper function to check team membership
-- =====================================================
-- This function avoids recursion by being SECURITY DEFINER
-- and bypassing RLS when checking membership

CREATE OR REPLACE FUNCTION public.is_team_member(p_team_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
    AND user_id = p_user_id
  );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_team_member(uuid, uuid) TO authenticated;

-- =====================================================
-- STEP 3: Create new RLS policies using the helper function
-- =====================================================

-- team_members: Simple policy - users can see their own records
-- and records of teams they belong to (via leader check on teams table)
CREATE POLICY "team_members_select_own"
  ON team_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- team_members: Users can see other members via teams table (avoids recursion)
CREATE POLICY "team_members_select_team"
  ON team_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
      AND t.leader_id = auth.uid()
    )
  );

-- team_members: Allow insert via security definer functions only (join_team)
-- No direct insert policy needed since join_team is SECURITY DEFINER

-- team_members: Allow delete via security definer functions only (leave_team)
-- No direct delete policy needed since leave_team is SECURITY DEFINER

-- =====================================================
-- team_messages policies using helper function
-- =====================================================

-- SELECT: Use the helper function to check membership
CREATE POLICY "team_messages_select"
  ON team_messages FOR SELECT TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
  );

-- INSERT: Sender must be authenticated user and a team member
CREATE POLICY "team_messages_insert"
  ON team_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.is_team_member(team_id, auth.uid())
  );

-- DELETE: Only own messages
CREATE POLICY "team_messages_delete"
  ON team_messages FOR DELETE TO authenticated
  USING (sender_id = auth.uid());

-- =====================================================
-- team_challenge_progress policies using helper function
-- =====================================================

CREATE POLICY "team_challenge_progress_select"
  ON team_challenge_progress FOR SELECT TO authenticated
  USING (
    public.is_team_member(team_id, auth.uid())
  );

-- =====================================================
-- STEP 4: Verify RLS is enabled
-- =====================================================
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_challenge_progress ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 5: Grant necessary permissions
-- =====================================================
GRANT SELECT ON team_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON team_messages TO authenticated;
GRANT SELECT ON team_challenge_progress TO authenticated;
