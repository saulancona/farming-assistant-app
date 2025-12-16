-- Learning Progress & Rewards System Migration
-- Version: 004
-- Description: Adds tables for learning progress tracking and gamification/rewards system

-- ============================================
-- LEVEL DEFINITIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS level_definitions (
    level INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    name_sw TEXT NOT NULL, -- Swahili translation
    xp_required INTEGER NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert level definitions
INSERT INTO level_definitions (level, name, name_sw, xp_required, icon, color) VALUES
    (1, 'Seedling', 'Mche', 0, '🌱', '#90EE90'),
    (2, 'Sprout', 'Chipukizi', 100, '🌿', '#7CB342'),
    (3, 'Growing', 'Inakua', 250, '🌾', '#558B2F'),
    (4, 'Flourishing', 'Inastawi', 500, '🌻', '#F9A825'),
    (5, 'Harvester', 'Mvunaji', 1000, '🌽', '#FF8F00'),
    (6, 'Expert Farmer', 'Mkulima Mtaalamu', 2000, '👨‍🌾', '#E65100'),
    (7, 'Master Grower', 'Bwana Mkulima', 3500, '🏆', '#6D4C41'),
    (8, 'Agricultural Sage', 'Mwanasayansi wa Kilimo', 5500, '📚', '#5D4037'),
    (9, 'Farming Legend', 'Hadithi ya Kilimo', 8000, '⭐', '#FFD700'),
    (10, 'AgroAfrica Champion', 'Bingwa wa AgroAfrica', 12000, '👑', '#FFD700')
ON CONFLICT (level) DO NOTHING;

-- ============================================
-- ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS achievements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    name_sw TEXT NOT NULL,
    description TEXT NOT NULL,
    description_sw TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('learning', 'farming', 'community', 'marketplace', 'streaks', 'milestones')),
    icon TEXT NOT NULL,
    xp_reward INTEGER NOT NULL DEFAULT 50,
    requirement_type TEXT NOT NULL, -- 'count', 'streak', 'xp_total'
    requirement_value INTEGER NOT NULL,
    requirement_field TEXT, -- field to check for count (e.g., 'articles_completed', 'fields_count')
    tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert achievements
INSERT INTO achievements (id, name, name_sw, description, description_sw, category, icon, xp_reward, requirement_type, requirement_value, requirement_field, tier) VALUES
    -- Learning achievements
    ('first_article', 'First Reader', 'Msomaji wa Kwanza', 'Complete your first article', 'Kamilisha makala yako ya kwanza', 'learning', '📖', 25, 'count', 1, 'articles_completed', 'bronze'),
    ('articles_10', 'Avid Reader', 'Msomaji Mzuri', 'Complete 10 articles', 'Kamilisha makala 10', 'learning', '📚', 50, 'count', 10, 'articles_completed', 'silver'),
    ('articles_50', 'Knowledge Seeker', 'Mtafutaji wa Maarifa', 'Complete 50 articles', 'Kamilisha makala 50', 'learning', '🎓', 150, 'count', 50, 'articles_completed', 'gold'),
    ('first_video', 'First Viewer', 'Mtazamaji wa Kwanza', 'Watch your first video', 'Tazama video yako ya kwanza', 'learning', '🎬', 25, 'count', 1, 'videos_completed', 'bronze'),
    ('videos_10', 'Video Enthusiast', 'Mpenda Video', 'Watch 10 videos', 'Tazama video 10', 'learning', '📺', 50, 'count', 10, 'videos_completed', 'silver'),
    ('videos_50', 'Video Master', 'Bwana Video', 'Watch 50 videos', 'Tazama video 50', 'learning', '🎥', 150, 'count', 50, 'videos_completed', 'gold'),

    -- Farming achievements
    ('first_field', 'First Plot', 'Shamba la Kwanza', 'Add your first field', 'Ongeza shamba lako la kwanza', 'farming', '🌾', 25, 'count', 1, 'fields_count', 'bronze'),
    ('fields_5', 'Growing Farm', 'Shamba Linakua', 'Manage 5 fields', 'Simamia mashamba 5', 'farming', '🏡', 75, 'count', 5, 'fields_count', 'silver'),
    ('fields_20', 'Estate Owner', 'Mmiliki wa Mashamba', 'Manage 20 fields', 'Simamia mashamba 20', 'farming', '🏰', 200, 'count', 20, 'fields_count', 'gold'),
    ('first_task', 'Task Starter', 'Mwanzishaji Kazi', 'Complete your first task', 'Kamilisha kazi yako ya kwanza', 'farming', '✅', 15, 'count', 1, 'tasks_completed', 'bronze'),
    ('tasks_10', 'Task Manager', 'Meneja Kazi', 'Complete 10 tasks', 'Kamilisha kazi 10', 'farming', '📋', 50, 'count', 10, 'tasks_completed', 'silver'),
    ('tasks_50', 'Task Expert', 'Mtaalamu wa Kazi', 'Complete 50 tasks', 'Kamilisha kazi 50', 'farming', '🏅', 150, 'count', 50, 'tasks_completed', 'gold'),
    ('tasks_200', 'Task Legend', 'Hadithi ya Kazi', 'Complete 200 tasks', 'Kamilisha kazi 200', 'farming', '👑', 500, 'count', 200, 'tasks_completed', 'platinum'),

    -- Streak achievements
    ('streak_7', 'Week Warrior', 'Shujaa wa Wiki', 'Maintain a 7-day streak', 'Dumisha mfululizo wa siku 7', 'streaks', '🔥', 50, 'streak', 7, 'current_streak', 'bronze'),
    ('streak_14', 'Fortnight Fighter', 'Mpiganaji wa Wiki 2', 'Maintain a 14-day streak', 'Dumisha mfululizo wa siku 14', 'streaks', '💪', 100, 'streak', 14, 'current_streak', 'silver'),
    ('streak_30', 'Monthly Master', 'Bwana wa Mwezi', 'Maintain a 30-day streak', 'Dumisha mfululizo wa siku 30', 'streaks', '⚡', 250, 'streak', 30, 'current_streak', 'gold'),
    ('streak_100', 'Century Champion', 'Bingwa wa Karne', 'Maintain a 100-day streak', 'Dumisha mfululizo wa siku 100', 'streaks', '🌟', 1000, 'streak', 100, 'current_streak', 'platinum'),

    -- Milestone achievements
    ('xp_500', 'Rising Star', 'Nyota Inayoibuka', 'Earn 500 XP', 'Pata XP 500', 'milestones', '⭐', 25, 'xp_total', 500, 'total_xp', 'bronze'),
    ('xp_2000', 'Shining Star', 'Nyota Inayong''aa', 'Earn 2,000 XP', 'Pata XP 2,000', 'milestones', '🌟', 100, 'xp_total', 2000, 'total_xp', 'silver'),
    ('xp_5000', 'Super Star', 'Nyota Kubwa', 'Earn 5,000 XP', 'Pata XP 5,000', 'milestones', '💫', 250, 'xp_total', 5000, 'total_xp', 'gold'),
    ('xp_10000', 'Mega Star', 'Nyota Mkubwa', 'Earn 10,000 XP', 'Pata XP 10,000', 'milestones', '✨', 500, 'xp_total', 10000, 'total_xp', 'platinum'),

    -- Community achievements
    ('first_post', 'First Voice', 'Sauti ya Kwanza', 'Create your first community post', 'Unda chapisho lako la kwanza', 'community', '💬', 25, 'count', 1, 'posts_count', 'bronze'),
    ('posts_10', 'Active Member', 'Mwanachama Hai', 'Create 10 community posts', 'Unda machapisho 10', 'community', '🗣️', 75, 'count', 10, 'posts_count', 'silver'),
    ('posts_50', 'Community Leader', 'Kiongozi wa Jamii', 'Create 50 community posts', 'Unda machapisho 50', 'community', '👥', 200, 'count', 50, 'posts_count', 'gold'),

    -- Marketplace achievements
    ('first_listing', 'First Seller', 'Muuzaji wa Kwanza', 'Create your first marketplace listing', 'Unda orodha yako ya kwanza', 'marketplace', '🏪', 30, 'count', 1, 'listings_count', 'bronze'),
    ('listings_10', 'Active Seller', 'Muuzaji Hai', 'Create 10 marketplace listings', 'Unda orodha 10', 'marketplace', '🛒', 100, 'count', 10, 'listings_count', 'silver'),
    ('listings_50', 'Market Master', 'Bwana Soko', 'Create 50 marketplace listings', 'Unda orodha 50', 'marketplace', '💰', 300, 'count', 50, 'listings_count', 'gold')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER REWARDS PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_rewards_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER NOT NULL DEFAULT 0,
    current_level INTEGER NOT NULL DEFAULT 1 REFERENCES level_definitions(level),
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_activity_date DATE,
    articles_completed INTEGER NOT NULL DEFAULT 0,
    videos_completed INTEGER NOT NULL DEFAULT 0,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    fields_count INTEGER NOT NULL DEFAULT 0,
    posts_count INTEGER NOT NULL DEFAULT 0,
    listings_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- ============================================
-- XP LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS xp_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    action_sw TEXT,
    xp_amount INTEGER NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DAILY STREAKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS daily_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_date DATE NOT NULL,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, streak_date)
);

-- ============================================
-- USER ACHIEVEMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- VIDEO PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS video_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    watch_time_seconds INTEGER NOT NULL DEFAULT 0,
    total_duration_seconds INTEGER NOT NULL,
    percentage_watched DECIMAL(5,2) NOT NULL DEFAULT 0,
    resume_position_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_watched_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, video_id)
);

-- ============================================
-- ARTICLE PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS article_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    article_id TEXT NOT NULL,
    reading_time_seconds INTEGER NOT NULL DEFAULT 0,
    scroll_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    last_read_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, article_id)
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_user_rewards_profiles_user_id ON user_rewards_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_profiles_total_xp ON user_rewards_profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_xp_logs_user_id ON xp_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_logs_created_at ON xp_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_user_id ON daily_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_date ON daily_streaks(streak_date);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_video_progress_user_id ON video_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_article_progress_user_id ON article_progress(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_rewards_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE level_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;

-- Level definitions - readable by all authenticated users
CREATE POLICY "level_definitions_select" ON level_definitions FOR SELECT TO authenticated USING (true);

-- Achievements - readable by all authenticated users
CREATE POLICY "achievements_select" ON achievements FOR SELECT TO authenticated USING (true);

-- User rewards profiles - users can only access their own data
CREATE POLICY "user_rewards_profiles_select" ON user_rewards_profiles FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "user_rewards_profiles_insert" ON user_rewards_profiles FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_rewards_profiles_update" ON user_rewards_profiles FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Allow reading other users' profiles for leaderboard (limited fields handled in app)
CREATE POLICY "user_rewards_profiles_leaderboard" ON user_rewards_profiles FOR SELECT TO authenticated
    USING (true);

-- XP logs - users can only access their own data
CREATE POLICY "xp_logs_select" ON xp_logs FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "xp_logs_insert" ON xp_logs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Daily streaks - users can only access their own data
CREATE POLICY "daily_streaks_select" ON daily_streaks FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "daily_streaks_insert" ON daily_streaks FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "daily_streaks_update" ON daily_streaks FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- User achievements - users can only access their own data
CREATE POLICY "user_achievements_select" ON user_achievements FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "user_achievements_insert" ON user_achievements FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_achievements_update" ON user_achievements FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Video progress - users can only access their own data
CREATE POLICY "video_progress_select" ON video_progress FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "video_progress_insert" ON video_progress FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "video_progress_update" ON video_progress FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Article progress - users can only access their own data
CREATE POLICY "article_progress_select" ON article_progress FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "article_progress_insert" ON article_progress FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "article_progress_update" ON article_progress FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate level from XP
CREATE OR REPLACE FUNCTION get_level_from_xp(xp_amount INTEGER)
RETURNS INTEGER AS $$
DECLARE
    result_level INTEGER;
BEGIN
    SELECT level INTO result_level
    FROM level_definitions
    WHERE xp_required <= xp_amount
    ORDER BY xp_required DESC
    LIMIT 1;

    RETURN COALESCE(result_level, 1);
END;
$$ LANGUAGE plpgsql;

-- Function to award XP
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

    -- Update XP
    UPDATE user_rewards_profiles
    SET total_xp = total_xp + p_xp_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id
    RETURNING total_xp INTO v_new_total_xp;

    -- Calculate new level
    v_new_level := get_level_from_xp(v_new_total_xp);

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update daily streak
CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS TABLE(current_streak INTEGER, streak_xp INTEGER, is_new_day BOOLEAN) AS $$
DECLARE
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_streak_xp INTEGER;
    v_today DATE := CURRENT_DATE;
    v_is_new_day BOOLEAN := FALSE;
BEGIN
    -- Ensure user has a rewards profile
    INSERT INTO user_rewards_profiles (user_id, total_xp, current_level)
    VALUES (p_user_id, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;

    -- Get last activity date and current streak
    SELECT last_activity_date, urp.current_streak INTO v_last_activity, v_current_streak
    FROM user_rewards_profiles urp
    WHERE user_id = p_user_id;

    -- Check if already logged in today
    IF v_last_activity = v_today THEN
        RETURN QUERY SELECT v_current_streak, 0, FALSE;
        RETURN;
    END IF;

    v_is_new_day := TRUE;

    -- Calculate streak
    IF v_last_activity = v_today - INTERVAL '1 day' THEN
        -- Continue streak
        v_current_streak := COALESCE(v_current_streak, 0) + 1;
    ELSIF v_last_activity IS NULL OR v_last_activity < v_today - INTERVAL '1 day' THEN
        -- Reset streak
        v_current_streak := 1;
    END IF;

    -- Calculate streak bonus XP (base 5 + streak bonus, max 50)
    v_streak_xp := LEAST(5 + (v_current_streak - 1) * 2, 50);

    -- Update profile
    UPDATE user_rewards_profiles
    SET current_streak = v_current_streak,
        longest_streak = GREATEST(longest_streak, v_current_streak),
        last_activity_date = v_today,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log daily streak
    INSERT INTO daily_streaks (user_id, streak_date, xp_earned)
    VALUES (p_user_id, v_today, v_streak_xp)
    ON CONFLICT (user_id, streak_date) DO NOTHING;

    -- Award streak XP
    PERFORM award_xp(p_user_id, 'Daily Login', 'Kuingia Kila Siku', v_streak_xp,
        jsonb_build_object('streak_day', v_current_streak));

    RETURN QUERY SELECT v_current_streak, v_streak_xp, v_is_new_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment stat and check achievements
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
    -- Update the stat
    EXECUTE format(
        'UPDATE user_rewards_profiles SET %I = %I + $1, updated_at = NOW() WHERE user_id = $2 RETURNING %I',
        p_stat_field, p_stat_field, p_stat_field
    ) INTO v_new_value USING p_increment, p_user_id;

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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(p_limit INTEGER DEFAULT 100)
RETURNS TABLE(
    user_id UUID,
    total_xp INTEGER,
    current_level INTEGER,
    current_streak INTEGER,
    rank BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        urp.user_id,
        urp.total_xp,
        urp.current_level,
        urp.current_streak,
        ROW_NUMBER() OVER (ORDER BY urp.total_xp DESC) as rank
    FROM user_rewards_profiles urp
    ORDER BY urp.total_xp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
GRANT EXECUTE ON FUNCTION get_level_from_xp(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp(UUID, TEXT, TEXT, INTEGER, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_streak(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_stat_and_check_achievements(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_leaderboard(INTEGER) TO authenticated;
