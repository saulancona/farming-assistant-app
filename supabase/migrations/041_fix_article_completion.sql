-- =====================================================
-- Fix Article Completion Errors
-- Migration 041: Ensure article completion works correctly
-- =====================================================

-- Step 1: Update award_xp function to be more robust and handle errors gracefully
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_action TEXT,
    p_action_sw TEXT,
    p_xp_amount INTEGER,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS TABLE(new_total_xp INTEGER, new_level INTEGER, level_up BOOLEAN) AS $$
DECLARE
    v_old_level INTEGER;
    v_new_level INTEGER;
    v_new_total_xp INTEGER;
BEGIN
    -- Ensure user has a rewards profile
    INSERT INTO user_rewards_profiles (user_id, total_xp, current_level)
    VALUES (p_user_id, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get current level
    SELECT current_level INTO v_old_level
    FROM user_rewards_profiles
    WHERE user_id = p_user_id;

    -- Default to level 1 if no profile found
    v_old_level := COALESCE(v_old_level, 1);

    -- Update XP
    UPDATE user_rewards_profiles
    SET total_xp = total_xp + p_xp_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Default to provided amount if update returned null
    v_new_total_xp := COALESCE(v_new_total_xp, p_xp_amount);

    -- Calculate new level
    v_new_level := get_level_from_xp(v_new_total_xp);
    v_new_level := COALESCE(v_new_level, 1);

    -- Update level if changed
    IF v_new_level > v_old_level THEN
        UPDATE user_rewards_profiles
        SET current_level = v_new_level
        WHERE user_id = p_user_id;
    END IF;

    -- Log the XP transaction
    INSERT INTO xp_logs (user_id, action, action_sw, xp_amount, metadata)
    VALUES (p_user_id, p_action, p_action_sw, p_xp_amount, p_metadata);

    RETURN QUERY SELECT v_new_total_xp, v_new_level, (v_new_level > v_old_level);
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail - return defaults
        RAISE WARNING 'award_xp error: %', SQLERRM;
        RETURN QUERY SELECT p_xp_amount, 1, FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Update increment_stat_and_check_achievements to handle errors gracefully
CREATE OR REPLACE FUNCTION increment_stat_and_check_achievements(
    p_user_id UUID,
    p_stat_field TEXT,
    p_increment INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
    v_new_value INTEGER;
    v_achievement RECORD;
BEGIN
    -- Ensure user has a rewards profile first
    INSERT INTO user_rewards_profiles (user_id, total_xp, current_level)
    VALUES (p_user_id, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;

    -- Update the stat dynamically
    EXECUTE format(
        'UPDATE user_rewards_profiles SET %I = COALESCE(%I, 0) + $1, updated_at = NOW() WHERE user_id = $2 RETURNING %I',
        p_stat_field, p_stat_field, p_stat_field
    ) INTO v_new_value USING p_increment, p_user_id;

    -- Default to increment if null
    v_new_value := COALESCE(v_new_value, p_increment);

    -- Check achievements related to this stat
    FOR v_achievement IN
        SELECT * FROM achievements
        WHERE requirement_field = p_stat_field
        AND requirement_type = 'count'
    LOOP
        -- Update or insert achievement progress
        INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
        VALUES (
            p_user_id,
            v_achievement.id,
            v_new_value,
            v_new_value >= v_achievement.requirement_value,
            CASE WHEN v_new_value >= v_achievement.requirement_value THEN NOW() ELSE NULL END
        )
        ON CONFLICT (user_id, achievement_id) DO UPDATE
        SET progress = v_new_value,
            completed = v_new_value >= v_achievement.requirement_value,
            completed_at = CASE
                WHEN NOT user_achievements.completed AND v_new_value >= v_achievement.requirement_value
                THEN NOW()
                ELSE user_achievements.completed_at
            END,
            updated_at = NOW();

        -- Award XP if achievement just completed
        IF v_new_value >= v_achievement.requirement_value THEN
            -- Check if this is a new completion
            PERFORM 1 FROM user_achievements
            WHERE user_id = p_user_id
            AND achievement_id = v_achievement.id
            AND completed_at = NOW();

            IF FOUND THEN
                PERFORM award_xp(
                    p_user_id,
                    'Achievement: ' || v_achievement.name,
                    'Mafanikio: ' || v_achievement.name_sw,
                    v_achievement.xp_reward,
                    jsonb_build_object('achievement_id', v_achievement.id)
                );
            END IF;
        END IF;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail
        RAISE WARNING 'increment_stat_and_check_achievements error: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Make sure update_challenge_progress handles missing function gracefully
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_user_id UUID,
  p_action TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_challenge RECORD;
  v_progress RECORD;
  v_completed_count INTEGER := 0;
  v_already_counted_today BOOLEAN;
  v_unique_days INTEGER;
  v_current_week TEXT;
BEGIN
  -- Check if weekly_challenges table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weekly_challenges') THEN
    RETURN jsonb_build_object('success', true, 'challenges_completed', 0, 'message', 'challenges not enabled');
  END IF;

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
    -- Check if this is a day-based challenge
    IF p_action IN ('check_prices', 'daily_login', 'daily_visit') THEN
      -- Check if user already recorded this action today
      SELECT EXISTS(
        SELECT 1 FROM challenge_daily_actions
        WHERE user_id = p_user_id
        AND challenge_id = v_challenge.id
        AND action_date = CURRENT_DATE
        AND (week_year = v_current_week OR week_year IS NULL)
      ) INTO v_already_counted_today;

      IF v_already_counted_today THEN
        CONTINUE;
      END IF;

      -- Record today's action
      INSERT INTO challenge_daily_actions (user_id, challenge_id, action_date, action_type, week_year)
      VALUES (p_user_id, v_challenge.id, CURRENT_DATE, p_action, v_current_week)
      ON CONFLICT (user_id, challenge_id, action_date) DO UPDATE SET week_year = v_current_week;

      -- Count unique days for this week
      SELECT COUNT(DISTINCT action_date) INTO v_unique_days
      FROM challenge_daily_actions
      WHERE user_id = p_user_id
      AND challenge_id = v_challenge.id
      AND week_year = v_current_week;

      -- Get or create progress
      INSERT INTO user_challenge_progress (user_id, challenge_id, target_progress, status, current_progress, week_year)
      VALUES (p_user_id, v_challenge.id, v_challenge.target_count, 'active', 0, v_current_week)
      ON CONFLICT (user_id, challenge_id, week_year) DO NOTHING;

      -- Update progress
      UPDATE user_challenge_progress SET
        current_progress = LEAST(v_unique_days, target_progress)
      WHERE user_id = p_user_id
      AND challenge_id = v_challenge.id
      AND week_year = v_current_week
      AND status = 'active'
      RETURNING * INTO v_progress;

    ELSE
      -- Non-day-based challenges
      INSERT INTO user_challenge_progress (user_id, challenge_id, target_progress, status, week_year)
      VALUES (p_user_id, v_challenge.id, v_challenge.target_count, 'active', v_current_week)
      ON CONFLICT (user_id, challenge_id, week_year) DO NOTHING;

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

      -- Award rewards with proper JSONB
      PERFORM award_xp(p_user_id, 'challenge_complete', 'Changamoto imekamilika: ' || v_challenge.name, v_challenge.xp_reward, '{}'::jsonb);

      -- Only call award_points if function exists
      IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'award_points') THEN
        PERFORM award_points(p_user_id, v_challenge.points_reward, 'challenge', v_challenge.id, 'Challenge completion reward');
      END IF;

      v_completed_count := v_completed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'challenges_completed', v_completed_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'update_challenge_progress error: %', SQLERRM;
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Ensure the article_progress table has the right policies (recreate if needed)
-- Drop and recreate policies to ensure they're correct
DROP POLICY IF EXISTS "article_progress_select" ON article_progress;
DROP POLICY IF EXISTS "article_progress_insert" ON article_progress;
DROP POLICY IF EXISTS "article_progress_update" ON article_progress;
DROP POLICY IF EXISTS "article_progress_delete" ON article_progress;

-- Create comprehensive policies
CREATE POLICY "article_progress_select" ON article_progress
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "article_progress_insert" ON article_progress
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "article_progress_update" ON article_progress
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "article_progress_delete" ON article_progress
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Step 5: Create a simple, robust function for marking articles complete
CREATE OR REPLACE FUNCTION mark_article_complete(
    p_user_id UUID,
    p_article_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_result RECORD;
BEGIN
    -- Insert or update article progress
    INSERT INTO article_progress (
        user_id,
        article_id,
        reading_time_seconds,
        scroll_percentage,
        completed,
        completed_at,
        last_read_at,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_article_id,
        0,
        100,
        TRUE,
        NOW(),
        NOW(),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, article_id)
    DO UPDATE SET
        scroll_percentage = 100,
        completed = TRUE,
        completed_at = COALESCE(article_progress.completed_at, NOW()),
        last_read_at = NOW(),
        updated_at = NOW()
    RETURNING * INTO v_result;

    -- Try to award XP (don't fail if this fails)
    BEGIN
        PERFORM award_xp(
            p_user_id,
            'Article Completed',
            'Makala Imekamilika',
            20,
            jsonb_build_object('article_id', p_article_id)
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to award XP: %', SQLERRM;
    END;

    -- Try to increment stat (don't fail if this fails)
    BEGIN
        PERFORM increment_stat_and_check_achievements(
            p_user_id,
            'articles_completed',
            1
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to increment stat: %', SQLERRM;
    END;

    -- Try to update challenge progress (don't fail if this fails)
    BEGIN
        PERFORM update_challenge_progress(
            p_user_id,
            'complete_lesson',
            1
        );
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Failed to update challenge progress: %', SQLERRM;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'article_progress', row_to_json(v_result)
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION mark_article_complete(UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION mark_article_complete IS 'Marks an article as complete for a user, awards XP, and updates achievements';
