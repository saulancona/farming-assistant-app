-- =====================================================
-- Migration 034: Fix Farmer Score to Include User Missions
-- =====================================================
-- The calculate_farmer_score function was only counting crop_plans
-- but not user_missions (Story Quests). This migration fixes that.
-- =====================================================

-- ============================================
-- UPDATE: Calculate Farmer Score Function
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
  v_crop_plans_completed INTEGER := 0;
  v_missions_completed INTEGER := 0;
  v_total_missions_completed INTEGER := 0;
  v_current_streak INTEGER := 0;
  v_total_logins INTEGER := 0;
  v_fields_count INTEGER := 0;
  v_photo_uploads INTEGER := 0;
  v_profile_complete BOOLEAN := false;
BEGIN
  -- ============================================
  -- LEARNING SCORE (0-25)
  -- Based on articles and videos completed
  -- Formula: (articles + videos*1.5) / 50 * 25, capped at 25
  -- Also count article_progress for knowledge articles
  -- ============================================
  SELECT
    COALESCE(SUM(CASE WHEN lp.content_type = 'article' AND lp.completed THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN lp.content_type = 'video' AND lp.completed THEN 1 ELSE 0 END), 0)
  INTO v_articles_completed, v_videos_completed
  FROM learning_progress lp
  WHERE lp.user_id = p_user_id;

  -- Also count completed articles from article_progress table
  SELECT v_articles_completed + COALESCE(COUNT(*), 0)
  INTO v_articles_completed
  FROM article_progress ap
  WHERE ap.user_id = p_user_id AND ap.completed = true;

  v_learning_score := LEAST(25, FLOOR((v_articles_completed + v_videos_completed * 1.5) / 50 * 25));

  -- Minimum learning score of 2 if any content completed
  IF v_articles_completed > 0 OR v_videos_completed > 0 THEN
    v_learning_score := GREATEST(v_learning_score, 2);
  END IF;

  -- ============================================
  -- MISSION SCORE (0-25)
  -- Based on completed missions (crop_plans AND user_missions)
  -- Formula: total_completed / 10 * 25, capped at 25
  -- ============================================

  -- Count completed crop_plans
  SELECT COUNT(*)
  INTO v_crop_plans_completed
  FROM crop_plans
  WHERE user_id = p_user_id
    AND status = 'completed';

  -- Count completed user_missions (Story Quests)
  SELECT COUNT(*)
  INTO v_missions_completed
  FROM user_missions
  WHERE user_id = p_user_id
    AND status = 'completed';

  -- Total missions = crop_plans + user_missions
  v_total_missions_completed := v_crop_plans_completed + v_missions_completed;

  v_mission_score := LEAST(25, FLOOR(v_total_missions_completed::NUMERIC / 10 * 25));

  -- Minimum mission score based on completed missions
  -- 1 mission = 3 points, 2 missions = 5 points, etc.
  IF v_total_missions_completed >= 1 THEN
    v_mission_score := GREATEST(v_mission_score, LEAST(25, v_total_missions_completed * 3));
  END IF;

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

  -- Minimum engagement score of 2 if user has any XP transactions
  IF v_total_logins > 0 THEN
    v_engagement_score := GREATEST(v_engagement_score, 2);
  END IF;

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
    v_reliability_score := 5; -- Partial credit for having account
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

  -- Photo uploads bonus (from pest reports, milestone evidence, etc.)
  SELECT COUNT(*)
  INTO v_photo_uploads
  FROM pest_reports
  WHERE user_id = p_user_id
    AND image_url IS NOT NULL;

  -- Also count mission step photos
  SELECT v_photo_uploads + COALESCE(COUNT(*), 0)
  INTO v_photo_uploads
  FROM mission_step_progress msp
  JOIN user_missions um ON um.id = msp.user_mission_id
  WHERE um.user_id = p_user_id
    AND msp.evidence_photo_url IS NOT NULL;

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
      'cropPlansCompleted', v_crop_plans_completed,
      'missionsCompleted', v_missions_completed,
      'totalMissionsCompleted', v_total_missions_completed,
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
-- Add trigger for user_missions changes
-- ============================================
DROP TRIGGER IF EXISTS recalc_farmer_score_on_user_missions ON user_missions;
CREATE TRIGGER recalc_farmer_score_on_user_missions
  AFTER INSERT OR UPDATE ON user_missions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_farmer_score();

-- ============================================
-- Add trigger for article_progress changes
-- ============================================
DROP TRIGGER IF EXISTS recalc_farmer_score_on_article_progress ON article_progress;
CREATE TRIGGER recalc_farmer_score_on_article_progress
  AFTER INSERT OR UPDATE ON article_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_farmer_score();

-- ============================================
-- Recalculate all existing farmer scores
-- ============================================
-- This will update scores for all users with existing scores
UPDATE farmer_scores
SET last_calculated_at = now() - interval '2 hours'
WHERE true;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_farmer_score(UUID) TO authenticated;
