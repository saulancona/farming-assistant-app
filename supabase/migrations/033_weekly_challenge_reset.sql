-- =====================================================
-- Weekly Challenge Reset - Allow challenges to reset each week
-- Migration 033: Add week tracking to challenge progress
-- =====================================================

-- Step 1: Add week_year column to user_challenge_progress
-- Format: YYYYWW (e.g., 202602 = Week 2 of 2026)
ALTER TABLE user_challenge_progress
ADD COLUMN IF NOT EXISTS week_year TEXT;

-- Set week_year for existing records based on started_at
UPDATE user_challenge_progress
SET week_year = TO_CHAR(started_at, 'IYYY') || TO_CHAR(started_at, 'IW')
WHERE week_year IS NULL;

-- Step 2: Drop the old unique constraint and add new one with week
ALTER TABLE user_challenge_progress
DROP CONSTRAINT IF EXISTS user_challenge_progress_user_id_challenge_id_key;

-- Add new unique constraint that includes week_year
-- This allows same user to have progress for same challenge in different weeks
ALTER TABLE user_challenge_progress
ADD CONSTRAINT user_challenge_progress_user_challenge_week_key
UNIQUE (user_id, challenge_id, week_year);

-- Step 3: Add week_year to challenge_daily_actions for weekly reset
ALTER TABLE challenge_daily_actions
ADD COLUMN IF NOT EXISTS week_year TEXT;

UPDATE challenge_daily_actions
SET week_year = TO_CHAR(action_date, 'IYYY') || TO_CHAR(action_date, 'IW')
WHERE week_year IS NULL;

-- Step 4: Create function to get current week-year string
CREATE OR REPLACE FUNCTION get_current_week_year()
RETURNS TEXT AS $$
BEGIN
  RETURN TO_CHAR(CURRENT_DATE, 'IYYY') || TO_CHAR(CURRENT_DATE, 'IW');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Update the update_challenge_progress function to use week_year
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_user_id UUID,
  p_action TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_challenge weekly_challenges%ROWTYPE;
  v_progress user_challenge_progress%ROWTYPE;
  v_completed_count INTEGER := 0;
  v_already_counted_today BOOLEAN;
  v_unique_days INTEGER;
  v_current_week TEXT;
BEGIN
  -- Get current week-year for weekly challenge tracking
  v_current_week := get_current_week_year();

  -- Find active challenges matching this action
  FOR v_challenge IN
    SELECT * FROM weekly_challenges
    WHERE target_action = p_action
    AND is_active = TRUE
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    -- For recurring weekly challenges, check if is_recurring = true
    -- If so, use week_year to allow reset each week

    -- Check if this is a day-based challenge (like "check prices 4 days")
    IF p_action IN ('check_prices', 'daily_login', 'daily_visit') THEN
      -- Check if user already recorded this action today for this challenge AND week
      SELECT EXISTS(
        SELECT 1 FROM challenge_daily_actions
        WHERE user_id = p_user_id
        AND challenge_id = v_challenge.id
        AND action_date = CURRENT_DATE
        AND (week_year = v_current_week OR week_year IS NULL)
      ) INTO v_already_counted_today;

      IF v_already_counted_today THEN
        -- Already counted today, skip this challenge
        CONTINUE;
      END IF;

      -- Record today's action with week_year
      INSERT INTO challenge_daily_actions (user_id, challenge_id, action_date, action_type, week_year)
      VALUES (p_user_id, v_challenge.id, CURRENT_DATE, p_action, v_current_week)
      ON CONFLICT (user_id, challenge_id, action_date) DO UPDATE SET week_year = v_current_week;

      -- Count unique days for this challenge in CURRENT WEEK only
      SELECT COUNT(DISTINCT action_date) INTO v_unique_days
      FROM challenge_daily_actions
      WHERE user_id = p_user_id
      AND challenge_id = v_challenge.id
      AND week_year = v_current_week;

      -- Get or create progress record FOR THIS WEEK
      INSERT INTO user_challenge_progress (user_id, challenge_id, target_progress, status, current_progress, week_year)
      VALUES (p_user_id, v_challenge.id, v_challenge.target_count, 'active', 0, v_current_week)
      ON CONFLICT (user_id, challenge_id, week_year) DO NOTHING;

      -- Update progress to reflect unique days count for current week
      UPDATE user_challenge_progress SET
        current_progress = LEAST(v_unique_days, target_progress)
      WHERE user_id = p_user_id
      AND challenge_id = v_challenge.id
      AND week_year = v_current_week
      AND status = 'active'
      RETURNING * INTO v_progress;

    ELSE
      -- Non-day-based challenges (like uploading photos, completing tasks)
      -- These also reset weekly for recurring challenges

      -- Get or create progress FOR THIS WEEK
      INSERT INTO user_challenge_progress (user_id, challenge_id, target_progress, status, week_year)
      VALUES (p_user_id, v_challenge.id, v_challenge.target_count, 'active', v_current_week)
      ON CONFLICT (user_id, challenge_id, week_year) DO NOTHING;

      -- Update progress for current week
      UPDATE user_challenge_progress SET
        current_progress = LEAST(current_progress + p_increment, target_progress)
      WHERE user_id = p_user_id
      AND challenge_id = v_challenge.id
      AND week_year = v_current_week
      AND status = 'active'
      RETURNING * INTO v_progress;
    END IF;

    -- Check completion
    IF v_progress IS NOT NULL AND v_progress.current_progress >= v_progress.target_progress AND v_progress.status = 'active' THEN
      UPDATE user_challenge_progress SET
        status = 'completed',
        completed_at = NOW(),
        xp_awarded = v_challenge.xp_reward,
        points_awarded = v_challenge.points_reward
      WHERE id = v_progress.id;

      -- Award rewards
      PERFORM award_xp(p_user_id, 'challenge_complete', 'Changamoto imekamilika: ' || v_challenge.name, v_challenge.xp_reward, '{}');
      PERFORM award_points(p_user_id, v_challenge.points_reward, 'challenge', v_challenge.id, 'Challenge completion reward');

      v_completed_count := v_completed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'challenges_completed', v_completed_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update the view to only show current week's progress (or most recent)
DROP VIEW IF EXISTS user_challenges_with_details;

CREATE OR REPLACE VIEW user_challenges_with_details AS
SELECT
  ucp.id,
  ucp.user_id,
  ucp.challenge_id,
  ucp.current_progress,
  ucp.target_progress,
  ucp.status,
  ucp.started_at,
  ucp.completed_at,
  ucp.xp_awarded,
  ucp.points_awarded,
  ucp.week_year,
  wc.name AS challenge_name,
  wc.name_sw AS challenge_name_sw,
  wc.description AS challenge_description,
  wc.description_sw AS challenge_description_sw,
  wc.challenge_type,
  wc.target_action,
  wc.xp_reward AS challenge_xp_reward,
  wc.points_reward AS challenge_points_reward,
  wc.start_date,
  wc.end_date,
  wc.is_recurring
FROM user_challenge_progress ucp
JOIN weekly_challenges wc ON ucp.challenge_id = wc.id;

-- Grant access to the view
GRANT SELECT ON user_challenges_with_details TO authenticated;

-- Step 7: Create a helper function to get user's current week challenge progress
CREATE OR REPLACE FUNCTION get_user_current_week_challenges(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  challenge_id UUID,
  current_progress INTEGER,
  target_progress INTEGER,
  status challenge_status,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  xp_awarded INTEGER,
  points_awarded INTEGER,
  week_year TEXT,
  challenge_name VARCHAR,
  challenge_name_sw VARCHAR,
  challenge_description TEXT,
  challenge_type challenge_type,
  challenge_xp_reward INTEGER,
  challenge_points_reward INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ucp.id,
    ucp.user_id,
    ucp.challenge_id,
    ucp.current_progress,
    ucp.target_progress,
    ucp.status,
    ucp.started_at,
    ucp.completed_at,
    ucp.xp_awarded,
    ucp.points_awarded,
    ucp.week_year,
    wc.name,
    wc.name_sw,
    wc.description,
    wc.challenge_type,
    wc.xp_reward,
    wc.points_reward
  FROM user_challenge_progress ucp
  JOIN weekly_challenges wc ON ucp.challenge_id = wc.id
  WHERE ucp.user_id = p_user_id
  AND ucp.week_year = get_current_week_year()
  ORDER BY ucp.started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_current_week_challenges(UUID) TO authenticated;

COMMENT ON COLUMN user_challenge_progress.week_year IS 'ISO week-year (YYYYWW) for weekly challenge reset tracking';
COMMENT ON FUNCTION get_current_week_year IS 'Returns current ISO week-year string (e.g., 202602 for week 2 of 2026)';
COMMENT ON FUNCTION get_user_current_week_challenges IS 'Get user challenge progress for current week only';
