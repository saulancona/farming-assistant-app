-- =============================================
-- MICRO-WINS SYSTEM (Instant Gratification)
-- =============================================
-- Small rewards for everyday actions to drive engagement
-- Price check, weather lookup, task completion, etc.

-- =============================================
-- MICRO-ACTION TYPES AND REWARDS
-- =============================================

-- Table to define micro-action rewards
CREATE TABLE micro_action_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type TEXT NOT NULL UNIQUE,
  action_name TEXT NOT NULL,
  action_name_sw TEXT,
  points_reward INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 1,

  -- Cooldown to prevent spam (in minutes, 0 = no limit)
  cooldown_minutes INTEGER DEFAULT 0,

  -- Daily limit (0 = unlimited)
  daily_limit INTEGER DEFAULT 5,

  -- Feedback messages
  feedback_message TEXT,
  feedback_message_sw TEXT,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Track user micro-actions
CREATE TABLE user_micro_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,

  -- Rewards given
  points_awarded INTEGER DEFAULT 0,
  xp_awarded INTEGER DEFAULT 0,

  -- Context
  context_data JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily action counts (for limits)
CREATE TABLE user_daily_action_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  action_date DATE NOT NULL DEFAULT CURRENT_DATE,
  count INTEGER DEFAULT 1,

  UNIQUE(user_id, action_type, action_date)
);

-- Badge progress tracking
CREATE TABLE user_badge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,

  UNIQUE(user_id, badge_type)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_user_micro_actions_user ON user_micro_actions(user_id);
CREATE INDEX idx_user_micro_actions_type ON user_micro_actions(action_type);
CREATE INDEX idx_user_micro_actions_created ON user_micro_actions(created_at DESC);
CREATE INDEX idx_user_daily_counts_user_date ON user_daily_action_counts(user_id, action_date);
CREATE INDEX idx_user_badge_progress_user ON user_badge_progress(user_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE micro_action_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_micro_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_action_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badge_progress ENABLE ROW LEVEL SECURITY;

-- Rewards config is public read
CREATE POLICY "Anyone can view micro action rewards"
  ON micro_action_rewards FOR SELECT
  USING (is_active = true);

-- Users can see their own actions
CREATE POLICY "Users can view their own micro actions"
  ON user_micro_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own micro actions"
  ON user_micro_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can see their daily counts
CREATE POLICY "Users can view their daily counts"
  ON user_daily_action_counts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can see their badge progress
CREATE POLICY "Users can view their badge progress"
  ON user_badge_progress FOR SELECT
  USING (auth.uid() = user_id);

-- =============================================
-- FUNCTIONS
-- =============================================

-- Award micro-reward for an action
CREATE OR REPLACE FUNCTION award_micro_reward(
  p_user_id UUID,
  p_action_type TEXT,
  p_context JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward RECORD;
  v_daily_count INTEGER;
  v_last_action TIMESTAMPTZ;
  v_cooldown_ok BOOLEAN;
  v_points INTEGER;
  v_xp INTEGER;
  v_action_id UUID;
  v_badge_progress JSONB;
BEGIN
  -- Get reward config
  SELECT * INTO v_reward
  FROM micro_action_rewards
  WHERE action_type = p_action_type AND is_active = true;

  IF NOT FOUND THEN
    -- Return success but no reward for unknown actions
    RETURN jsonb_build_object(
      'success', true,
      'rewarded', false,
      'reason', 'Unknown action type'
    );
  END IF;

  -- Check daily limit
  SELECT count INTO v_daily_count
  FROM user_daily_action_counts
  WHERE user_id = p_user_id
    AND action_type = p_action_type
    AND action_date = CURRENT_DATE;

  v_daily_count := COALESCE(v_daily_count, 0);

  IF v_reward.daily_limit > 0 AND v_daily_count >= v_reward.daily_limit THEN
    RETURN jsonb_build_object(
      'success', true,
      'rewarded', false,
      'reason', 'Daily limit reached',
      'dailyCount', v_daily_count,
      'dailyLimit', v_reward.daily_limit
    );
  END IF;

  -- Check cooldown
  IF v_reward.cooldown_minutes > 0 THEN
    SELECT MAX(created_at) INTO v_last_action
    FROM user_micro_actions
    WHERE user_id = p_user_id AND action_type = p_action_type;

    v_cooldown_ok := v_last_action IS NULL
      OR v_last_action < NOW() - (v_reward.cooldown_minutes || ' minutes')::INTERVAL;

    IF NOT v_cooldown_ok THEN
      RETURN jsonb_build_object(
        'success', true,
        'rewarded', false,
        'reason', 'Cooldown active',
        'nextRewardAt', v_last_action + (v_reward.cooldown_minutes || ' minutes')::INTERVAL
      );
    END IF;
  END IF;

  -- Award the reward
  v_points := v_reward.points_reward;
  v_xp := v_reward.xp_reward;

  -- Record the action
  INSERT INTO user_micro_actions (user_id, action_type, points_awarded, xp_awarded, context_data)
  VALUES (p_user_id, p_action_type, v_points, v_xp, p_context)
  RETURNING id INTO v_action_id;

  -- Update daily count
  INSERT INTO user_daily_action_counts (user_id, action_type, action_date, count)
  VALUES (p_user_id, p_action_type, CURRENT_DATE, 1)
  ON CONFLICT (user_id, action_type, action_date)
  DO UPDATE SET count = user_daily_action_counts.count + 1;

  -- Award XP to user profile
  UPDATE user_profiles
  SET total_xp = total_xp + v_xp
  WHERE id = p_user_id;

  -- Award points if user_points table exists
  INSERT INTO user_points (user_id, total_points, lifetime_points)
  VALUES (p_user_id, v_points, v_points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = user_points.total_points + v_points,
    lifetime_points = user_points.lifetime_points + v_points,
    updated_at = NOW();

  -- Record points transaction
  INSERT INTO points_transactions (user_id, amount, transaction_type, source, reference_id)
  VALUES (p_user_id, v_points, 'earn', 'micro_action', v_action_id);

  -- Update badge progress
  v_badge_progress := update_badge_progress(p_user_id, p_action_type);

  RETURN jsonb_build_object(
    'success', true,
    'rewarded', true,
    'actionId', v_action_id,
    'pointsAwarded', v_points,
    'xpAwarded', v_xp,
    'actionName', v_reward.action_name,
    'actionNameSw', v_reward.action_name_sw,
    'feedbackMessage', v_reward.feedback_message,
    'feedbackMessageSw', v_reward.feedback_message_sw,
    'dailyCount', v_daily_count + 1,
    'dailyLimit', v_reward.daily_limit,
    'badgeProgress', v_badge_progress
  );
END;
$$;

-- Update badge progress based on action
CREATE OR REPLACE FUNCTION update_badge_progress(
  p_user_id UUID,
  p_action_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_badge_type TEXT;
  v_target INTEGER;
  v_current INTEGER;
  v_is_new_badge BOOLEAN := false;
BEGIN
  -- Map actions to badge progress
  v_badge_type := CASE p_action_type
    WHEN 'price_check' THEN 'market_watcher'
    WHEN 'weather_check' THEN 'weather_guru'
    WHEN 'task_complete' THEN 'task_master'
    WHEN 'field_visit' THEN 'field_inspector'
    WHEN 'article_read' THEN 'knowledge_seeker'
    WHEN 'video_watch' THEN 'video_learner'
    WHEN 'community_post' THEN 'community_voice'
    WHEN 'photo_upload' THEN 'photo_journalist'
    ELSE NULL
  END;

  IF v_badge_type IS NULL THEN
    RETURN NULL;
  END IF;

  -- Set target based on badge type
  v_target := CASE v_badge_type
    WHEN 'market_watcher' THEN 10
    WHEN 'weather_guru' THEN 7
    WHEN 'task_master' THEN 20
    WHEN 'field_inspector' THEN 15
    WHEN 'knowledge_seeker' THEN 10
    WHEN 'video_learner' THEN 5
    WHEN 'community_voice' THEN 10
    WHEN 'photo_journalist' THEN 10
    ELSE 10
  END;

  -- Update or insert progress
  INSERT INTO user_badge_progress (user_id, badge_type, current_progress, target_progress)
  VALUES (p_user_id, v_badge_type, 1, v_target)
  ON CONFLICT (user_id, badge_type)
  DO UPDATE SET
    current_progress = LEAST(user_badge_progress.current_progress + 1, user_badge_progress.target_progress),
    is_completed = CASE
      WHEN user_badge_progress.current_progress + 1 >= user_badge_progress.target_progress
        AND NOT user_badge_progress.is_completed
      THEN true
      ELSE user_badge_progress.is_completed
    END,
    completed_at = CASE
      WHEN user_badge_progress.current_progress + 1 >= user_badge_progress.target_progress
        AND NOT user_badge_progress.is_completed
      THEN NOW()
      ELSE user_badge_progress.completed_at
    END
  RETURNING current_progress, is_completed INTO v_current, v_is_new_badge;

  -- Check if badge was just completed
  IF v_is_new_badge AND v_current = v_target THEN
    -- Award bonus XP for completing badge
    UPDATE user_profiles
    SET total_xp = total_xp + 25
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'badgeType', v_badge_type,
      'currentProgress', v_current,
      'targetProgress', v_target,
      'justCompleted', true,
      'bonusXp', 25
    );
  END IF;

  RETURN jsonb_build_object(
    'badgeType', v_badge_type,
    'currentProgress', v_current,
    'targetProgress', v_target,
    'stepsRemaining', v_target - v_current,
    'justCompleted', false
  );
END;
$$;

-- Get user's badge progress
CREATE OR REPLACE FUNCTION get_user_badge_progress(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_progress JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'badgeType', badge_type,
      'currentProgress', current_progress,
      'targetProgress', target_progress,
      'isCompleted', is_completed,
      'completedAt', completed_at,
      'percentComplete', ROUND((current_progress::DECIMAL / target_progress) * 100)
    )
    ORDER BY
      is_completed ASC,
      (current_progress::DECIMAL / target_progress) DESC
  )
  INTO v_progress
  FROM user_badge_progress
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_progress, '[]'::jsonb);
END;
$$;

-- Get user's micro-action stats
CREATE OR REPLACE FUNCTION get_micro_action_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today_actions INTEGER;
  v_today_points INTEGER;
  v_total_actions INTEGER;
  v_total_points INTEGER;
BEGIN
  -- Today's stats
  SELECT COUNT(*), COALESCE(SUM(points_awarded), 0)
  INTO v_today_actions, v_today_points
  FROM user_micro_actions
  WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE;

  -- All time stats
  SELECT COUNT(*), COALESCE(SUM(points_awarded), 0)
  INTO v_total_actions, v_total_points
  FROM user_micro_actions
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object(
    'todayActions', v_today_actions,
    'todayPoints', v_today_points,
    'totalActions', v_total_actions,
    'totalPoints', v_total_points
  );
END;
$$;

-- =============================================
-- SEED DATA: Micro-Action Rewards
-- =============================================

INSERT INTO micro_action_rewards (action_type, action_name, action_name_sw, points_reward, xp_reward, cooldown_minutes, daily_limit, feedback_message, feedback_message_sw) VALUES
-- Market & Prices
('price_check', 'Price Check', 'Kuangalia Bei', 1, 1, 5, 10, 'Staying informed! 📊', 'Kujua bei! 📊'),
('price_compare', 'Price Comparison', 'Kulinganisha Bei', 2, 2, 10, 5, 'Smart farmer! 🧠', 'Mkulima mzuri! 🧠'),

-- Weather
('weather_check', 'Weather Check', 'Kuangalia Hali ya Hewa', 1, 1, 30, 5, 'Weather-wise! ⛅', 'Kujua hali ya hewa! ⛅'),
('weather_forecast', 'Weekly Forecast View', 'Utabiri wa Wiki', 2, 2, 60, 3, 'Planning ahead! 📅', 'Kupanga mbele! 📅'),

-- Tasks & Farm Management
('task_complete', 'Task Completed', 'Kazi Imekamilika', 3, 3, 0, 20, 'Task done! ✅', 'Kazi imekwisha! ✅'),
('task_create', 'Task Created', 'Kazi Imeundwa', 1, 1, 0, 10, 'Organized! 📝', 'Umepanga! 📝'),
('field_visit', 'Field Record', 'Rekodi ya Shamba', 2, 2, 0, 10, 'Field tracked! 🌾', 'Shamba limerekodiwa! 🌾'),

-- Learning
('article_read', 'Article Read', 'Makala Imesomwa', 2, 3, 0, 10, 'Knowledge gained! 📚', 'Umejifunza! 📚'),
('video_watch', 'Video Watched', 'Video Imetazamwa', 3, 4, 0, 5, 'Learning! 🎬', 'Unajifunza! 🎬'),
('quiz_attempt', 'Quiz Attempted', 'Jaribio la Mtihani', 2, 2, 0, 5, 'Testing knowledge! 🎯', 'Kupima maarifa! 🎯'),

-- Community
('community_post', 'Community Post', 'Chapisho la Jamii', 3, 3, 5, 5, 'Sharing knowledge! 💬', 'Kushiriki maarifa! 💬'),
('community_comment', 'Community Comment', 'Maoni ya Jamii', 1, 1, 1, 15, 'Engaged! 💭', 'Umeshiriki! 💭'),
('community_like', 'Content Liked', 'Umependa', 1, 1, 0, 20, 'Appreciated! 👍', 'Umeshukuru! 👍'),

-- Photos & Documentation
('photo_upload', 'Photo Uploaded', 'Picha Imepakiwa', 2, 2, 0, 10, 'Documented! 📸', 'Imeandikwa! 📸'),
('pest_report', 'Pest Reported', 'Wadudu Wameripotiwa', 3, 3, 0, 5, 'Alert farmer! 🐛', 'Mkulima makini! 🐛'),

-- Financial Tracking
('expense_logged', 'Expense Logged', 'Gharama Imerekodiwa', 2, 2, 0, 10, 'Tracking costs! 💰', 'Kufuatilia gharama! 💰'),
('income_logged', 'Income Logged', 'Mapato Yamerekodiwa', 2, 2, 0, 10, 'Tracking earnings! 📈', 'Kufuatilia mapato! 📈'),

-- Inventory
('inventory_update', 'Inventory Updated', 'Hesabu Imesasishwa', 2, 2, 0, 10, 'Stock tracked! 📦', 'Bidhaa zimehesabika! 📦'),

-- AI Features
('ai_chat', 'AI Chat Used', 'AI Chat Imetumika', 1, 1, 5, 10, 'Smart farming! 🤖', 'Kilimo cha kisasa! 🤖'),
('ai_diagnosis', 'AI Diagnosis', 'Uchunguzi wa AI', 3, 3, 0, 5, 'Tech-savvy! 🔬', 'Ujuzi wa teknolojia! 🔬'),

-- Daily Actions
('daily_login', 'Daily Login', 'Kuingia Kila Siku', 2, 2, 1440, 1, 'Welcome back! 👋', 'Karibu tena! 👋'),
('streak_bonus', 'Streak Bonus', 'Bonasi ya Mfululizo', 5, 5, 1440, 1, 'Keep it up! 🔥', 'Endelea hivyo! 🔥');

-- =============================================
-- SEED DATA: Initial Badge Progress Targets
-- =============================================

-- Note: Badge progress is created dynamically when users perform actions
-- The targets are defined in the update_badge_progress function

-- =============================================
-- GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION award_micro_reward TO authenticated;
GRANT EXECUTE ON FUNCTION update_badge_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_badge_progress TO authenticated;
GRANT EXECUTE ON FUNCTION get_micro_action_stats TO authenticated;
