-- Migration: 027_multiple_teams.sql
-- Description: Allow users to join multiple teams

-- ============================================
-- 1. UPDATE: Get User's Teams (plural)
-- ============================================
-- Replace the single team function with one that returns all teams

CREATE OR REPLACE FUNCTION get_user_teams(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_teams JSON;
BEGIN
  SELECT json_agg(team_info) INTO v_teams
  FROM (
    SELECT
      t.id,
      t.name,
      t.name_sw as "nameSw",
      t.description,
      t.description_sw as "descriptionSw",
      t.team_type as "teamType",
      t.leader_id as "leaderId",
      t.invite_code as "inviteCode",
      t.avatar_url as "avatarUrl",
      t.location,
      t.max_members as "maxMembers",
      t.created_at as "createdAt",
      tm.role as "userRole",
      tm.joined_at as "joinedAt",
      json_build_object(
        'totalMembers', COALESCE(ts.total_members, 0),
        'totalXp', COALESCE(ts.total_xp, 0),
        'totalReferrals', COALESCE(ts.total_referrals, 0),
        'lessonsCompleted', COALESCE(ts.total_lessons_completed, 0),
        'missionsCompleted', COALESCE(ts.total_missions_completed, 0),
        'photosSubmitted', COALESCE(ts.total_photos_submitted, 0),
        'challengesCompleted', COALESCE(ts.challenges_completed, 0)
      ) as stats
    FROM team_members tm
    JOIN teams t ON t.id = tm.team_id
    LEFT JOIN team_stats ts ON ts.team_id = t.id
    WHERE tm.user_id = p_user_id
      AND t.is_active = true
    ORDER BY tm.joined_at DESC
  ) as team_info;

  RETURN json_build_object('teams', COALESCE(v_teams, '[]'::json));
END;
$$;

-- ============================================
-- 2. UPDATE: Join Team Function
-- ============================================
-- Update to allow joining multiple teams (remove check for existing membership in ANY team)

CREATE OR REPLACE FUNCTION join_team(
  p_user_id UUID,
  p_invite_code TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_team_name TEXT;
  v_member_count INTEGER;
  v_max_members INTEGER;
BEGIN
  -- Find team by invite code
  SELECT id, name, max_members INTO v_team_id, v_team_name, v_max_members
  FROM teams
  WHERE invite_code = upper(p_invite_code) AND is_active = true;

  IF v_team_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invite code');
  END IF;

  -- Check if already a member OF THIS TEAM (not any team)
  IF EXISTS(SELECT 1 FROM team_members WHERE team_id = v_team_id AND user_id = p_user_id) THEN
    RETURN json_build_object('success', false, 'error', 'Already a member of this team');
  END IF;

  -- Check member limit
  SELECT total_members INTO v_member_count FROM team_stats WHERE team_id = v_team_id;
  IF v_member_count >= v_max_members THEN
    RETURN json_build_object('success', false, 'error', 'Team is full');
  END IF;

  -- Add member
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_user_id, 'member');

  -- Update stats
  UPDATE team_stats SET total_members = total_members + 1, updated_at = now()
  WHERE team_id = v_team_id;

  -- Award XP
  PERFORM award_xp(p_user_id, 'Joined Team', 'Umejiunga na Timu', 10, jsonb_build_object('team_id', v_team_id));

  RETURN json_build_object(
    'success', true,
    'team_id', v_team_id,
    'team_name', v_team_name
  );
END;
$$;

-- ============================================
-- 3. NEW: Get Team Count for User
-- ============================================
CREATE OR REPLACE FUNCTION get_user_team_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id
  WHERE tm.user_id = p_user_id
    AND t.is_active = true;

  RETURN v_count;
END;
$$;

-- ============================================
-- 4. Grant Permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_user_teams TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_team_count TO authenticated;
