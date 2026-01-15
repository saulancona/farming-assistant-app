-- Fix the calculate_farmer_score function that uses wrong column name
-- The marketplace_listings table uses 'user_id', not 'seller_id'

-- Recreate the calculate_farmer_score function with correct column name
CREATE OR REPLACE FUNCTION calculate_farmer_score(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_fields_count INTEGER := 0;
    v_tasks_completed INTEGER := 0;
    v_posts_count INTEGER := 0;
    v_listings_count INTEGER := 0;
    v_score INTEGER := 0;
BEGIN
    -- Count fields
    SELECT COUNT(*) INTO v_fields_count
    FROM fields WHERE user_id = p_user_id;

    -- Count completed tasks
    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks WHERE user_id = p_user_id AND status = 'completed';

    -- Count community posts
    SELECT COUNT(*) INTO v_posts_count
    FROM community_posts WHERE user_id = p_user_id;

    -- Count marketplace listings (use user_id, not seller_id)
    SELECT COUNT(*) INTO v_listings_count
    FROM marketplace_listings WHERE user_id = p_user_id;

    -- Calculate score (simple formula: 10 points per field, 5 per task, 3 per post, 8 per listing)
    v_score := (v_fields_count * 10) + (v_tasks_completed * 5) + (v_posts_count * 3) + (v_listings_count * 8);

    -- Update or insert into rewards_profiles if it exists
    BEGIN
        UPDATE user_rewards_profiles SET
            fields_count = v_fields_count,
            tasks_completed = v_tasks_completed,
            posts_count = v_posts_count,
            listings_count = v_listings_count,
            updated_at = NOW()
        WHERE user_id = p_user_id;

        IF NOT FOUND THEN
            INSERT INTO user_rewards_profiles (
                user_id,
                fields_count,
                tasks_completed,
                posts_count,
                listings_count,
                updated_at
            ) VALUES (
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
        END IF;
    EXCEPTION
        WHEN undefined_table THEN
            -- Table doesn't exist, try rewards_profiles instead
            UPDATE rewards_profiles SET
                fields_count = v_fields_count,
                tasks_completed = v_tasks_completed,
                posts_count = v_posts_count,
                listings_count = v_listings_count,
                updated_at = NOW()
            WHERE user_id = p_user_id;

            IF NOT FOUND THEN
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
            END IF;
        WHEN OTHERS THEN
            -- Ignore other errors and just return the score
            NULL;
    END;

    RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the trigger function for task completion if it references seller_id
CREATE OR REPLACE FUNCTION trigger_task_completed()
RETURNS TRIGGER AS $$
BEGIN
    -- Only trigger on status change to 'completed'
    IF TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed' THEN
        PERFORM calculate_farmer_score(NEW.user_id);
    ELSIF TG_OP = 'INSERT' AND NEW.status = 'completed' THEN
        PERFORM calculate_farmer_score(NEW.user_id);
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the task update if score calculation fails
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_task_status_change ON tasks;
CREATE TRIGGER trigger_task_status_change
    AFTER INSERT OR UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION trigger_task_completed();
