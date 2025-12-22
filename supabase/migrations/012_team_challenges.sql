-- ============================================
-- Team Challenges Migration
-- ============================================
-- Implements team-based gamification features:
-- - Teams (church, co-op, youth group)
-- - Team challenges with collective goals
-- - Team leaderboard and achievements

-- ============================================
-- 1. ENUM: Team Types
-- ============================================
DO $$ BEGIN
  CREATE TYPE team_type AS ENUM ('church', 'coop', 'youth_group', 'village', 'school', 'other');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE team_role AS ENUM ('leader', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE team_challenge_status AS ENUM ('active', 'completed', 'failed', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. TABLE: Teams
-- ============================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_sw TEXT,
  description TEXT,
  description_sw TEXT,
  team_type team_type NOT NULL DEFAULT 'other',
  leader_id UUID NOT NULL REFERENCES auth.users(id),
  invite_code TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  location TEXT,
  is_active BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 3. TABLE: Team Members
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role team_role DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- ============================================
-- 4. TABLE: Team Challenges
-- ============================================
CREATE TABLE IF NOT EXISTS team_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_sw TEXT,
  description TEXT,
  description_sw TEXT,
  challenge_type TEXT NOT NULL, -- 'referrals', 'learning', 'missions', 'photos'
  target_count INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 100,
  points_reward INTEGER DEFAULT 50,
  badge_name TEXT,
  badge_icon TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 5. TABLE: Team Challenge Progress
-- ============================================
CREATE TABLE IF NOT EXISTS team_challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES team_challenges(id) ON DELETE CASCADE,
  current_progress INTEGER DEFAULT 0,
  status team_challenge_status DEFAULT 'active',
  completed_at TIMESTAMPTZ,
  rewards_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, challenge_id)
);

-- ============================================
-- 6. TABLE: Team Stats (Cached)
-- ============================================
CREATE TABLE IF NOT EXISTS team_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL UNIQUE REFERENCES teams(id) ON DELETE CASCADE,
  total_members INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  total_referrals INTEGER DEFAULT 0,
  total_lessons_completed INTEGER DEFAULT 0,
  total_missions_completed INTEGER DEFAULT 0,
  total_photos_submitted INTEGER DEFAULT 0,
  challenges_completed INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 7. TABLE: Team Achievements
-- ============================================
CREATE TABLE IF NOT EXISTS team_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  achievement_name TEXT NOT NULL,
  achievement_name_sw TEXT,
  achievement_icon TEXT NOT NULL,
  description TEXT,
  description_sw TEXT,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id, achievement_name)
);

-- ============================================
-- 8. INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_teams_invite_code ON teams(invite_code);
CREATE INDEX IF NOT EXISTS idx_teams_leader ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_challenge_progress_team ON team_challenge_progress(team_id);
CREATE INDEX IF NOT EXISTS idx_team_challenge_progress_challenge ON team_challenge_progress(challenge_id);

-- ============================================
-- 9. FUNCTION: Generate Team Invite Code
-- ============================================
CREATE OR REPLACE FUNCTION generate_team_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_code TEXT;
  v_exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 6-character alphanumeric code
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) for 6));

    -- Check if code exists
    SELECT EXISTS(SELECT 1 FROM teams WHERE invite_code = v_code) INTO v_exists;

    EXIT WHEN NOT v_exists;
  END LOOP;

  RETURN v_code;
END;
$$;

-- ============================================
-- 10. FUNCTION: Create Team
-- ============================================
CREATE OR REPLACE FUNCTION create_team(
  p_user_id UUID,
  p_name TEXT,
  p_name_sw TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_description_sw TEXT DEFAULT NULL,
  p_team_type team_type DEFAULT 'other',
  p_location TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
  v_invite_code TEXT;
BEGIN
  -- Generate invite code
  v_invite_code := generate_team_invite_code();

  -- Create team
  INSERT INTO teams (name, name_sw, description, description_sw, team_type, leader_id, invite_code, location)
  VALUES (p_name, p_name_sw, p_description, p_description_sw, p_team_type, p_user_id, v_invite_code, p_location)
  RETURNING id INTO v_team_id;

  -- Add leader as member
  INSERT INTO team_members (team_id, user_id, role)
  VALUES (v_team_id, p_user_id, 'leader');

  -- Initialize team stats
  INSERT INTO team_stats (team_id, total_members)
  VALUES (v_team_id, 1);

  -- Award XP for creating team
  PERFORM award_xp(p_user_id, 'Team Created', 'Timu Imeundwa', 25, jsonb_build_object('team_id', v_team_id));

  RETURN json_build_object(
    'success', true,
    'team_id', v_team_id,
    'invite_code', v_invite_code
  );
END;
$$;

-- ============================================
-- 11. FUNCTION: Join Team
-- ============================================
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

  -- Check if already a member
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
-- 12. FUNCTION: Leave Team
-- ============================================
CREATE OR REPLACE FUNCTION leave_team(
  p_user_id UUID,
  p_team_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_leader BOOLEAN;
  v_member_count INTEGER;
BEGIN
  -- Check if user is the leader
  SELECT (leader_id = p_user_id) INTO v_is_leader FROM teams WHERE id = p_team_id;

  IF v_is_leader THEN
    -- Check member count
    SELECT total_members INTO v_member_count FROM team_stats WHERE team_id = p_team_id;

    IF v_member_count > 1 THEN
      RETURN json_build_object('success', false, 'error', 'Transfer leadership before leaving');
    END IF;

    -- Delete team if leader is the only member
    DELETE FROM teams WHERE id = p_team_id;
    RETURN json_build_object('success', true, 'message', 'Team deleted');
  END IF;

  -- Remove member
  DELETE FROM team_members WHERE team_id = p_team_id AND user_id = p_user_id;

  -- Update stats
  UPDATE team_stats SET total_members = total_members - 1, updated_at = now()
  WHERE team_id = p_team_id;

  RETURN json_build_object('success', true, 'message', 'Left team successfully');
END;
$$;

-- ============================================
-- 13. FUNCTION: Update Team Challenge Progress
-- ============================================
CREATE OR REPLACE FUNCTION update_team_challenge_progress(
  p_team_id UUID,
  p_challenge_type TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge RECORD;
  v_current_progress INTEGER;
BEGIN
  -- Find active challenges of this type
  FOR v_challenge IN
    SELECT tc.id, tc.target_count, tc.xp_reward, tc.points_reward, tc.badge_name, tc.badge_icon
    FROM team_challenges tc
    WHERE tc.challenge_type = p_challenge_type
      AND tc.is_active = true
      AND tc.start_date <= CURRENT_DATE
      AND tc.end_date >= CURRENT_DATE
  LOOP
    -- Get or create progress record
    INSERT INTO team_challenge_progress (team_id, challenge_id, current_progress)
    VALUES (p_team_id, v_challenge.id, 0)
    ON CONFLICT (team_id, challenge_id) DO NOTHING;

    -- Update progress
    UPDATE team_challenge_progress
    SET current_progress = current_progress + p_increment,
        updated_at = now()
    WHERE team_id = p_team_id
      AND challenge_id = v_challenge.id
      AND status = 'active'
    RETURNING current_progress INTO v_current_progress;

    -- Check if completed
    IF v_current_progress >= v_challenge.target_count THEN
      UPDATE team_challenge_progress
      SET status = 'completed', completed_at = now()
      WHERE team_id = p_team_id AND challenge_id = v_challenge.id;

      -- Update team stats
      UPDATE team_stats
      SET challenges_completed = challenges_completed + 1,
          total_xp = total_xp + v_challenge.xp_reward,
          updated_at = now()
      WHERE team_id = p_team_id;

      -- Award badge if defined
      IF v_challenge.badge_name IS NOT NULL THEN
        INSERT INTO team_achievements (team_id, achievement_name, achievement_icon, description)
        VALUES (p_team_id, v_challenge.badge_name, COALESCE(v_challenge.badge_icon, '🏆'), 'Completed team challenge')
        ON CONFLICT (team_id, achievement_name) DO NOTHING;
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 14. FUNCTION: Get Team Details
-- ============================================
CREATE OR REPLACE FUNCTION get_team_details(p_team_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team RECORD;
  v_stats RECORD;
  v_members JSON;
  v_achievements JSON;
BEGIN
  -- Get team info
  SELECT * INTO v_team FROM teams WHERE id = p_team_id;

  IF v_team IS NULL THEN
    RETURN json_build_object('error', 'Team not found');
  END IF;

  -- Get stats
  SELECT * INTO v_stats FROM team_stats WHERE team_id = p_team_id;

  -- Get members with profile info
  SELECT json_agg(json_build_object(
    'userId', tm.user_id,
    'role', tm.role,
    'joinedAt', tm.joined_at,
    'fullName', up.full_name
  )) INTO v_members
  FROM team_members tm
  LEFT JOIN user_profiles up ON up.id = tm.user_id
  WHERE tm.team_id = p_team_id;

  -- Get achievements
  SELECT json_agg(json_build_object(
    'name', achievement_name,
    'nameSw', achievement_name_sw,
    'icon', achievement_icon,
    'earnedAt', earned_at
  )) INTO v_achievements
  FROM team_achievements
  WHERE team_id = p_team_id;

  RETURN json_build_object(
    'id', v_team.id,
    'name', v_team.name,
    'nameSw', v_team.name_sw,
    'description', v_team.description,
    'descriptionSw', v_team.description_sw,
    'teamType', v_team.team_type,
    'leaderId', v_team.leader_id,
    'inviteCode', v_team.invite_code,
    'location', v_team.location,
    'createdAt', v_team.created_at,
    'stats', json_build_object(
      'totalMembers', COALESCE(v_stats.total_members, 0),
      'totalXp', COALESCE(v_stats.total_xp, 0),
      'totalReferrals', COALESCE(v_stats.total_referrals, 0),
      'lessonsCompleted', COALESCE(v_stats.total_lessons_completed, 0),
      'missionsCompleted', COALESCE(v_stats.total_missions_completed, 0),
      'photosSubmitted', COALESCE(v_stats.total_photos_submitted, 0),
      'challengesCompleted', COALESCE(v_stats.challenges_completed, 0)
    ),
    'members', COALESCE(v_members, '[]'::json),
    'achievements', COALESCE(v_achievements, '[]'::json)
  );
END;
$$;

-- ============================================
-- 15. FUNCTION: Get User's Team
-- ============================================
CREATE OR REPLACE FUNCTION get_user_team(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT team_id INTO v_team_id
  FROM team_members
  WHERE user_id = p_user_id
  LIMIT 1;

  IF v_team_id IS NULL THEN
    RETURN json_build_object('team', NULL);
  END IF;

  RETURN json_build_object('team', get_team_details(v_team_id));
END;
$$;

-- ============================================
-- 16. VIEW: Team Leaderboard
-- ============================================
CREATE OR REPLACE VIEW team_leaderboard AS
SELECT
  t.id as team_id,
  t.name,
  t.name_sw,
  t.team_type,
  t.avatar_url,
  t.location,
  ts.total_members,
  ts.total_xp,
  ts.total_referrals,
  ts.total_lessons_completed,
  ts.total_missions_completed,
  ts.total_photos_submitted,
  ts.challenges_completed,
  ROW_NUMBER() OVER (ORDER BY ts.total_xp DESC, ts.challenges_completed DESC) as rank
FROM teams t
JOIN team_stats ts ON ts.team_id = t.id
WHERE t.is_active = true
ORDER BY ts.total_xp DESC, ts.challenges_completed DESC;

-- ============================================
-- 17. FUNCTION: Get Team Leaderboard
-- ============================================
CREATE OR REPLACE FUNCTION get_team_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  team_id UUID,
  name TEXT,
  name_sw TEXT,
  team_type team_type,
  avatar_url TEXT,
  location TEXT,
  total_members INTEGER,
  total_xp INTEGER,
  total_referrals INTEGER,
  challenges_completed INTEGER,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tl.team_id,
    tl.name,
    tl.name_sw,
    tl.team_type,
    tl.avatar_url,
    tl.location,
    tl.total_members,
    tl.total_xp,
    tl.total_referrals,
    tl.challenges_completed,
    tl.rank
  FROM team_leaderboard tl
  LIMIT p_limit;
END;
$$;

-- ============================================
-- 18. FUNCTION: Get Active Team Challenges
-- ============================================
CREATE OR REPLACE FUNCTION get_active_team_challenges(p_team_id UUID DEFAULT NULL)
RETURNS TABLE (
  challenge_id UUID,
  name TEXT,
  name_sw TEXT,
  description TEXT,
  description_sw TEXT,
  challenge_type TEXT,
  target_count INTEGER,
  xp_reward INTEGER,
  points_reward INTEGER,
  badge_name TEXT,
  badge_icon TEXT,
  start_date DATE,
  end_date DATE,
  current_progress INTEGER,
  status team_challenge_status
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tc.id as challenge_id,
    tc.name,
    tc.name_sw,
    tc.description,
    tc.description_sw,
    tc.challenge_type,
    tc.target_count,
    tc.xp_reward,
    tc.points_reward,
    tc.badge_name,
    tc.badge_icon,
    tc.start_date,
    tc.end_date,
    COALESCE(tcp.current_progress, 0) as current_progress,
    COALESCE(tcp.status, 'active'::team_challenge_status) as status
  FROM team_challenges tc
  LEFT JOIN team_challenge_progress tcp ON tcp.challenge_id = tc.id AND tcp.team_id = p_team_id
  WHERE tc.is_active = true
    AND tc.start_date <= CURRENT_DATE
    AND tc.end_date >= CURRENT_DATE
  ORDER BY tc.end_date ASC;
END;
$$;

-- ============================================
-- 19. INSERT: Initial Team Challenges
-- ============================================
INSERT INTO team_challenges (name, name_sw, description, description_sw, challenge_type, target_count, xp_reward, points_reward, badge_name, badge_icon, start_date, end_date)
VALUES
  ('Referral Champions', 'Mabingwa wa Rufaa', 'Team goal: 50 referrals', 'Lengo la timu: Rufaa 50', 'referrals', 50, 500, 250, 'Referral Champions', '🏆', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days'),
  ('Learning Together', 'Kujifunza Pamoja', 'Team goal: 80% module completion', 'Lengo la timu: Kukamilisha moduli 80%', 'learning', 100, 300, 150, 'Learning Team', '📚', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days'),
  ('Crop Plan Masters', 'Mabingwa wa Mpango wa Mazao', 'Team goal: 100 crop plans submitted', 'Lengo la timu: Mipango ya mazao 100', 'missions', 100, 400, 200, 'Mission Masters', '🎯', CURRENT_DATE, CURRENT_DATE + INTERVAL '90 days'),
  ('Photo Patrol Team', 'Timu ya Doria ya Picha', 'Team goal: 200 pest/crop photos', 'Lengo la timu: Picha 200 za wadudu/mazao', 'photos', 200, 350, 175, 'Photo Patrol', '📸', CURRENT_DATE, CURRENT_DATE + INTERVAL '60 days')
ON CONFLICT DO NOTHING;

-- ============================================
-- 20. RLS Policies
-- ============================================
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_achievements ENABLE ROW LEVEL SECURITY;

-- Teams: Anyone can view, only leader can update
CREATE POLICY "Teams are viewable by all authenticated users"
  ON teams FOR SELECT TO authenticated USING (true);

CREATE POLICY "Team leaders can update their teams"
  ON teams FOR UPDATE TO authenticated
  USING (auth.uid() = leader_id);

-- Team Members: Members can view their team
CREATE POLICY "Team members can view team membership"
  ON team_members FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    OR user_id = auth.uid()
  );

-- Team Challenges: Public read
CREATE POLICY "Team challenges are viewable by all"
  ON team_challenges FOR SELECT TO authenticated USING (true);

-- Team Challenge Progress: Team members can view
CREATE POLICY "Team members can view challenge progress"
  ON team_challenge_progress FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
  );

-- Team Stats: Public read
CREATE POLICY "Team stats are viewable by all"
  ON team_stats FOR SELECT TO authenticated USING (true);

-- Team Achievements: Public read
CREATE POLICY "Team achievements are viewable by all"
  ON team_achievements FOR SELECT TO authenticated USING (true);

-- ============================================
-- 21. Grant Permissions
-- ============================================
GRANT SELECT ON teams TO authenticated;
GRANT SELECT ON team_members TO authenticated;
GRANT SELECT ON team_challenges TO authenticated;
GRANT SELECT ON team_challenge_progress TO authenticated;
GRANT SELECT ON team_stats TO authenticated;
GRANT SELECT ON team_achievements TO authenticated;
GRANT SELECT ON team_leaderboard TO authenticated;

GRANT EXECUTE ON FUNCTION create_team TO authenticated;
GRANT EXECUTE ON FUNCTION join_team TO authenticated;
GRANT EXECUTE ON FUNCTION leave_team TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_details TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_team TO authenticated;
GRANT EXECUTE ON FUNCTION get_team_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_team_challenges TO authenticated;
GRANT EXECUTE ON FUNCTION update_team_challenge_progress TO authenticated;
