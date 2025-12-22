-- ============================================
-- Learning Leaderboard Migration
-- ============================================
-- Adds a leaderboard view for top learners
-- Tracks articles completed, videos watched, and learning XP

-- ============================================
-- 1. VIEW: Learning Leaderboard
-- ============================================
CREATE OR REPLACE VIEW learning_leaderboard AS
SELECT
  up.id as user_id,
  up.full_name,
  NULL::text as avatar_url,
  COALESCE(lp.articles_completed, 0) as articles_completed,
  COALESCE(lp.videos_completed, 0) as videos_completed,
  COALESCE(lp.articles_completed, 0) + COALESCE(lp.videos_completed, 0) as total_lessons,
  COALESCE(lp.total_xp_earned, 0) as total_xp,
  COALESCE(lp.quizzes_passed, 0) as quizzes_passed,
  COALESCE(lp.current_streak, 0) as current_streak,
  lp.last_activity_date
FROM user_profiles up
LEFT JOIN learning_progress lp ON lp.user_id = up.id
WHERE lp.articles_completed > 0 OR lp.videos_completed > 0
ORDER BY total_xp DESC, total_lessons DESC;

-- ============================================
-- 2. RLS Policy for Learning Leaderboard
-- ============================================
-- Views inherit RLS from underlying tables, but we grant SELECT to authenticated users
GRANT SELECT ON learning_leaderboard TO authenticated;

-- ============================================
-- 3. Function: Get Learning Leaderboard with Rank
-- ============================================
CREATE OR REPLACE FUNCTION get_learning_leaderboard(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  articles_completed INTEGER,
  videos_completed INTEGER,
  total_lessons BIGINT,
  total_xp INTEGER,
  quizzes_passed INTEGER,
  current_streak INTEGER,
  last_activity_date DATE,
  rank BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ll.user_id,
    ll.full_name,
    ll.avatar_url,
    ll.articles_completed::INTEGER,
    ll.videos_completed::INTEGER,
    ll.total_lessons,
    ll.total_xp::INTEGER,
    ll.quizzes_passed::INTEGER,
    ll.current_streak::INTEGER,
    ll.last_activity_date,
    ROW_NUMBER() OVER (ORDER BY ll.total_xp DESC, ll.total_lessons DESC)::BIGINT as rank
  FROM learning_leaderboard ll
  LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_learning_leaderboard TO authenticated;

-- ============================================
-- 4. Function: Get User Learning Rank
-- ============================================
CREATE OR REPLACE FUNCTION get_user_learning_rank(
  p_user_id UUID
)
RETURNS TABLE (
  rank BIGINT,
  total_users BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_xp INTEGER;
  v_user_lessons BIGINT;
BEGIN
  -- Get user's stats
  SELECT
    COALESCE(total_xp, 0),
    COALESCE(total_lessons, 0)
  INTO v_user_xp, v_user_lessons
  FROM learning_leaderboard
  WHERE user_id = p_user_id;

  -- If user not found, return nulls
  IF v_user_xp IS NULL THEN
    RETURN QUERY SELECT NULL::BIGINT, (SELECT COUNT(*) FROM learning_leaderboard)::BIGINT;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) + 1 FROM learning_leaderboard
     WHERE total_xp > v_user_xp
     OR (total_xp = v_user_xp AND total_lessons > v_user_lessons))::BIGINT as rank,
    (SELECT COUNT(*) FROM learning_leaderboard)::BIGINT as total_users;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_learning_rank TO authenticated;
