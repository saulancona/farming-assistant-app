-- =====================================================
-- Fix Daily Challenge Progress Tracking
-- Migration 016: Track unique days for day-based challenges
-- =====================================================

-- Table to track which days a user performed each challenge action
-- This prevents counting multiple price checks on the same day as multiple days
CREATE TABLE IF NOT EXISTS challenge_daily_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES weekly_challenges(id) ON DELETE CASCADE NOT NULL,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id, action_date) -- Only one action per day per challenge
);

CREATE INDEX idx_challenge_daily_actions_user ON challenge_daily_actions(user_id);
CREATE INDEX idx_challenge_daily_actions_date ON challenge_daily_actions(action_date);

-- Enable RLS
ALTER TABLE challenge_daily_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily actions" ON challenge_daily_actions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own daily actions" ON challenge_daily_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Replace the update_challenge_progress function to track unique days
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
  v_actual_increment INTEGER;
  v_unique_days INTEGER;
BEGIN
  -- Find active challenges matching this action
  FOR v_challenge IN
    SELECT * FROM weekly_challenges
    WHERE target_action = p_action
    AND is_active = TRUE
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    -- Check if this is a day-based challenge (like "check prices 4 days")
    -- Day-based challenges have target actions like 'check_prices' where we count unique days
    IF p_action IN ('check_prices', 'daily_login', 'daily_visit') THEN
      -- Check if user already recorded this action today for this challenge
      SELECT EXISTS(
        SELECT 1 FROM challenge_daily_actions
        WHERE user_id = p_user_id
        AND challenge_id = v_challenge.id
        AND action_date = CURRENT_DATE
      ) INTO v_already_counted_today;

      IF v_already_counted_today THEN
        -- Already counted today, skip this challenge
        CONTINUE;
      END IF;

      -- Record today's action
      INSERT INTO challenge_daily_actions (user_id, challenge_id, action_date, action_type)
      VALUES (p_user_id, v_challenge.id, CURRENT_DATE, p_action)
      ON CONFLICT (user_id, challenge_id, action_date) DO NOTHING;

      -- Count unique days for this challenge (within challenge date range)
      SELECT COUNT(DISTINCT action_date) INTO v_unique_days
      FROM challenge_daily_actions
      WHERE user_id = p_user_id
      AND challenge_id = v_challenge.id
      AND (v_challenge.start_date IS NULL OR action_date >= v_challenge.start_date)
      AND (v_challenge.end_date IS NULL OR action_date <= v_challenge.end_date);

      -- Get or create progress record
      INSERT INTO user_challenge_progress (user_id, challenge_id, target_progress, status, current_progress)
      VALUES (p_user_id, v_challenge.id, v_challenge.target_count, 'active', 0)
      ON CONFLICT (user_id, challenge_id) DO NOTHING;

      -- Update progress to reflect unique days count
      UPDATE user_challenge_progress SET
        current_progress = LEAST(v_unique_days, target_progress)
      WHERE user_id = p_user_id AND challenge_id = v_challenge.id AND status = 'active'
      RETURNING * INTO v_progress;

    ELSE
      -- Non-day-based challenges (like uploading photos, completing tasks)
      -- These increment normally each time the action is performed

      -- Get or create progress
      INSERT INTO user_challenge_progress (user_id, challenge_id, target_progress, status)
      VALUES (p_user_id, v_challenge.id, v_challenge.target_count, 'active')
      ON CONFLICT (user_id, challenge_id) DO NOTHING;

      -- Update progress
      UPDATE user_challenge_progress SET
        current_progress = LEAST(current_progress + p_increment, target_progress)
      WHERE user_id = p_user_id AND challenge_id = v_challenge.id AND status = 'active'
      RETURNING * INTO v_progress;
    END IF;

    -- Check completion
    IF v_progress.current_progress >= v_progress.target_progress AND v_progress.status = 'active' THEN
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

-- Grant necessary permissions
GRANT ALL ON challenge_daily_actions TO authenticated;

COMMENT ON TABLE challenge_daily_actions IS 'Tracks unique days for day-based challenges like Price Checker';
COMMENT ON FUNCTION update_challenge_progress IS 'Updates challenge progress, handling day-based challenges by counting unique days';
