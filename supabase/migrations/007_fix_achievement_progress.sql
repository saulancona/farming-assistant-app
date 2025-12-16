-- ============================================
-- FIX ACHIEVEMENT PROGRESS SYNC
-- This migration updates the achievement checking
-- to use actual table counts instead of cached values
-- ============================================

-- Drop and recreate the check_and_award_achievements function
-- to use real-time counts from actual tables
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_achievement RECORD;
    v_current_value INTEGER;
    v_fields_count INTEGER;
    v_tasks_completed INTEGER;
    v_posts_count INTEGER;
    v_listings_count INTEGER;
    v_articles_completed INTEGER;
    v_videos_completed INTEGER;
    v_current_streak INTEGER;
BEGIN
    -- Get REAL counts from actual tables (not cached values)
    SELECT COUNT(*) INTO v_fields_count
    FROM fields WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks WHERE user_id = p_user_id AND completed = true;

    SELECT COUNT(*) INTO v_posts_count
    FROM community_posts WHERE user_id = p_user_id;

    SELECT COUNT(*) INTO v_listings_count
    FROM marketplace_listings WHERE user_id = p_user_id;

    -- Get learning stats from user_rewards_profiles (these are tracked via triggers)
    SELECT
        COALESCE(articles_completed, 0),
        COALESCE(videos_completed, 0),
        COALESCE(current_streak, 0)
    INTO v_articles_completed, v_videos_completed, v_current_streak
    FROM user_rewards_profiles
    WHERE user_id = p_user_id;

    -- Default values if no profile exists
    v_articles_completed := COALESCE(v_articles_completed, 0);
    v_videos_completed := COALESCE(v_videos_completed, 0);
    v_current_streak := COALESCE(v_current_streak, 0);

    -- Loop through all count-based achievements
    FOR v_achievement IN
        SELECT * FROM achievements
        WHERE requirement_type = 'count'
    LOOP
        -- Get the current value based on requirement field (using real counts)
        v_current_value := CASE v_achievement.requirement_field
            WHEN 'fields_count' THEN v_fields_count
            WHEN 'tasks_completed' THEN v_tasks_completed
            WHEN 'posts_count' THEN v_posts_count
            WHEN 'listings_count' THEN v_listings_count
            WHEN 'articles_completed' THEN v_articles_completed
            WHEN 'videos_completed' THEN v_videos_completed
            WHEN 'current_streak' THEN v_current_streak
            ELSE 0
        END;

        -- Insert or update user achievement progress
        INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
        VALUES (
            p_user_id,
            v_achievement.id,
            v_current_value,
            v_current_value >= v_achievement.requirement_value,
            CASE WHEN v_current_value >= v_achievement.requirement_value THEN NOW() ELSE NULL END
        )
        ON CONFLICT (user_id, achievement_id) DO UPDATE SET
            progress = v_current_value,
            completed = v_current_value >= v_achievement.requirement_value,
            completed_at = CASE
                WHEN user_achievements.completed = false AND v_current_value >= v_achievement.requirement_value
                THEN NOW()
                ELSE user_achievements.completed_at
            END;

        -- Award XP if achievement just completed (and XP not already awarded)
        IF v_current_value >= v_achievement.requirement_value THEN
            IF NOT EXISTS (
                SELECT 1 FROM xp_logs
                WHERE user_id = p_user_id
                AND action = 'achievement_' || v_achievement.id
            ) THEN
                -- Award XP
                UPDATE user_rewards_profiles
                SET total_xp = total_xp + v_achievement.xp_reward,
                    updated_at = NOW()
                WHERE user_id = p_user_id;

                -- Log XP
                INSERT INTO xp_logs (user_id, action, action_sw, xp_amount, metadata)
                VALUES (
                    p_user_id,
                    'achievement_' || v_achievement.id,
                    'Tuzo: ' || v_achievement.name_sw,
                    v_achievement.xp_reward,
                    jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Also update sync_user_rewards_stats to use real counts properly
CREATE OR REPLACE FUNCTION sync_user_rewards_stats(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fields_count INTEGER;
    v_tasks_completed INTEGER;
    v_posts_count INTEGER;
    v_listings_count INTEGER;
BEGIN
    -- Count fields (REAL count)
    SELECT COUNT(*) INTO v_fields_count
    FROM fields
    WHERE user_id = p_user_id;

    -- Count completed tasks (REAL count)
    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks
    WHERE user_id = p_user_id AND completed = true;

    -- Count community posts (REAL count)
    SELECT COUNT(*) INTO v_posts_count
    FROM community_posts
    WHERE user_id = p_user_id;

    -- Count marketplace listings (REAL count)
    SELECT COUNT(*) INTO v_listings_count
    FROM marketplace_listings
    WHERE user_id = p_user_id;

    -- Update or insert rewards profile with REAL counts
    INSERT INTO user_rewards_profiles (
        user_id,
        fields_count,
        tasks_completed,
        posts_count,
        listings_count,
        updated_at
    )
    VALUES (
        p_user_id,
        v_fields_count,
        v_tasks_completed,
        v_posts_count,
        v_listings_count,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        fields_count = v_fields_count,
        tasks_completed = v_tasks_completed,
        posts_count = v_posts_count,
        listings_count = v_listings_count,
        updated_at = NOW();

    -- Check and award achievements with the REAL counts
    PERFORM check_and_award_achievements(p_user_id);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION sync_user_rewards_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_achievements(UUID) TO authenticated;

-- Run sync for all existing users to fix their achievement progress
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    FOR v_user_id IN SELECT DISTINCT id FROM auth.users
    LOOP
        PERFORM sync_user_rewards_stats(v_user_id);
    END LOOP;
END;
$$;
