-- Fix tasks trigger to use 'status' column instead of 'completed' boolean
-- The tasks table uses status = 'completed' instead of completed = true

-- Drop and recreate the trigger function to check status instead of completed
CREATE OR REPLACE FUNCTION trigger_sync_tasks_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only sync if completed status changed or task deleted
    -- Use status column instead of completed boolean
    IF TG_OP = 'DELETE' OR
       (TG_OP = 'INSERT' AND NEW.status = 'completed') OR
       (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND
        (NEW.status = 'completed' OR OLD.status = 'completed')) THEN
        PERFORM sync_user_rewards_stats(COALESCE(NEW.user_id, OLD.user_id));
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Also fix the sync_user_rewards_stats function to count by status
CREATE OR REPLACE FUNCTION sync_user_rewards_stats(p_user_id UUID)
RETURNS void
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
    FROM fields WHERE user_id = p_user_id;

    -- Count completed tasks - use status column
    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks
    WHERE user_id = p_user_id AND status = 'completed';

    -- Count community posts
    SELECT COUNT(*) INTO v_posts_count
    FROM community_posts WHERE user_id = p_user_id;

    -- Count marketplace listings
    SELECT COUNT(*) INTO v_listings_count
    FROM marketplace_listings WHERE seller_id = p_user_id;

    -- Update rewards_profiles
    INSERT INTO rewards_profiles (
        user_id,
        fields_count,
        tasks_completed,
        posts_count,
        listings_count,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        v_fields_count,
        v_tasks_completed,
        v_posts_count,
        v_listings_count,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        fields_count = v_fields_count,
        tasks_completed = v_tasks_completed,
        posts_count = v_posts_count,
        listings_count = v_listings_count,
        updated_at = NOW();
END;
$$;

-- Also fix the get_achievement_progress function if it exists
CREATE OR REPLACE FUNCTION get_achievement_progress(p_user_id UUID)
RETURNS TABLE (
    achievement_id TEXT,
    current_value INTEGER,
    target_value INTEGER,
    progress_percent NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_fields_count INTEGER;
    v_tasks_completed INTEGER;
    v_lessons_completed INTEGER;
    v_posts_count INTEGER;
    v_missions_completed INTEGER;
BEGIN
    -- Count fields
    SELECT COUNT(*) INTO v_fields_count
    FROM fields WHERE user_id = p_user_id;

    -- Count completed tasks - use status column
    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks WHERE user_id = p_user_id AND status = 'completed';

    -- Count lessons completed
    SELECT COUNT(*) INTO v_lessons_completed
    FROM user_lesson_progress
    WHERE user_id = p_user_id AND completed = true;

    -- Count community posts
    SELECT COUNT(*) INTO v_posts_count
    FROM community_posts WHERE user_id = p_user_id;

    -- Count missions completed
    SELECT COUNT(*) INTO v_missions_completed
    FROM user_mission_progress
    WHERE user_id = p_user_id AND status = 'completed';

    RETURN QUERY
    SELECT
        a.id AS achievement_id,
        CASE a.progress_type
            WHEN 'fields_count' THEN v_fields_count
            WHEN 'tasks_completed' THEN v_tasks_completed
            WHEN 'lessons_completed' THEN v_lessons_completed
            WHEN 'posts_count' THEN v_posts_count
            WHEN 'missions_completed' THEN v_missions_completed
            ELSE 0
        END AS current_value,
        a.target_value::INTEGER,
        LEAST(
            CASE a.progress_type
                WHEN 'fields_count' THEN v_fields_count
                WHEN 'tasks_completed' THEN v_tasks_completed
                WHEN 'lessons_completed' THEN v_lessons_completed
                WHEN 'posts_count' THEN v_posts_count
                WHEN 'missions_completed' THEN v_missions_completed
                ELSE 0
            END::NUMERIC / NULLIF(a.target_value, 0) * 100,
            100
        ) AS progress_percent
    FROM achievements a
    WHERE a.target_value IS NOT NULL;
END;
$$;
