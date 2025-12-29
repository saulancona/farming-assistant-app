-- =====================================================
-- Migration 023: Farmer Score (Trust Score)
-- =====================================================
-- Implements a composite trust score (0-100) based on:
-- - Learning (25 pts): modules completed
-- - Missions (25 pts): seasonal missions completed
-- - Engagement (25 pts): daily activity + streaks
-- - Reliability (25 pts): data quality + photo uploads
-- =====================================================

-- ============================================
-- 1. TABLE: Farmer Scores
-- ============================================
CREATE TABLE IF NOT EXISTS farmer_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Score components (0-25 each)
  learning_score INTEGER DEFAULT 0 CHECK (learning_score >= 0 AND learning_score <= 25),
  mission_score INTEGER DEFAULT 0 CHECK (mission_score >= 0 AND mission_score <= 25),
  engagement_score INTEGER DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 25),
  reliability_score INTEGER DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 25),

  -- Total score (0-100)
  total_score INTEGER GENERATED ALWAYS AS (
    learning_score + mission_score + engagement_score + reliability_score
  ) STORED,

  -- Tier based on total score
  tier TEXT DEFAULT 'bronze' CHECK (tier IN ('bronze', 'silver', 'gold', 'champion')),

  -- Metadata
  last_calculated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_farmer_scores_user_id ON farmer_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_farmer_scores_total_score ON farmer_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_farmer_scores_tier ON farmer_scores(tier);

-- Enable RLS
ALTER TABLE farmer_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own farmer score"
  ON farmer_scores FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view all farmer scores for leaderboard"
  ON farmer_scores FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- 2. FUNCTION: Calculate Farmer Score
-- ============================================
CREATE OR REPLACE FUNCTION calculate_farmer_score(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_learning_score INTEGER := 0;
  v_mission_score INTEGER := 0;
  v_engagement_score INTEGER := 0;
  v_reliability_score INTEGER := 0;
  v_total_score INTEGER := 0;
  v_tier TEXT := 'bronze';

  -- Calculation variables
  v_articles_completed INTEGER := 0;
  v_videos_completed INTEGER := 0;
  v_missions_completed INTEGER := 0;
  v_current_streak INTEGER := 0;
  v_total_logins INTEGER := 0;
  v_fields_count INTEGER := 0;
  v_crop_plans_count INTEGER := 0;
  v_photo_uploads INTEGER := 0;
  v_profile_complete BOOLEAN := false;
BEGIN
  -- ============================================
  -- LEARNING SCORE (0-25)
  -- Based on articles and videos completed
  -- Formula: (articles + videos*1.5) / 50 * 25, capped at 25
  -- ============================================
  SELECT
    COALESCE(SUM(CASE WHEN lp.content_type = 'article' AND lp.completed THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN lp.content_type = 'video' AND lp.completed THEN 1 ELSE 0 END), 0)
  INTO v_articles_completed, v_videos_completed
  FROM learning_progress lp
  WHERE lp.user_id = p_user_id;

  v_learning_score := LEAST(25, FLOOR((v_articles_completed + v_videos_completed * 1.5) / 50 * 25));

  -- ============================================
  -- MISSION SCORE (0-25)
  -- Based on completed missions (seasonal crop plans)
  -- Formula: completed_missions / 10 * 25, capped at 25
  -- For now, use crop_plans as proxy for missions
  -- ============================================
  SELECT COUNT(*)
  INTO v_crop_plans_count
  FROM crop_plans
  WHERE user_id = p_user_id
    AND status = 'completed';

  v_mission_score := LEAST(25, FLOOR(v_crop_plans_count::NUMERIC / 10 * 25));

  -- ============================================
  -- ENGAGEMENT SCORE (0-25)
  -- Based on daily streaks and activity
  -- Formula: min(streak, 30)/30 * 15 + activity_bonus (up to 10)
  -- ============================================
  SELECT COALESCE(gp.current_streak, 0)
  INTO v_current_streak
  FROM gamification_profiles gp
  WHERE gp.user_id = p_user_id;

  -- Streak contribution (0-15 points)
  v_engagement_score := FLOOR(LEAST(v_current_streak, 30)::NUMERIC / 30 * 15);

  -- Activity bonus: count of recent activities (0-10 points)
  SELECT COUNT(*)
  INTO v_total_logins
  FROM xp_transactions
  WHERE user_id = p_user_id
    AND created_at > now() - interval '30 days';

  v_engagement_score := v_engagement_score + LEAST(10, FLOOR(v_total_logins::NUMERIC / 10));
  v_engagement_score := LEAST(25, v_engagement_score);

  -- ============================================
  -- RELIABILITY SCORE (0-25)
  -- Based on data quality and completeness
  -- - Profile complete: 10 points
  -- - Fields added: 5 points (for 3+ fields)
  -- - Photo uploads: 5 points (for 5+ photos)
  -- - No flagged data: 5 points (always granted for now)
  -- ============================================

  -- Check profile completeness
  SELECT
    (up.full_name IS NOT NULL AND up.full_name != '' AND
     up.farm_name IS NOT NULL AND up.farm_name != '' AND
     up.location IS NOT NULL AND up.location != '')
  INTO v_profile_complete
  FROM user_profiles up
  WHERE up.id = p_user_id;

  IF v_profile_complete THEN
    v_reliability_score := 10;
  ELSE
    v_reliability_score := 5; -- Partial credit
  END IF;

  -- Fields added bonus
  SELECT COUNT(*)
  INTO v_fields_count
  FROM fields
  WHERE user_id = p_user_id;

  IF v_fields_count >= 3 THEN
    v_reliability_score := v_reliability_score + 5;
  ELSIF v_fields_count >= 1 THEN
    v_reliability_score := v_reliability_score + 2;
  END IF;

  -- Photo uploads bonus (from pest reports, crop photos, etc.)
  SELECT COUNT(*)
  INTO v_photo_uploads
  FROM pest_reports
  WHERE user_id = p_user_id
    AND image_url IS NOT NULL;

  IF v_photo_uploads >= 5 THEN
    v_reliability_score := v_reliability_score + 5;
  ELSIF v_photo_uploads >= 2 THEN
    v_reliability_score := v_reliability_score + 2;
  END IF;

  -- No flagged data bonus (always granted for now)
  v_reliability_score := v_reliability_score + 5;

  v_reliability_score := LEAST(25, v_reliability_score);

  -- ============================================
  -- CALCULATE TOTAL AND TIER
  -- ============================================
  v_total_score := v_learning_score + v_mission_score + v_engagement_score + v_reliability_score;

  -- Determine tier
  IF v_total_score >= 91 THEN
    v_tier := 'champion';
  ELSIF v_total_score >= 71 THEN
    v_tier := 'gold';
  ELSIF v_total_score >= 41 THEN
    v_tier := 'silver';
  ELSE
    v_tier := 'bronze';
  END IF;

  -- ============================================
  -- UPSERT FARMER SCORE
  -- ============================================
  INSERT INTO farmer_scores (
    user_id, learning_score, mission_score, engagement_score, reliability_score, tier, last_calculated_at, updated_at
  )
  VALUES (
    p_user_id, v_learning_score, v_mission_score, v_engagement_score, v_reliability_score, v_tier, now(), now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    learning_score = EXCLUDED.learning_score,
    mission_score = EXCLUDED.mission_score,
    engagement_score = EXCLUDED.engagement_score,
    reliability_score = EXCLUDED.reliability_score,
    tier = EXCLUDED.tier,
    last_calculated_at = now(),
    updated_at = now();

  -- Return the calculated score
  RETURN json_build_object(
    'userId', p_user_id,
    'learningScore', v_learning_score,
    'missionScore', v_mission_score,
    'engagementScore', v_engagement_score,
    'reliabilityScore', v_reliability_score,
    'totalScore', v_total_score,
    'tier', v_tier,
    'breakdown', json_build_object(
      'articlesCompleted', v_articles_completed,
      'videosCompleted', v_videos_completed,
      'cropPlansCompleted', v_crop_plans_count,
      'currentStreak', v_current_streak,
      'recentActivities', v_total_logins,
      'fieldsCount', v_fields_count,
      'photoUploads', v_photo_uploads,
      'profileComplete', v_profile_complete
    )
  );
END;
$$;

-- ============================================
-- 3. FUNCTION: Get Farmer Score
-- ============================================
CREATE OR REPLACE FUNCTION get_farmer_score(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_score RECORD;
  v_needs_recalc BOOLEAN := false;
BEGIN
  -- Get existing score
  SELECT * INTO v_score
  FROM farmer_scores
  WHERE user_id = p_user_id;

  -- Check if we need to recalculate (if > 1 hour old or doesn't exist)
  IF v_score IS NULL THEN
    v_needs_recalc := true;
  ELSIF v_score.last_calculated_at < now() - interval '1 hour' THEN
    v_needs_recalc := true;
  END IF;

  -- Recalculate if needed
  IF v_needs_recalc THEN
    RETURN calculate_farmer_score(p_user_id);
  END IF;

  -- Return existing score
  RETURN json_build_object(
    'userId', v_score.user_id,
    'learningScore', v_score.learning_score,
    'missionScore', v_score.mission_score,
    'engagementScore', v_score.engagement_score,
    'reliabilityScore', v_score.reliability_score,
    'totalScore', v_score.total_score,
    'tier', v_score.tier,
    'lastCalculatedAt', v_score.last_calculated_at
  );
END;
$$;

-- ============================================
-- 4. FUNCTION: Get Farmer Score Leaderboard
-- ============================================
CREATE OR REPLACE FUNCTION get_farmer_score_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  full_name TEXT,
  total_score INTEGER,
  tier TEXT,
  learning_score INTEGER,
  mission_score INTEGER,
  engagement_score INTEGER,
  reliability_score INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY fs.total_score DESC) as rank,
    fs.user_id,
    COALESCE(up.full_name, 'Farmer') as full_name,
    fs.total_score,
    fs.tier,
    fs.learning_score,
    fs.mission_score,
    fs.engagement_score,
    fs.reliability_score
  FROM farmer_scores fs
  LEFT JOIN user_profiles up ON up.id = fs.user_id
  ORDER BY fs.total_score DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- 5. TRIGGER: Auto-recalculate on key events
-- ============================================
CREATE OR REPLACE FUNCTION trigger_recalculate_farmer_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Mark the score as needing recalculation by setting last_calculated_at to old time
  UPDATE farmer_scores
  SET last_calculated_at = now() - interval '2 hours'
  WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on learning_progress changes
DROP TRIGGER IF EXISTS recalc_farmer_score_on_learning ON learning_progress;
CREATE TRIGGER recalc_farmer_score_on_learning
  AFTER INSERT OR UPDATE ON learning_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_farmer_score();

-- Trigger on crop_plans changes
DROP TRIGGER IF EXISTS recalc_farmer_score_on_crop_plans ON crop_plans;
CREATE TRIGGER recalc_farmer_score_on_crop_plans
  AFTER INSERT OR UPDATE ON crop_plans
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_farmer_score();

-- Trigger on fields changes
DROP TRIGGER IF EXISTS recalc_farmer_score_on_fields ON fields;
CREATE TRIGGER recalc_farmer_score_on_fields
  AFTER INSERT OR UPDATE OR DELETE ON fields
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_farmer_score();

-- ============================================
-- 6. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON farmer_scores TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_farmer_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farmer_score(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_farmer_score_leaderboard(INTEGER) TO authenticated;
