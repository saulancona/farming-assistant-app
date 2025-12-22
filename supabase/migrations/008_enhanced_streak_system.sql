-- ============================================
-- ENHANCED DAILY STREAK SYSTEM
-- Features:
-- 1. Track any activity as "daily engagement"
-- 2. Progressive milestone rewards (3, 7, 30 days)
-- 3. "Save my streak" recovery challenge
-- 4. Monthly raffle entry at 30-day streak
-- ============================================

-- Add new columns to user_rewards_profiles for enhanced streak tracking
ALTER TABLE user_rewards_profiles
ADD COLUMN IF NOT EXISTS streak_broken_at DATE,
ADD COLUMN IF NOT EXISTS streak_saves_used INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_streak_save DATE,
ADD COLUMN IF NOT EXISTS monthly_raffle_entries INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS streak_milestones_claimed JSONB DEFAULT '[]'::JSONB;

-- ============================================
-- STREAK ACTIVITY LOGS TABLE
-- Track what activities counted toward streak
-- ============================================
CREATE TABLE IF NOT EXISTS streak_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
    activity_type TEXT NOT NULL, -- 'weather_check', 'price_check', 'task_complete', 'photo_upload', etc.
    activity_name TEXT NOT NULL,
    activity_name_sw TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, activity_date, activity_type)
);

CREATE INDEX IF NOT EXISTS idx_streak_activity_logs_user_date ON streak_activity_logs(user_id, activity_date);

-- ============================================
-- STREAK MILESTONES TABLE
-- Define milestone rewards
-- ============================================
CREATE TABLE IF NOT EXISTS streak_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    streak_days INTEGER NOT NULL UNIQUE,
    reward_type TEXT NOT NULL, -- 'voice_tip', 'badge', 'points', 'raffle'
    reward_value INTEGER DEFAULT 0,
    badge_id UUID REFERENCES achievements(id),
    voice_tip_key TEXT,
    name TEXT NOT NULL,
    name_sw TEXT NOT NULL,
    description TEXT NOT NULL,
    description_sw TEXT NOT NULL,
    icon TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default milestones
INSERT INTO streak_milestones (streak_days, reward_type, reward_value, name, name_sw, description, description_sw, icon, voice_tip_key)
VALUES
    (3, 'voice_tip', 5, '3-Day Streak', 'Mfululizo wa Siku 3', 'You''ve been active for 3 days! Here''s a farming tip.', 'Umekuwa hai kwa siku 3! Hii ni kidokezo cha kilimo.', '🔥', 'streak_3_day'),
    (7, 'points', 10, '7-Day Streak', 'Mfululizo wa Siku 7', 'A full week of farming dedication! Earn 10 bonus points.', 'Wiki nzima ya kujitolea kwa kilimo! Pata pointi 10 za ziada.', '⭐', NULL),
    (14, 'points', 25, '14-Day Streak', 'Mfululizo wa Siku 14', 'Two weeks strong! Earn 25 bonus points.', 'Wiki mbili imara! Pata pointi 25 za ziada.', '🌟', NULL),
    (21, 'points', 40, '21-Day Streak', 'Mfululizo wa Siku 21', 'Three weeks of consistency! Earn 40 bonus points.', 'Wiki tatu za uthabiti! Pata pointi 40 za ziada.', '💫', NULL),
    (30, 'raffle', 100, '30-Day Streak', 'Mfululizo wa Siku 30', 'A full month! You''re entered in the monthly raffle!', 'Mwezi mzima! Umeingia kwenye bahati nasibu ya kila mwezi!', '🏆', 'streak_30_day')
ON CONFLICT (streak_days) DO UPDATE SET
    reward_type = EXCLUDED.reward_type,
    reward_value = EXCLUDED.reward_value,
    name = EXCLUDED.name,
    name_sw = EXCLUDED.name_sw,
    description = EXCLUDED.description,
    description_sw = EXCLUDED.description_sw,
    icon = EXCLUDED.icon,
    voice_tip_key = EXCLUDED.voice_tip_key;

-- ============================================
-- USER STREAK MILESTONE CLAIMS TABLE
-- Track which milestones user has claimed
-- ============================================
CREATE TABLE IF NOT EXISTS user_streak_milestone_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    milestone_id UUID NOT NULL REFERENCES streak_milestones(id),
    streak_count INTEGER NOT NULL,
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    rewards_given JSONB DEFAULT '{}'::JSONB,
    UNIQUE(user_id, milestone_id, streak_count)
);

-- ============================================
-- MONTHLY RAFFLE ENTRIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_raffle_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    raffle_month DATE NOT NULL, -- First day of the month
    entry_count INTEGER DEFAULT 1,
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, raffle_month)
);

-- ============================================
-- VOICE TIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS streak_voice_tips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tip_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    title_sw TEXT NOT NULL,
    content TEXT NOT NULL,
    content_sw TEXT NOT NULL,
    audio_url TEXT,
    audio_url_sw TEXT,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert some default voice tips
INSERT INTO streak_voice_tips (tip_key, title, title_sw, content, content_sw, category)
VALUES
    ('streak_3_day', 'Soil Health Tip', 'Kidokezo cha Afya ya Udongo',
     'Test your soil every season. Healthy soil means healthy crops and better yields!',
     'Jaribu udongo wako kila msimu. Udongo wenye afya unamaanisha mazao yenye afya na mavuno bora!',
     'soil'),
    ('streak_30_day', 'Market Timing', 'Wakati wa Soko',
     'Track market prices weekly. Selling at peak times can increase your profits by 20% or more!',
     'Fuatilia bei za soko kila wiki. Kuuza wakati wa kilele kunaweza kuongeza faida yako kwa 20% au zaidi!',
     'market')
ON CONFLICT (tip_key) DO NOTHING;

-- ============================================
-- ENHANCED STREAK UPDATE FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION record_daily_activity(
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_name TEXT DEFAULT NULL,
    p_activity_name_sw TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_today DATE := CURRENT_DATE;
    v_last_activity DATE;
    v_current_streak INTEGER;
    v_was_broken BOOLEAN := FALSE;
    v_streak_xp INTEGER;
    v_is_first_activity_today BOOLEAN := FALSE;
    v_milestone_reached RECORD;
    v_milestones_to_claim UUID[];
    v_result JSONB;
    v_activity_count INTEGER;
BEGIN
    -- Ensure user has a rewards profile
    INSERT INTO user_rewards_profiles (user_id, total_xp, current_level)
    VALUES (p_user_id, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;

    -- Log this specific activity
    INSERT INTO streak_activity_logs (user_id, activity_date, activity_type, activity_name, activity_name_sw)
    VALUES (p_user_id, v_today, p_activity_type, COALESCE(p_activity_name, p_activity_type), p_activity_name_sw)
    ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

    -- Count activities today
    SELECT COUNT(*) INTO v_activity_count
    FROM streak_activity_logs
    WHERE user_id = p_user_id AND activity_date = v_today;

    -- Get current streak state
    SELECT last_activity_date, current_streak, streak_broken_at
    INTO v_last_activity, v_current_streak, v_was_broken
    FROM user_rewards_profiles
    WHERE user_id = p_user_id;

    v_current_streak := COALESCE(v_current_streak, 0);

    -- Check if this is the first activity today
    IF v_last_activity IS NULL OR v_last_activity < v_today THEN
        v_is_first_activity_today := TRUE;

        -- Calculate new streak
        IF v_last_activity = v_today - INTERVAL '1 day' THEN
            -- Continue streak
            v_current_streak := v_current_streak + 1;
        ELSIF v_last_activity IS NULL THEN
            -- First ever activity
            v_current_streak := 1;
        ELSE
            -- Streak was broken (more than 1 day gap)
            -- Mark as broken for potential recovery
            UPDATE user_rewards_profiles
            SET streak_broken_at = v_last_activity
            WHERE user_id = p_user_id AND streak_broken_at IS NULL;

            v_was_broken := TRUE;
            v_current_streak := 1; -- Start new streak
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

        -- Log daily streak entry
        INSERT INTO daily_streaks (user_id, streak_date, xp_earned)
        VALUES (p_user_id, v_today, v_streak_xp)
        ON CONFLICT (user_id, streak_date) DO UPDATE SET xp_earned = EXCLUDED.xp_earned;

        -- Award streak XP
        PERFORM award_xp(p_user_id, 'daily_activity', 'Shughuli ya Kila Siku', v_streak_xp,
            jsonb_build_object('streak_day', v_current_streak, 'activity_type', p_activity_type));
    END IF;

    -- Check for milestone rewards
    SELECT ARRAY_AGG(sm.id) INTO v_milestones_to_claim
    FROM streak_milestones sm
    WHERE sm.streak_days <= v_current_streak
    AND NOT EXISTS (
        SELECT 1 FROM user_streak_milestone_claims usmc
        WHERE usmc.user_id = p_user_id
        AND usmc.milestone_id = sm.id
        AND usmc.streak_count = (v_current_streak / sm.streak_days) * sm.streak_days
    );

    -- Process milestone claims
    IF v_milestones_to_claim IS NOT NULL AND array_length(v_milestones_to_claim, 1) > 0 THEN
        FOR v_milestone_reached IN
            SELECT * FROM streak_milestones WHERE id = ANY(v_milestones_to_claim)
        LOOP
            -- Claim this milestone
            INSERT INTO user_streak_milestone_claims (user_id, milestone_id, streak_count, rewards_given)
            VALUES (p_user_id, v_milestone_reached.id, v_current_streak,
                jsonb_build_object('type', v_milestone_reached.reward_type, 'value', v_milestone_reached.reward_value))
            ON CONFLICT DO NOTHING;

            -- Award points if applicable
            IF v_milestone_reached.reward_type = 'points' THEN
                PERFORM award_points(p_user_id, v_milestone_reached.reward_value, 'streak_milestone',
                    v_milestone_reached.id, 'Streak milestone: ' || v_milestone_reached.streak_days || ' days');
            END IF;

            -- Add raffle entry if 30-day milestone
            IF v_milestone_reached.reward_type = 'raffle' THEN
                INSERT INTO monthly_raffle_entries (user_id, raffle_month, entry_count)
                VALUES (p_user_id, DATE_TRUNC('month', CURRENT_DATE)::DATE, 1)
                ON CONFLICT (user_id, raffle_month)
                DO UPDATE SET entry_count = monthly_raffle_entries.entry_count + 1;

                UPDATE user_rewards_profiles
                SET monthly_raffle_entries = COALESCE(monthly_raffle_entries, 0) + 1
                WHERE user_id = p_user_id;
            END IF;
        END LOOP;
    END IF;

    -- Build result
    SELECT jsonb_build_object(
        'success', true,
        'current_streak', v_current_streak,
        'is_first_activity_today', v_is_first_activity_today,
        'streak_xp_awarded', CASE WHEN v_is_first_activity_today THEN v_streak_xp ELSE 0 END,
        'activities_today', v_activity_count,
        'was_streak_broken', v_was_broken,
        'milestones_claimed', COALESCE(v_milestones_to_claim, ARRAY[]::UUID[])
    ) INTO v_result;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STREAK RECOVERY ("Save My Streak") FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION save_streak_with_challenge(
    p_user_id UUID,
    p_challenge_type TEXT, -- 'photo_upload', 'price_check', 'complete_task'
    p_evidence_url TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_last_activity DATE;
    v_streak_broken_at DATE;
    v_current_streak INTEGER;
    v_last_save DATE;
    v_today DATE := CURRENT_DATE;
    v_can_save BOOLEAN := FALSE;
    v_result JSONB;
BEGIN
    -- Get current state
    SELECT last_activity_date, streak_broken_at, current_streak, last_streak_save
    INTO v_last_activity, v_streak_broken_at, v_current_streak, v_last_save
    FROM user_rewards_profiles
    WHERE user_id = p_user_id;

    -- Check if streak can be saved:
    -- 1. Last activity was yesterday or 2 days ago (within recovery window)
    -- 2. Haven't used save in the last 7 days
    -- 3. Streak was at least 3 days
    IF v_last_activity >= v_today - INTERVAL '2 days'
       AND v_last_activity < v_today
       AND (v_last_save IS NULL OR v_last_save < v_today - INTERVAL '7 days')
       AND v_current_streak >= 3 THEN
        v_can_save := TRUE;
    END IF;

    IF NOT v_can_save THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot save streak',
            'reason', CASE
                WHEN v_current_streak < 3 THEN 'Streak must be at least 3 days'
                WHEN v_last_save >= v_today - INTERVAL '7 days' THEN 'Already used streak save this week'
                WHEN v_last_activity < v_today - INTERVAL '2 days' THEN 'Recovery window expired'
                ELSE 'No streak to save'
            END
        );
    END IF;

    -- Verify challenge completion based on type
    -- For now, we trust the client - in production, verify evidence

    -- Save the streak
    UPDATE user_rewards_profiles
    SET last_activity_date = v_today,
        streak_broken_at = NULL,
        last_streak_save = v_today,
        streak_saves_used = COALESCE(streak_saves_used, 0) + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log the activity
    INSERT INTO streak_activity_logs (user_id, activity_date, activity_type, activity_name, activity_name_sw)
    VALUES (p_user_id, v_today, 'streak_save', 'Streak Recovery Challenge', 'Changamoto ya Kuokoa Mfululizo')
    ON CONFLICT (user_id, activity_date, activity_type) DO NOTHING;

    -- Log daily streak
    INSERT INTO daily_streaks (user_id, streak_date, xp_earned)
    VALUES (p_user_id, v_today, 10)
    ON CONFLICT (user_id, streak_date) DO UPDATE SET xp_earned = 10;

    -- Award XP for saving streak
    PERFORM award_xp(p_user_id, 'streak_save', 'Kuokoa Mfululizo', 10,
        jsonb_build_object('challenge_type', p_challenge_type, 'streak_saved', v_current_streak));

    RETURN jsonb_build_object(
        'success', true,
        'streak_saved', v_current_streak,
        'message', 'Streak saved! Keep going!',
        'xp_awarded', 10
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET STREAK STATUS FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_streak_status(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_profile RECORD;
    v_today DATE := CURRENT_DATE;
    v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
    v_activities_today JSONB;
    v_streak_at_risk BOOLEAN := FALSE;
    v_can_save_streak BOOLEAN := FALSE;
    v_next_milestone RECORD;
    v_recent_milestones JSONB;
    v_result JSONB;
BEGIN
    -- Get profile
    SELECT * INTO v_profile
    FROM user_rewards_profiles
    WHERE user_id = p_user_id;

    IF v_profile IS NULL THEN
        RETURN jsonb_build_object(
            'current_streak', 0,
            'longest_streak', 0,
            'streak_at_risk', false,
            'can_save_streak', false,
            'activities_today', '[]'::JSONB,
            'next_milestone', NULL
        );
    END IF;

    -- Check if streak is at risk (no activity today and had activity yesterday)
    IF v_profile.last_activity_date = v_yesterday THEN
        v_streak_at_risk := TRUE;
    END IF;

    -- Check if streak can be saved
    IF v_profile.last_activity_date >= v_today - INTERVAL '2 days'
       AND v_profile.last_activity_date < v_today
       AND (v_profile.last_streak_save IS NULL OR v_profile.last_streak_save < v_today - INTERVAL '7 days')
       AND v_profile.current_streak >= 3 THEN
        v_can_save_streak := TRUE;
    END IF;

    -- Get today's activities
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'type', activity_type,
        'name', activity_name,
        'name_sw', activity_name_sw,
        'time', created_at
    )), '[]'::JSONB) INTO v_activities_today
    FROM streak_activity_logs
    WHERE user_id = p_user_id AND activity_date = v_today;

    -- Get next milestone
    SELECT * INTO v_next_milestone
    FROM streak_milestones
    WHERE streak_days > v_profile.current_streak
    ORDER BY streak_days ASC
    LIMIT 1;

    -- Get recently claimed milestones (last 7 days)
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'milestone_days', sm.streak_days,
        'name', sm.name,
        'name_sw', sm.name_sw,
        'reward_type', sm.reward_type,
        'reward_value', sm.reward_value,
        'icon', sm.icon,
        'claimed_at', usmc.claimed_at
    )), '[]'::JSONB) INTO v_recent_milestones
    FROM user_streak_milestone_claims usmc
    JOIN streak_milestones sm ON sm.id = usmc.milestone_id
    WHERE usmc.user_id = p_user_id
    AND usmc.claimed_at > NOW() - INTERVAL '7 days';

    -- Build result
    v_result := jsonb_build_object(
        'current_streak', v_profile.current_streak,
        'longest_streak', v_profile.longest_streak,
        'last_activity_date', v_profile.last_activity_date,
        'streak_at_risk', v_streak_at_risk,
        'can_save_streak', v_can_save_streak,
        'streak_saves_used', COALESCE(v_profile.streak_saves_used, 0),
        'last_streak_save', v_profile.last_streak_save,
        'monthly_raffle_entries', COALESCE(v_profile.monthly_raffle_entries, 0),
        'activities_today', v_activities_today,
        'next_milestone', CASE WHEN v_next_milestone IS NOT NULL THEN jsonb_build_object(
            'days', v_next_milestone.streak_days,
            'days_remaining', v_next_milestone.streak_days - v_profile.current_streak,
            'name', v_next_milestone.name,
            'name_sw', v_next_milestone.name_sw,
            'reward_type', v_next_milestone.reward_type,
            'reward_value', v_next_milestone.reward_value,
            'icon', v_next_milestone.icon
        ) ELSE NULL END,
        'recent_milestones', v_recent_milestones
    );

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- GET VOICE TIP FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION get_streak_voice_tip(p_tip_key TEXT)
RETURNS JSONB AS $$
DECLARE
    v_tip RECORD;
BEGIN
    SELECT * INTO v_tip
    FROM streak_voice_tips
    WHERE tip_key = p_tip_key;

    IF v_tip IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN jsonb_build_object(
        'key', v_tip.tip_key,
        'title', v_tip.title,
        'title_sw', v_tip.title_sw,
        'content', v_tip.content,
        'content_sw', v_tip.content_sw,
        'audio_url', v_tip.audio_url,
        'audio_url_sw', v_tip.audio_url_sw,
        'category', v_tip.category
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE streak_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streak_milestone_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_raffle_entries ENABLE ROW LEVEL SECURITY;

-- Policies for streak_activity_logs
CREATE POLICY "Users can view their own streak activities"
ON streak_activity_logs FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own streak activities"
ON streak_activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policies for user_streak_milestone_claims
CREATE POLICY "Users can view their own milestone claims"
ON user_streak_milestone_claims FOR SELECT
USING (user_id = auth.uid());

-- Policies for monthly_raffle_entries
CREATE POLICY "Users can view their own raffle entries"
ON monthly_raffle_entries FOR SELECT
USING (user_id = auth.uid());

-- streak_milestones and streak_voice_tips are public read
ALTER TABLE streak_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE streak_voice_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view streak milestones"
ON streak_milestones FOR SELECT
USING (true);

CREATE POLICY "Anyone can view voice tips"
ON streak_voice_tips FOR SELECT
USING (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE streak_activity_logs IS 'Tracks individual activities that count toward daily streak';
COMMENT ON TABLE streak_milestones IS 'Defines streak milestone rewards (3, 7, 30 days etc)';
COMMENT ON TABLE user_streak_milestone_claims IS 'Tracks which milestones users have claimed';
COMMENT ON TABLE monthly_raffle_entries IS 'Tracks raffle entries earned from 30-day streaks';
COMMENT ON TABLE streak_voice_tips IS 'Voice tips/advice unlocked at certain streak milestones';
COMMENT ON FUNCTION record_daily_activity IS 'Records any app activity and updates streak. Call for weather checks, price checks, task completions, etc.';
COMMENT ON FUNCTION save_streak_with_challenge IS 'Allows user to save a broken streak by completing a challenge (upload photo, etc.)';
COMMENT ON FUNCTION get_streak_status IS 'Returns comprehensive streak status including milestones and recovery options';
