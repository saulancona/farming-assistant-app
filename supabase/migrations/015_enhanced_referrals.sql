-- =============================================
-- ENHANCED 3-TIER REFERRAL SYSTEM
-- =============================================
-- Implements instant gratification, activation rewards, and milestone system

-- =============================================
-- PART 1: ENHANCE REFERRAL TABLES
-- =============================================

-- Add columns for instant gratification tracking
ALTER TABLE referral_milestones
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referrer_badge TEXT DEFAULT 'bronze',
ADD COLUMN IF NOT EXISTS last_share_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_points_earned INTEGER DEFAULT 0;

-- Add team/group referral tracking
ALTER TABLE referrals
ADD COLUMN IF NOT EXISTS team_id UUID,
ADD COLUMN IF NOT EXISTS referral_source TEXT DEFAULT 'direct'; -- direct, whatsapp, sms, link

-- =============================================
-- PART 2: REFERRAL SHARE TRACKING
-- =============================================

-- Track each share action for instant gratification
CREATE TABLE IF NOT EXISTS referral_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  share_method TEXT NOT NULL, -- 'whatsapp', 'copy', 'share_api', 'sms'
  share_count INTEGER DEFAULT 1,
  badge_awarded TEXT, -- 'bronze', 'silver', 'gold' referrer badge
  xp_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_shares_user ON referral_shares(user_id);
CREATE INDEX idx_referral_shares_created ON referral_shares(created_at DESC);

-- =============================================
-- PART 3: REFERRAL BADGE SYSTEM
-- =============================================

-- Badge type based on share activity
CREATE TABLE IF NOT EXISTS referral_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_type TEXT NOT NULL UNIQUE, -- 'bronze_referrer', 'silver_referrer', 'gold_referrer', 'platinum_referrer'
  badge_name TEXT NOT NULL,
  badge_name_sw TEXT,
  icon TEXT NOT NULL,
  min_shares INTEGER DEFAULT 0,
  min_activated INTEGER DEFAULT 0,
  xp_bonus INTEGER DEFAULT 0,
  points_bonus INTEGER DEFAULT 0,
  description TEXT,
  description_sw TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed referral badges
INSERT INTO referral_badges (badge_type, badge_name, badge_name_sw, icon, min_shares, min_activated, xp_bonus, points_bonus, description, description_sw)
VALUES
  ('bronze_referrer', 'Bronze Referrer', 'Mrejelea wa Shaba', '🥉', 1, 0, 5, 0, 'Started sharing with friends', 'Umeanza kushiriki na marafiki'),
  ('silver_referrer', 'Silver Referrer', 'Mrejelea wa Fedha', '🥈', 5, 3, 15, 10, 'Active community builder', 'Mjenzi hai wa jamii'),
  ('gold_referrer', 'Gold Referrer', 'Mrejelea wa Dhahabu', '🥇', 10, 10, 30, 25, 'Champion recruiter', 'Mwajiri bingwa'),
  ('platinum_referrer', 'Platinum Referrer', 'Mrejelea wa Platinamu', '💎', 25, 25, 75, 50, 'Village Champion', 'Bingwa wa Kijiji'),
  ('legend_referrer', 'Legendary Referrer', 'Mrejelea wa Hadithi', '👑', 50, 50, 150, 100, 'Legendary network builder', 'Mjenzi wa mtandao wa hadithi')
ON CONFLICT (badge_type) DO NOTHING;

-- =============================================
-- PART 4: MILESTONE REWARDS ENHANCEMENT
-- =============================================

-- Detailed milestone rewards table
CREATE TABLE IF NOT EXISTS referral_milestone_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  milestone_count INTEGER NOT NULL UNIQUE,
  points_reward INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  badge_name TEXT,
  badge_name_sw TEXT,
  title_awarded TEXT, -- Title like "Village Champion"
  title_awarded_sw TEXT,
  physical_reward TEXT, -- e.g., "$0.30 airtime", "Solar light"
  physical_reward_sw TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed milestone rewards (matching spec exactly)
INSERT INTO referral_milestone_rewards (milestone_count, points_reward, xp_reward, badge_name, badge_name_sw, title_awarded, title_awarded_sw, physical_reward, physical_reward_sw)
VALUES
  (3, 50, 10, NULL, NULL, NULL, NULL, '$0.30 airtime', 'Muda wa simu $0.30'),
  (10, 150, 25, 'Recruiter Badge', 'Beji ya Mwajiri', 'Recruiter', 'Mwajiri', 'Input voucher or t-shirt', 'Vocha ya pembejeo au T-shirt'),
  (25, 400, 50, NULL, NULL, 'Champion Recruiter', 'Mwajiri Bingwa', 'Solar light or $5', 'Taa ya sola au $5'),
  (50, 1000, 100, 'Champion Badge', 'Beji ya Bingwa', 'Champion', 'Bingwa', 'Agro-dealer credit + radio recognition', 'Mkopo wa duka la kilimo + kutambuliwa redioni'),
  (100, 2500, 250, 'Legend Badge', 'Beji ya Hadithi', 'Village Champion', 'Bingwa wa Kijiji', 'Special rewards + VIP status', 'Zawadi maalum + hadhi ya VIP')
ON CONFLICT (milestone_count) DO NOTHING;

-- =============================================
-- PART 5: ROW LEVEL SECURITY
-- =============================================

ALTER TABLE referral_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestone_rewards ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own shares" ON referral_shares FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shares" ON referral_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view referral badges" ON referral_badges FOR SELECT USING (true);
CREATE POLICY "Anyone can view milestone rewards" ON referral_milestone_rewards FOR SELECT USING (is_active = true);

-- =============================================
-- PART 6: INSTANT GRATIFICATION FUNCTION
-- =============================================

-- Award instant reward when user shares (even before friend joins)
CREATE OR REPLACE FUNCTION record_referral_share(
  p_user_id UUID,
  p_share_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_share_count INTEGER;
  v_current_badge TEXT;
  v_new_badge TEXT;
  v_xp_awarded INTEGER := 0;
  v_badge_info RECORD;
  v_milestone RECORD;
BEGIN
  -- Get current share count
  SELECT COALESCE(share_count, 0) + 1 INTO v_share_count
  FROM referral_milestones
  WHERE user_id = p_user_id;

  IF v_share_count IS NULL THEN
    v_share_count := 1;
  END IF;

  -- Record the share
  INSERT INTO referral_shares (user_id, share_method)
  VALUES (p_user_id, p_share_method);

  -- Update milestone share count
  INSERT INTO referral_milestones (user_id, share_count, last_share_at)
  VALUES (p_user_id, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    share_count = referral_milestones.share_count + 1,
    last_share_at = NOW(),
    updated_at = NOW();

  -- Check for badge upgrade
  SELECT referrer_badge INTO v_current_badge
  FROM referral_milestones WHERE user_id = p_user_id;

  -- Find the best badge they qualify for
  SELECT * INTO v_badge_info
  FROM referral_badges
  WHERE min_shares <= v_share_count
  ORDER BY min_shares DESC
  LIMIT 1;

  IF v_badge_info.badge_type IS NOT NULL AND v_badge_info.badge_type != COALESCE(v_current_badge, 'none') THEN
    v_new_badge := v_badge_info.badge_type;
    v_xp_awarded := v_badge_info.xp_bonus;

    -- Update badge
    UPDATE referral_milestones
    SET referrer_badge = v_new_badge,
        total_xp_earned = COALESCE(total_xp_earned, 0) + v_xp_awarded
    WHERE user_id = p_user_id;

    -- Award XP for badge
    IF v_xp_awarded > 0 THEN
      UPDATE user_profiles
      SET total_xp = COALESCE(total_xp, 0) + v_xp_awarded
      WHERE id = p_user_id;
    END IF;

    -- Award points bonus
    IF v_badge_info.points_bonus > 0 THEN
      PERFORM award_points(p_user_id, v_badge_info.points_bonus, 'referral_badge', NULL, 'Referrer badge bonus: ' || v_badge_info.badge_name);
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'shareCount', v_share_count,
      'badgeEarned', true,
      'newBadge', v_new_badge,
      'badgeName', v_badge_info.badge_name,
      'badgeNameSw', v_badge_info.badge_name_sw,
      'badgeIcon', v_badge_info.icon,
      'xpAwarded', v_xp_awarded,
      'pointsAwarded', v_badge_info.points_bonus,
      'message', 'Great job! You earned a new badge!',
      'messageSw', 'Umefanya vizuri! Umepata beji mpya!'
    );
  END IF;

  -- Return success without badge (just encouragement)
  RETURN jsonb_build_object(
    'success', true,
    'shareCount', v_share_count,
    'badgeEarned', false,
    'currentBadge', v_current_badge,
    'message', 'Thanks for sharing! You''re growing your community.',
    'messageSw', 'Asante kwa kushiriki! Unakuza jamii yako.'
  );
END;
$$;

-- =============================================
-- PART 7: ENHANCED ACTIVATION FUNCTION
-- =============================================

-- Enhanced activation with tier rewards
CREATE OR REPLACE FUNCTION activate_referral_enhanced(
  p_user_id UUID,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referrer_xp INTEGER := 3;
  v_referrer_points INTEGER := 5;
  v_referred_xp INTEGER := 5;
  v_referred_points INTEGER := 10;
  v_milestone_result JSONB;
  v_activated_count INTEGER;
BEGIN
  -- Find pending referral
  SELECT * INTO v_referral FROM referrals
  WHERE referred_id = p_user_id AND status = 'pending';

  IF v_referral.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No pending referral found');
  END IF;

  -- Update referral
  UPDATE referrals SET
    status = 'activated',
    activation_action = p_action,
    referrer_xp_awarded = v_referrer_xp,
    referrer_points_awarded = v_referrer_points,
    referred_xp_awarded = v_referred_xp,
    referred_points_awarded = v_referred_points,
    activated_at = NOW()
  WHERE id = v_referral.id;

  -- Update referrer's milestone
  UPDATE referral_milestones SET
    activated_referrals = activated_referrals + 1,
    total_xp_earned = COALESCE(total_xp_earned, 0) + v_referrer_xp,
    total_points_earned = COALESCE(total_points_earned, 0) + v_referrer_points,
    updated_at = NOW()
  WHERE user_id = v_referral.referrer_id
  RETURNING activated_referrals INTO v_activated_count;

  -- Award XP to referrer
  IF v_referral.referrer_id IS NOT NULL THEN
    UPDATE user_profiles
    SET total_xp = COALESCE(total_xp, 0) + v_referrer_xp
    WHERE id = v_referral.referrer_id;

    PERFORM award_points(v_referral.referrer_id, v_referrer_points, 'referral', v_referral.id, 'Referral activation reward');
  END IF;

  -- Award XP and points to referred user
  UPDATE user_profiles
  SET total_xp = COALESCE(total_xp, 0) + v_referred_xp
  WHERE id = p_user_id;

  PERFORM award_points(p_user_id, v_referred_points, 'referral', v_referral.id, 'Welcome bonus for joining via referral');

  -- Auto-check milestones for referrer
  IF v_referral.referrer_id IS NOT NULL THEN
    v_milestone_result := check_referral_milestones_enhanced(v_referral.referrer_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'referrerId', v_referral.referrer_id,
    'xpAwarded', v_referred_xp,
    'pointsAwarded', v_referred_points,
    'referrerActivatedCount', v_activated_count,
    'milestoneResult', v_milestone_result
  );
END;
$$;

-- =============================================
-- PART 8: ENHANCED MILESTONE CHECK
-- =============================================

CREATE OR REPLACE FUNCTION check_referral_milestones_enhanced(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_milestone referral_milestones%ROWTYPE;
  v_reward referral_milestone_rewards%ROWTYPE;
  v_points_awarded INTEGER := 0;
  v_xp_awarded INTEGER := 0;
  v_new_tier referral_tier;
  v_milestones_claimed TEXT[] := '{}';
  v_physical_reward TEXT;
  v_title_awarded TEXT;
BEGIN
  SELECT * INTO v_milestone FROM referral_milestones WHERE user_id = p_user_id;

  IF v_milestone.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No referral record found');
  END IF;

  -- Check each milestone
  FOR v_reward IN
    SELECT * FROM referral_milestone_rewards
    WHERE is_active = true
    ORDER BY milestone_count
  LOOP
    -- Skip if not reached or already claimed
    IF v_milestone.activated_referrals < v_reward.milestone_count THEN
      CONTINUE;
    END IF;

    -- Check if already claimed
    IF (v_reward.milestone_count = 3 AND v_milestone.milestone_3_claimed) OR
       (v_reward.milestone_count = 10 AND v_milestone.milestone_10_claimed) OR
       (v_reward.milestone_count = 25 AND v_milestone.milestone_25_claimed) OR
       (v_reward.milestone_count = 50 AND v_milestone.milestone_50_claimed) OR
       (v_reward.milestone_count = 100 AND v_milestone.milestone_100_claimed) THEN
      CONTINUE;
    END IF;

    -- Award points
    PERFORM award_points(p_user_id, v_reward.points_reward, 'referral_milestone', NULL,
      v_reward.milestone_count || ' referrals milestone');
    v_points_awarded := v_points_awarded + v_reward.points_reward;

    -- Award XP
    IF v_reward.xp_reward > 0 THEN
      UPDATE user_profiles
      SET total_xp = COALESCE(total_xp, 0) + v_reward.xp_reward
      WHERE id = p_user_id;
      v_xp_awarded := v_xp_awarded + v_reward.xp_reward;
    END IF;

    -- Mark as claimed and update tier
    IF v_reward.milestone_count = 3 THEN
      UPDATE referral_milestones SET milestone_3_claimed = TRUE WHERE user_id = p_user_id;
    ELSIF v_reward.milestone_count = 10 THEN
      UPDATE referral_milestones SET milestone_10_claimed = TRUE, current_tier = 'recruiter' WHERE user_id = p_user_id;
      v_new_tier := 'recruiter';
    ELSIF v_reward.milestone_count = 25 THEN
      UPDATE referral_milestones SET milestone_25_claimed = TRUE WHERE user_id = p_user_id;
    ELSIF v_reward.milestone_count = 50 THEN
      UPDATE referral_milestones SET milestone_50_claimed = TRUE, current_tier = 'champion' WHERE user_id = p_user_id;
      v_new_tier := 'champion';
    ELSIF v_reward.milestone_count = 100 THEN
      UPDATE referral_milestones SET milestone_100_claimed = TRUE, current_tier = 'legend' WHERE user_id = p_user_id;
      v_new_tier := 'legend';
    END IF;

    v_milestones_claimed := array_append(v_milestones_claimed, v_reward.milestone_count::TEXT);
    v_physical_reward := v_reward.physical_reward;
    v_title_awarded := v_reward.title_awarded;
  END LOOP;

  -- Update totals
  IF v_points_awarded > 0 OR v_xp_awarded > 0 THEN
    UPDATE referral_milestones SET
      total_points_earned = COALESCE(total_points_earned, 0) + v_points_awarded,
      total_xp_earned = COALESCE(total_xp_earned, 0) + v_xp_awarded,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pointsAwarded', v_points_awarded,
    'xpAwarded', v_xp_awarded,
    'milestonesClaimed', v_milestones_claimed,
    'newTier', v_new_tier,
    'physicalReward', v_physical_reward,
    'titleAwarded', v_title_awarded
  );
END;
$$;

-- =============================================
-- PART 9: GET REFERRAL DASHBOARD DATA
-- =============================================

CREATE OR REPLACE FUNCTION get_referral_dashboard(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_milestone referral_milestones%ROWTYPE;
  v_code TEXT;
  v_badge_info RECORD;
  v_next_badge RECORD;
  v_next_milestone RECORD;
BEGIN
  -- Get referral code
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;

  IF v_code IS NULL THEN
    v_code := generate_referral_code(p_user_id);
  END IF;

  -- Get milestones
  SELECT * INTO v_milestone FROM referral_milestones WHERE user_id = p_user_id;

  IF v_milestone.user_id IS NULL THEN
    INSERT INTO referral_milestones (user_id) VALUES (p_user_id)
    RETURNING * INTO v_milestone;
  END IF;

  -- Get current badge info
  SELECT * INTO v_badge_info
  FROM referral_badges
  WHERE badge_type = COALESCE(v_milestone.referrer_badge, 'bronze_referrer');

  -- Get next badge
  SELECT * INTO v_next_badge
  FROM referral_badges
  WHERE min_shares > COALESCE(v_milestone.share_count, 0)
  ORDER BY min_shares
  LIMIT 1;

  -- Get next milestone
  SELECT * INTO v_next_milestone
  FROM referral_milestone_rewards
  WHERE milestone_count > COALESCE(v_milestone.activated_referrals, 0)
    AND is_active = true
  ORDER BY milestone_count
  LIMIT 1;

  RETURN jsonb_build_object(
    'code', v_code,
    'totalReferrals', COALESCE(v_milestone.total_referrals, 0),
    'activatedReferrals', COALESCE(v_milestone.activated_referrals, 0),
    'shareCount', COALESCE(v_milestone.share_count, 0),
    'currentTier', v_milestone.current_tier,
    'currentBadge', jsonb_build_object(
      'type', v_badge_info.badge_type,
      'name', v_badge_info.badge_name,
      'nameSw', v_badge_info.badge_name_sw,
      'icon', v_badge_info.icon
    ),
    'nextBadge', CASE WHEN v_next_badge.badge_type IS NOT NULL THEN
      jsonb_build_object(
        'type', v_next_badge.badge_type,
        'name', v_next_badge.badge_name,
        'nameSw', v_next_badge.badge_name_sw,
        'icon', v_next_badge.icon,
        'sharesNeeded', v_next_badge.min_shares - COALESCE(v_milestone.share_count, 0)
      )
    ELSE NULL END,
    'nextMilestone', CASE WHEN v_next_milestone.milestone_count IS NOT NULL THEN
      jsonb_build_object(
        'count', v_next_milestone.milestone_count,
        'pointsReward', v_next_milestone.points_reward,
        'physicalReward', v_next_milestone.physical_reward,
        'activationsNeeded', v_next_milestone.milestone_count - COALESCE(v_milestone.activated_referrals, 0)
      )
    ELSE NULL END,
    'totalXpEarned', COALESCE(v_milestone.total_xp_earned, 0),
    'totalPointsEarned', COALESCE(v_milestone.total_points_earned, 0),
    'milestones', jsonb_build_object(
      'milestone3Claimed', v_milestone.milestone_3_claimed,
      'milestone10Claimed', v_milestone.milestone_10_claimed,
      'milestone25Claimed', v_milestone.milestone_25_claimed,
      'milestone50Claimed', v_milestone.milestone_50_claimed,
      'milestone100Claimed', v_milestone.milestone_100_claimed
    )
  );
END;
$$;

-- =============================================
-- PART 10: GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION record_referral_share TO authenticated;
GRANT EXECUTE ON FUNCTION activate_referral_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION check_referral_milestones_enhanced TO authenticated;
GRANT EXECUTE ON FUNCTION get_referral_dashboard TO authenticated;
