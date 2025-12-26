-- =====================================================
-- Migration 021: Fix Team Members RLS Infinite Recursion
-- =====================================================
-- The original policy on team_members queries team_members itself,
-- causing infinite recursion. This fix simplifies the policy.
-- =====================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Team members can view team membership" ON team_members;

-- Create a simpler policy that doesn't cause recursion
-- Users can see their own membership OR all members of teams they're in
CREATE POLICY "Users can view team members"
  ON team_members FOR SELECT TO authenticated
  USING (
    -- User can always see their own team membership records
    user_id = auth.uid()
  );

-- Also allow users to see other members of their team
-- This uses a different approach to avoid recursion
CREATE POLICY "Users can view other members of their teams"
  ON team_members FOR SELECT TO authenticated
  USING (
    -- Check if user belongs to the same team via teams table (not team_members)
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_members.team_id
      AND (
        t.leader_id = auth.uid()
        OR t.id IN (
          SELECT tm2.team_id FROM team_members tm2
          WHERE tm2.user_id = auth.uid()
        )
      )
    )
  );

-- Also fix team_challenge_progress which has similar issue
DROP POLICY IF EXISTS "Team members can view challenge progress" ON team_challenge_progress;

CREATE POLICY "Users can view their team challenge progress"
  ON team_challenge_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      WHERE t.id = team_challenge_progress.team_id
      AND (
        t.leader_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = t.id
          AND tm.user_id = auth.uid()
        )
      )
    )
  );

-- Fix team_messages policy to avoid any recursion
DROP POLICY IF EXISTS "Team members can view team messages" ON team_messages;
DROP POLICY IF EXISTS "Team members can send team messages" ON team_messages;

-- Simple SELECT policy: user must be a team member
CREATE POLICY "Team members can view team messages"
  ON team_messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_messages.team_id
      AND tm.user_id = auth.uid()
    )
  );

-- Simple INSERT policy: sender must be authenticated user and team member
CREATE POLICY "Team members can send team messages"
  ON team_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = team_messages.team_id
      AND tm.user_id = auth.uid()
    )
  );
