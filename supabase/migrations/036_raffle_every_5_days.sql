-- =====================================================
-- Migration 036: Raffle Ticket Every 5-Day Streak
-- =====================================================
-- Changes raffle ticket earning from 30/60/90 day milestones
-- to earning 1 ticket for every 5-day streak (5, 10, 15, etc.)
-- =====================================================

-- ============================================
-- 1. UPDATE: Trigger function for streak raffle entries
-- ============================================
CREATE OR REPLACE FUNCTION trigger_award_streak_raffle_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_old_milestone INTEGER;
  v_new_milestone INTEGER;
  v_milestone INTEGER;
BEGIN
  -- Calculate which 5-day milestone the user has reached
  -- Old milestone (before update)
  v_old_milestone := COALESCE(OLD.current_streak, 0) / 5;
  -- New milestone (after update)
  v_new_milestone := NEW.current_streak / 5;

  -- Award a ticket for each new 5-day milestone reached
  IF v_new_milestone > v_old_milestone THEN
    -- Loop through each new milestone reached
    FOR v_milestone IN (v_old_milestone + 1)..v_new_milestone LOOP
      PERFORM award_raffle_entry(
        NEW.user_id,
        'streak_' || (v_milestone * 5),
        'streak_milestone_' || (v_milestone * 5),
        1 -- 1 ticket per milestone
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 2. UPDATE: Display names for new streak sources
-- ============================================
-- Note: The frontend getRaffleSourceDisplay function handles unknown sources
-- by using the source name as the label. For better display, you may want
-- to update the frontend to handle streak_5, streak_10, etc. dynamically.

-- ============================================
-- 3. RECREATE: The trigger on user_rewards_profiles (where streaks are tracked)
-- ============================================
DROP TRIGGER IF EXISTS award_streak_raffle_entry ON gamification_profiles;
DROP TRIGGER IF EXISTS award_streak_raffle_entry ON user_rewards_profiles;
CREATE TRIGGER award_streak_raffle_entry
  AFTER UPDATE ON user_rewards_profiles
  FOR EACH ROW
  WHEN (NEW.current_streak IS DISTINCT FROM OLD.current_streak)
  EXECUTE FUNCTION trigger_award_streak_raffle_entry();
