-- Fix Tomato Champion Mission - Remove "Continue Harvest" step
-- This migration:
-- 1. Updates the Tomato Champion mission to have 7 steps instead of 8
-- 2. Updates existing user missions to adjust total_steps
-- 3. Removes the "Continue Harvest" step progress records
-- 4. Recalculates progress for affected missions

-- Step 1: Update the Tomato Champion mission steps (remove last step)
UPDATE seasonal_missions
SET steps = '[
    {"name": "Prepare Nursery", "name_sw": "Andaa Kitalu", "description": "Prepare seedbed for tomato seedlings", "day_offset": 0},
    {"name": "Transplant Seedlings", "name_sw": "Pandikiza Miche", "description": "Transplant seedlings to main field", "day_offset": 21},
    {"name": "Install Staking", "name_sw": "Weka Tegemeo", "description": "Install stakes for support", "day_offset": 35},
    {"name": "Apply Fungicide", "name_sw": "Weka Dawa", "description": "Preventive disease control", "day_offset": 42},
    {"name": "Pruning", "name_sw": "Pogoa", "description": "Prune suckers for better yield", "day_offset": 49},
    {"name": "Monitor Pests", "name_sw": "Fuatilia Wadudu", "description": "Check for tomato pests", "day_offset": 56},
    {"name": "Harvest", "name_sw": "Vuna", "description": "Harvest ripe tomatoes", "day_offset": 70}
]'::jsonb
WHERE name = 'Tomato Champion';

-- Step 2: Delete step_index 7 (Continue Harvest) from mission_step_progress
-- for all Tomato Champion missions
DELETE FROM mission_step_progress
WHERE user_mission_id IN (
    SELECT um.id
    FROM user_missions um
    JOIN seasonal_missions sm ON um.mission_id = sm.id
    WHERE sm.name = 'Tomato Champion'
)
AND step_index = 7;

-- Step 3: Update user_missions for Tomato Champion to have 7 total steps
UPDATE user_missions
SET total_steps = 7
WHERE mission_id IN (
    SELECT id FROM seasonal_missions WHERE name = 'Tomato Champion'
);

-- Step 4: Recalculate progress for all affected user missions
-- If they completed all 7 steps (previous steps 0-6), mark as completed
UPDATE user_missions um
SET
    progress_percentage = (
        SELECT (COUNT(*)::DECIMAL / 7) * 100
        FROM mission_step_progress msp
        WHERE msp.user_mission_id = um.id AND msp.status = 'completed'
    ),
    current_step = (
        SELECT COUNT(*)
        FROM mission_step_progress msp
        WHERE msp.user_mission_id = um.id AND msp.status = 'completed'
    )
WHERE um.mission_id IN (
    SELECT id FROM seasonal_missions WHERE name = 'Tomato Champion'
);

-- Step 5: Complete missions where all 7 steps are done
UPDATE user_missions um
SET
    status = 'completed',
    completed_at = NOW(),
    progress_percentage = 100
WHERE um.mission_id IN (
    SELECT id FROM seasonal_missions WHERE name = 'Tomato Champion'
)
AND um.status = 'active'
AND (
    SELECT COUNT(*)
    FROM mission_step_progress msp
    WHERE msp.user_mission_id = um.id AND msp.status = 'completed'
) = 7;

-- Step 6: Update the complete_mission_step function to use >= instead of =
-- This ensures missions complete properly even with edge cases
CREATE OR REPLACE FUNCTION complete_mission_step(
    p_user_mission_id UUID,
    p_step_index INTEGER,
    p_evidence_photo_url TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_mission RECORD;
    v_mission RECORD;
    v_step_xp INTEGER := 10;
    v_completed_steps INTEGER;
    v_new_progress DECIMAL;
    v_rewards_result JSONB;
BEGIN
    -- Get user mission
    SELECT * INTO v_user_mission FROM user_missions WHERE id = p_user_mission_id;
    IF v_user_mission IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Mission not found');
    END IF;

    -- Get mission details
    SELECT * INTO v_mission FROM seasonal_missions WHERE id = v_user_mission.mission_id;

    -- Get step XP from mission steps JSON
    SELECT COALESCE((elem->>'xp_reward')::INTEGER, 10) INTO v_step_xp
    FROM jsonb_array_elements(v_mission.steps) WITH ORDINALITY AS t(elem, idx)
    WHERE idx = p_step_index + 1;

    -- Update step progress
    UPDATE mission_step_progress SET
        status = 'completed',
        completed_at = NOW(),
        evidence_photo_url = COALESCE(p_evidence_photo_url, evidence_photo_url),
        notes = COALESCE(p_notes, notes),
        xp_awarded = v_step_xp
    WHERE user_mission_id = p_user_mission_id AND step_index = p_step_index AND status != 'completed';

    -- Award XP for step completion
    PERFORM award_xp(v_user_mission.user_id, 'mission_step', 'Hatua ya misheni imekamilika', v_step_xp, '{}');

    -- If photo evidence provided, award bonus
    IF p_evidence_photo_url IS NOT NULL THEN
        PERFORM award_xp(v_user_mission.user_id, 'photo_evidence', 'Bonasi ya ushahidi wa picha', 5, '{}');
        PERFORM award_points(v_user_mission.user_id, 2, 'photo', p_user_mission_id, 'Photo evidence bonus');
    END IF;

    -- Calculate progress
    SELECT COUNT(*) INTO v_completed_steps FROM mission_step_progress
    WHERE user_mission_id = p_user_mission_id AND status = 'completed';

    v_new_progress := (v_completed_steps::DECIMAL / v_user_mission.total_steps) * 100;

    -- Advance to next step
    UPDATE mission_step_progress SET status = 'in_progress'
    WHERE user_mission_id = p_user_mission_id
    AND step_index = p_step_index + 1
    AND status = 'pending';

    -- Update mission progress
    UPDATE user_missions SET
        current_step = v_completed_steps,
        progress_percentage = v_new_progress,
        xp_earned = xp_earned + v_step_xp
    WHERE id = p_user_mission_id;

    -- Check if mission is complete (use >= for robustness)
    IF v_completed_steps >= v_user_mission.total_steps THEN
        UPDATE user_missions SET
            status = 'completed',
            completed_at = NOW(),
            progress_percentage = 100,
            xp_earned = xp_earned + v_mission.xp_reward,
            points_earned = v_mission.points_reward
        WHERE id = p_user_mission_id;

        -- Award completion rewards
        PERFORM award_xp(v_user_mission.user_id, 'mission_complete', 'Misheni imekamilika: ' || v_mission.name, v_mission.xp_reward, '{}');
        PERFORM award_points(v_user_mission.user_id, v_mission.points_reward, 'mission', v_user_mission.mission_id, 'Mission completion reward');
        PERFORM calculate_farmer_score(v_user_mission.user_id);

        -- Process mission completion rewards
        v_rewards_result := process_mission_completion_rewards(
            v_user_mission.user_id,
            v_user_mission.mission_id,
            v_mission.crop_type
        );

        RETURN jsonb_build_object(
            'success', true,
            'missionCompleted', true,
            'xpAwarded', v_step_xp + 5 + v_mission.xp_reward,
            'pointsAwarded', v_mission.points_reward,
            'completedSteps', v_completed_steps,
            'totalSteps', v_user_mission.total_steps,
            'progress', 100,
            'rewards', v_rewards_result
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'missionCompleted', false,
        'xpAwarded', v_step_xp + CASE WHEN p_evidence_photo_url IS NOT NULL THEN 5 ELSE 0 END,
        'completedSteps', v_completed_steps,
        'totalSteps', v_user_mission.total_steps,
        'progress', v_new_progress
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
