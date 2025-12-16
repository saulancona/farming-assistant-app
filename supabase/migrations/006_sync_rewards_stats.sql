-- ============================================
-- SYNC REWARDS STATS MIGRATION
-- This migration adds functions and triggers to sync
-- user activity stats with the rewards profile
-- ============================================

-- Function to sync all user stats to rewards profile
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
    -- Count fields
    SELECT COUNT(*) INTO v_fields_count
    FROM fields
    WHERE user_id = p_user_id;

    -- Count completed tasks
    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks
    WHERE user_id = p_user_id AND completed = true;

    -- Count community posts
    SELECT COUNT(*) INTO v_posts_count
    FROM community_posts
    WHERE user_id = p_user_id;

    -- Count marketplace listings
    SELECT COUNT(*) INTO v_listings_count
    FROM marketplace_listings
    WHERE user_id = p_user_id;

    -- Update or insert rewards profile
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

    -- Also check and update achievements
    PERFORM check_and_award_achievements(p_user_id);
END;
$$;

-- Function to check and award achievements based on current stats
CREATE OR REPLACE FUNCTION check_and_award_achievements(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_achievement RECORD;
    v_current_value INTEGER;
    v_profile RECORD;
BEGIN
    -- Get user's current stats
    SELECT * INTO v_profile
    FROM user_rewards_profiles
    WHERE user_id = p_user_id;

    IF v_profile IS NULL THEN
        RETURN;
    END IF;

    -- Loop through all achievements
    FOR v_achievement IN
        SELECT * FROM achievements
        WHERE requirement_type = 'count'
    LOOP
        -- Get the current value based on requirement field
        v_current_value := CASE v_achievement.requirement_field
            WHEN 'fields_count' THEN v_profile.fields_count
            WHEN 'tasks_completed' THEN v_profile.tasks_completed
            WHEN 'posts_count' THEN v_profile.posts_count
            WHEN 'listings_count' THEN v_profile.listings_count
            WHEN 'articles_completed' THEN v_profile.articles_completed
            WHEN 'videos_completed' THEN v_profile.videos_completed
            WHEN 'current_streak' THEN v_profile.current_streak
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

        -- Award XP if achievement just completed
        IF v_current_value >= v_achievement.requirement_value THEN
            -- Check if XP was already awarded for this achievement
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
                    'Achievement: ' || v_achievement.name,
                    v_achievement.xp_reward,
                    jsonb_build_object('achievement_id', v_achievement.id, 'achievement_name', v_achievement.name)
                );
            END IF;
        END IF;
    END LOOP;
END;
$$;

-- Trigger function for fields
CREATE OR REPLACE FUNCTION trigger_sync_fields_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        PERFORM sync_user_rewards_stats(COALESCE(NEW.user_id, OLD.user_id));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for tasks (completed)
CREATE OR REPLACE FUNCTION trigger_sync_tasks_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only sync if completed status changed or task deleted
    IF TG_OP = 'DELETE' OR
       (TG_OP = 'INSERT' AND NEW.completed = true) OR
       (TG_OP = 'UPDATE' AND OLD.completed IS DISTINCT FROM NEW.completed) THEN
        PERFORM sync_user_rewards_stats(COALESCE(NEW.user_id, OLD.user_id));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for posts
CREATE OR REPLACE FUNCTION trigger_sync_posts_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        PERFORM sync_user_rewards_stats(COALESCE(NEW.user_id, OLD.user_id));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger function for listings
CREATE OR REPLACE FUNCTION trigger_sync_listings_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'DELETE' THEN
        PERFORM sync_user_rewards_stats(COALESCE(NEW.user_id, OLD.user_id));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_fields_sync ON fields;
DROP TRIGGER IF EXISTS trigger_tasks_sync ON tasks;
DROP TRIGGER IF EXISTS trigger_posts_sync ON community_posts;
DROP TRIGGER IF EXISTS trigger_listings_sync ON marketplace_listings;

-- Create triggers
CREATE TRIGGER trigger_fields_sync
    AFTER INSERT OR DELETE ON fields
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_fields_count();

CREATE TRIGGER trigger_tasks_sync
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_tasks_completed();

CREATE TRIGGER trigger_posts_sync
    AFTER INSERT OR DELETE ON community_posts
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_posts_count();

CREATE TRIGGER trigger_listings_sync
    AFTER INSERT OR DELETE ON marketplace_listings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_listings_count();

-- Function to sync stats for all users (for initial sync)
CREATE OR REPLACE FUNCTION sync_all_users_rewards_stats()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
BEGIN
    FOR v_user_id IN SELECT DISTINCT id FROM auth.users
    LOOP
        PERFORM sync_user_rewards_stats(v_user_id);
    END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION sync_user_rewards_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_and_award_achievements(UUID) TO authenticated;

-- Also update the farmer score calculation to pull from actual data
CREATE OR REPLACE FUNCTION calculate_farmer_score(p_user_id UUID)
RETURNS TABLE (
    success BOOLEAN,
    total_score NUMERIC,
    tier TEXT,
    learning_score NUMERIC,
    mission_score NUMERIC,
    engagement_score NUMERIC,
    reliability_score NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_learning_score NUMERIC := 0;
    v_mission_score NUMERIC := 0;
    v_engagement_score NUMERIC := 0;
    v_reliability_score NUMERIC := 0;
    v_total_score NUMERIC := 0;
    v_tier TEXT := 'bronze';
    v_articles INTEGER := 0;
    v_videos INTEGER := 0;
    v_missions_completed INTEGER := 0;
    v_current_streak INTEGER := 0;
    v_daily_actions INTEGER := 0;
    v_photo_uploads INTEGER := 0;
    v_fields_count INTEGER := 0;
    v_data_quality NUMERIC := 0;
BEGIN
    -- Get learning stats
    SELECT COALESCE(articles_completed, 0), COALESCE(videos_completed, 0), COALESCE(current_streak, 0)
    INTO v_articles, v_videos, v_current_streak
    FROM user_rewards_profiles
    WHERE user_id = p_user_id;

    -- Get fields count (actual data)
    SELECT COUNT(*) INTO v_fields_count
    FROM fields
    WHERE user_id = p_user_id;

    -- Get completed missions count
    SELECT COUNT(*) INTO v_missions_completed
    FROM user_missions
    WHERE user_id = p_user_id AND status = 'completed';

    -- Get photo uploads count
    SELECT COUNT(*) INTO v_photo_uploads
    FROM photo_submissions
    WHERE user_id = p_user_id;

    -- Get daily actions (activities in last 7 days)
    SELECT COUNT(DISTINCT DATE(created_at)) INTO v_daily_actions
    FROM xp_logs
    WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '7 days';

    -- Calculate Learning Score (0-25)
    -- Based on articles and videos completed
    v_learning_score := LEAST(25, (v_articles + v_videos * 1.5) / 2);

    -- Calculate Mission Score (0-25)
    -- Based on missions completed + fields managed
    v_mission_score := LEAST(25, (v_missions_completed * 2.5) + (v_fields_count * 0.5));

    -- Calculate Engagement Score (0-25)
    -- Based on streak and daily actions
    v_engagement_score := LEAST(25, (LEAST(v_current_streak, 30) / 30.0 * 15) + (v_daily_actions * 1.5));

    -- Calculate Reliability Score (0-25)
    -- Based on photo uploads and data quality
    v_data_quality := CASE
        WHEN v_fields_count > 0 THEN LEAST(10, v_fields_count * 2)
        ELSE 0
    END;
    v_reliability_score := LEAST(25, (v_photo_uploads * 0.5) + v_data_quality + 5);

    -- Calculate Total Score
    v_total_score := v_learning_score + v_mission_score + v_engagement_score + v_reliability_score;

    -- Determine Tier
    v_tier := CASE
        WHEN v_total_score >= 91 THEN 'champion'
        WHEN v_total_score >= 71 THEN 'gold'
        WHEN v_total_score >= 41 THEN 'silver'
        ELSE 'bronze'
    END;

    -- Update farmer_scores table
    INSERT INTO farmer_scores (
        user_id,
        learning_score,
        mission_score,
        engagement_score,
        reliability_score,
        total_score,
        tier,
        photo_uploads_count,
        data_quality_score,
        updated_at
    )
    VALUES (
        p_user_id,
        v_learning_score,
        v_mission_score,
        v_engagement_score,
        v_reliability_score,
        v_total_score,
        v_tier,
        v_photo_uploads,
        v_data_quality,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        learning_score = v_learning_score,
        mission_score = v_mission_score,
        engagement_score = v_engagement_score,
        reliability_score = v_reliability_score,
        total_score = v_total_score,
        tier = v_tier,
        photo_uploads_count = v_photo_uploads,
        data_quality_score = v_data_quality,
        updated_at = NOW();

    RETURN QUERY SELECT true, v_total_score, v_tier, v_learning_score, v_mission_score, v_engagement_score, v_reliability_score;
END;
$$;
