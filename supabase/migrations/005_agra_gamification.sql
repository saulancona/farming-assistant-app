-- =====================================================
-- AgroAfrica Agra Entrepreneur Gamification System
-- Migration 005: Complete Gamification Features
-- =====================================================

-- =====================================================
-- PART 1: USER POINTS (Separate from XP)
-- =====================================================

-- User Points Balance (redeemable currency separate from XP)
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL CHECK (total_points >= 0),
  lifetime_points INTEGER DEFAULT 0 NOT NULL CHECK (lifetime_points >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Points Transaction History
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem')),
  source TEXT NOT NULL, -- 'referral', 'challenge', 'mission', 'photo', 'quiz', 'shop_refund'
  reference_id UUID, -- Reference to the source item
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_points_transactions_user ON points_transactions(user_id);
CREATE INDEX idx_points_transactions_created ON points_transactions(created_at DESC);

-- =====================================================
-- PART 2: FARMER SCORE (Trust Score)
-- =====================================================

CREATE TYPE farmer_score_tier AS ENUM ('bronze', 'silver', 'gold', 'champion');

CREATE TABLE IF NOT EXISTS farmer_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  learning_score DECIMAL(5,2) DEFAULT 0 CHECK (learning_score >= 0 AND learning_score <= 25),
  mission_score DECIMAL(5,2) DEFAULT 0 CHECK (mission_score >= 0 AND mission_score <= 25),
  engagement_score DECIMAL(5,2) DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 25),
  reliability_score DECIMAL(5,2) DEFAULT 0 CHECK (reliability_score >= 0 AND reliability_score <= 25),
  total_score DECIMAL(5,2) DEFAULT 0 CHECK (total_score >= 0 AND total_score <= 100),
  tier farmer_score_tier DEFAULT 'bronze',
  photo_uploads_count INTEGER DEFAULT 0,
  data_quality_score DECIMAL(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farmer_scores_tier ON farmer_scores(tier);
CREATE INDEX idx_farmer_scores_total ON farmer_scores(total_score DESC);

-- =====================================================
-- PART 3: REFERRAL SYSTEM
-- =====================================================

CREATE TYPE referral_status AS ENUM ('pending', 'activated', 'rewarded');
CREATE TYPE referral_tier AS ENUM ('starter', 'recruiter', 'champion', 'legend');

-- Referral Codes (each user gets one unique code)
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  code VARCHAR(12) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_codes_code ON referral_codes(code);

-- Referral Tracking
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referral_code VARCHAR(12) NOT NULL,
  status referral_status DEFAULT 'pending',
  activation_action TEXT, -- First action taken by referred user
  referrer_xp_awarded INTEGER DEFAULT 0,
  referrer_points_awarded INTEGER DEFAULT 0,
  referred_xp_awarded INTEGER DEFAULT 0,
  referred_points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  rewarded_at TIMESTAMPTZ
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_status ON referrals(status);

-- Referral Milestones
CREATE TABLE IF NOT EXISTS referral_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  activated_referrals INTEGER DEFAULT 0,
  current_tier referral_tier DEFAULT 'starter',
  milestone_3_claimed BOOLEAN DEFAULT FALSE,
  milestone_10_claimed BOOLEAN DEFAULT FALSE,
  milestone_25_claimed BOOLEAN DEFAULT FALSE,
  milestone_50_claimed BOOLEAN DEFAULT FALSE,
  milestone_100_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PART 4: SEASONAL MISSIONS
-- =====================================================

CREATE TYPE mission_status AS ENUM ('active', 'completed', 'failed', 'abandoned');
CREATE TYPE mission_step_status AS ENUM ('pending', 'in_progress', 'completed', 'skipped');

-- Mission Templates
CREATE TABLE IF NOT EXISTS seasonal_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_sw VARCHAR(255), -- Swahili name
  description TEXT NOT NULL,
  description_sw TEXT, -- Swahili description
  crop_type VARCHAR(100), -- NULL means applicable to all crops
  season VARCHAR(50), -- 'long_rains', 'short_rains', 'dry_season', 'all'
  steps JSONB NOT NULL DEFAULT '[]', -- Array of step definitions
  xp_reward INTEGER DEFAULT 50,
  points_reward INTEGER DEFAULT 30,
  badge_id UUID REFERENCES achievements(id),
  duration_days INTEGER DEFAULT 90,
  difficulty VARCHAR(20) DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_seasonal_missions_crop ON seasonal_missions(crop_type);
CREATE INDEX idx_seasonal_missions_active ON seasonal_missions(is_active);

-- User Mission Progress
CREATE TABLE IF NOT EXISTS user_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  mission_id UUID REFERENCES seasonal_missions(id) ON DELETE CASCADE NOT NULL,
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  status mission_status DEFAULT 'active',
  current_step INTEGER DEFAULT 0,
  total_steps INTEGER NOT NULL,
  progress_percentage DECIMAL(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  target_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  xp_earned INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, mission_id, field_id)
);

CREATE INDEX idx_user_missions_user ON user_missions(user_id);
CREATE INDEX idx_user_missions_status ON user_missions(status);
CREATE INDEX idx_user_missions_field ON user_missions(field_id);

-- Mission Step Progress
CREATE TABLE IF NOT EXISTS mission_step_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_mission_id UUID REFERENCES user_missions(id) ON DELETE CASCADE NOT NULL,
  step_index INTEGER NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  step_description TEXT,
  status mission_step_status DEFAULT 'pending',
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  evidence_photo_url TEXT,
  notes TEXT,
  xp_awarded INTEGER DEFAULT 0,
  UNIQUE(user_mission_id, step_index)
);

CREATE INDEX idx_mission_step_progress_mission ON mission_step_progress(user_mission_id);

-- =====================================================
-- PART 5: WEEKLY CHALLENGES
-- =====================================================

CREATE TYPE challenge_type AS ENUM ('photo', 'activity', 'learning', 'marketplace', 'community');
CREATE TYPE challenge_status AS ENUM ('active', 'completed', 'expired');

-- Weekly Challenge Templates
CREATE TABLE IF NOT EXISTS weekly_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_sw VARCHAR(255),
  description TEXT NOT NULL,
  description_sw TEXT,
  challenge_type challenge_type NOT NULL,
  target_action VARCHAR(100) NOT NULL, -- e.g., 'upload_photo', 'check_prices', 'complete_article'
  target_count INTEGER DEFAULT 1,
  xp_reward INTEGER DEFAULT 20,
  points_reward INTEGER DEFAULT 10,
  badge_id UUID REFERENCES achievements(id),
  start_date DATE,
  end_date DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern VARCHAR(50), -- 'weekly', 'monthly'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_weekly_challenges_dates ON weekly_challenges(start_date, end_date);
CREATE INDEX idx_weekly_challenges_type ON weekly_challenges(challenge_type);
CREATE INDEX idx_weekly_challenges_active ON weekly_challenges(is_active);

-- User Challenge Progress
CREATE TABLE IF NOT EXISTS user_challenge_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES weekly_challenges(id) ON DELETE CASCADE NOT NULL,
  current_progress INTEGER DEFAULT 0,
  target_progress INTEGER NOT NULL,
  status challenge_status DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  xp_awarded INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX idx_user_challenge_progress_user ON user_challenge_progress(user_id);
CREATE INDEX idx_user_challenge_progress_status ON user_challenge_progress(status);

-- =====================================================
-- PART 6: PHOTO SUBMISSIONS
-- =====================================================

CREATE TYPE photo_type AS ENUM ('pest', 'crop', 'soil', 'harvest', 'field', 'other');

CREATE TABLE IF NOT EXISTS photo_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  challenge_id UUID REFERENCES weekly_challenges(id) ON DELETE SET NULL,
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  photo_type photo_type DEFAULT 'other',
  ai_confidence_score DECIMAL(5,2),
  ai_detected_issue TEXT,
  ai_recommendations JSONB,
  xp_awarded INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_photo_submissions_user ON photo_submissions(user_id);
CREATE INDEX idx_photo_submissions_type ON photo_submissions(photo_type);
CREATE INDEX idx_photo_submissions_challenge ON photo_submissions(challenge_id);

-- =====================================================
-- PART 7: REWARDS SHOP
-- =====================================================

CREATE TYPE reward_category AS ENUM ('seeds', 'fertilizer', 'tools', 'vouchers', 'services');
CREATE TYPE redemption_status AS ENUM ('pending', 'approved', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');

-- Reward Items Catalog
CREATE TABLE IF NOT EXISTS reward_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  name_sw VARCHAR(255),
  description TEXT,
  description_sw TEXT,
  category reward_category NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  stock_quantity INTEGER DEFAULT -1, -- -1 means unlimited
  image_url TEXT,
  partner_name VARCHAR(255), -- e.g., "Twiga Foods", "Kenya Seed"
  terms_conditions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reward_items_category ON reward_items(category);
CREATE INDEX idx_reward_items_active ON reward_items(is_active);
CREATE INDEX idx_reward_items_cost ON reward_items(points_cost);

-- User Redemptions
CREATE TABLE IF NOT EXISTS user_redemptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  item_id UUID REFERENCES reward_items(id) ON DELETE SET NULL NOT NULL,
  quantity INTEGER DEFAULT 1,
  points_spent INTEGER NOT NULL,
  status redemption_status DEFAULT 'pending',
  redemption_code VARCHAR(20),
  delivery_address TEXT,
  delivery_phone VARCHAR(20),
  delivery_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE INDEX idx_user_redemptions_user ON user_redemptions(user_id);
CREATE INDEX idx_user_redemptions_status ON user_redemptions(status);
CREATE INDEX idx_user_redemptions_created ON user_redemptions(created_at DESC);

-- =====================================================
-- PART 8: DATABASE FUNCTIONS
-- =====================================================

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code(p_user_id UUID)
RETURNS VARCHAR(12) AS $$
DECLARE
  v_code VARCHAR(12);
  v_exists BOOLEAN;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code FROM referral_codes WHERE user_id = p_user_id;
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;

  -- Generate new unique code
  LOOP
    v_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 8));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = v_code) INTO v_exists;
    EXIT WHEN NOT v_exists;
  END LOOP;

  -- Insert the code
  INSERT INTO referral_codes (user_id, code) VALUES (p_user_id, v_code);

  RETURN v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process referral
CREATE OR REPLACE FUNCTION process_referral(p_code VARCHAR(12), p_new_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_referrer_id UUID;
  v_result JSONB;
BEGIN
  -- Find referrer
  SELECT user_id INTO v_referrer_id FROM referral_codes WHERE code = UPPER(p_code);

  IF v_referrer_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  IF v_referrer_id = p_new_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot refer yourself');
  END IF;

  -- Check if user already referred
  IF EXISTS(SELECT 1 FROM referrals WHERE referred_id = p_new_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User already has a referrer');
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
  VALUES (v_referrer_id, p_new_user_id, UPPER(p_code), 'pending');

  -- Update referrer's milestone count
  INSERT INTO referral_milestones (user_id, total_referrals)
  VALUES (v_referrer_id, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    total_referrals = referral_milestones.total_referrals + 1,
    updated_at = NOW();

  RETURN jsonb_build_object('success', true, 'referrer_id', v_referrer_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to activate referral (when referred user takes first action)
CREATE OR REPLACE FUNCTION activate_referral(p_user_id UUID, p_action TEXT)
RETURNS JSONB AS $$
DECLARE
  v_referral referrals%ROWTYPE;
  v_referrer_xp INTEGER := 3;
  v_referrer_points INTEGER := 5;
  v_referred_xp INTEGER := 5;
  v_referred_points INTEGER := 10;
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
    updated_at = NOW()
  WHERE user_id = v_referral.referrer_id;

  -- Award XP to referrer (using correct signature: user_id, action, action_sw, xp_amount, metadata)
  IF v_referral.referrer_id IS NOT NULL THEN
    PERFORM award_xp(v_referral.referrer_id, 'referral_bonus', 'Bonasi ya rufaa', v_referrer_xp, '{}');
    PERFORM award_points(v_referral.referrer_id, v_referrer_points, 'referral', v_referral.id, 'Referral activation reward');
  END IF;

  -- Award XP and points to referred user
  PERFORM award_xp(p_user_id, 'welcome_bonus', 'Bonasi ya karibu', v_referred_xp, '{}');
  PERFORM award_points(p_user_id, v_referred_points, 'referral', v_referral.id, 'Welcome bonus for joining via referral');

  RETURN jsonb_build_object(
    'success', true,
    'referrer_id', v_referral.referrer_id,
    'xp_awarded', v_referred_xp,
    'points_awarded', v_referred_points
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to award points
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_amount INTEGER,
  p_source TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_new_total INTEGER;
BEGIN
  -- Create or update user_points
  INSERT INTO user_points (user_id, total_points, lifetime_points)
  VALUES (p_user_id, p_amount, p_amount)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_points.total_points + p_amount,
    lifetime_points = user_points.lifetime_points + p_amount,
    updated_at = NOW()
  RETURNING total_points INTO v_new_total;

  -- Log transaction
  INSERT INTO points_transactions (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, p_amount, 'earn', p_source, p_reference_id, p_description);

  RETURN jsonb_build_object('success', true, 'new_total', v_new_total, 'amount_awarded', p_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to redeem points for shop item
CREATE OR REPLACE FUNCTION redeem_points(
  p_user_id UUID,
  p_item_id UUID,
  p_quantity INTEGER DEFAULT 1,
  p_delivery_address TEXT DEFAULT NULL,
  p_delivery_phone VARCHAR(20) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_item reward_items%ROWTYPE;
  v_user_points INTEGER;
  v_total_cost INTEGER;
  v_redemption_code VARCHAR(20);
  v_redemption_id UUID;
BEGIN
  -- Get item details
  SELECT * INTO v_item FROM reward_items WHERE id = p_item_id AND is_active = TRUE;

  IF v_item.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Item not found or not available');
  END IF;

  -- Check stock
  IF v_item.stock_quantity != -1 AND v_item.stock_quantity < p_quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock');
  END IF;

  v_total_cost := v_item.points_cost * p_quantity;

  -- Check user points
  SELECT total_points INTO v_user_points FROM user_points WHERE user_id = p_user_id;

  IF v_user_points IS NULL OR v_user_points < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient points', 'required', v_total_cost, 'available', COALESCE(v_user_points, 0));
  END IF;

  -- Generate redemption code
  v_redemption_code := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || CLOCK_TIMESTAMP()::TEXT) FROM 1 FOR 10));

  -- Deduct points
  UPDATE user_points SET
    total_points = total_points - v_total_cost,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Log transaction
  INSERT INTO points_transactions (user_id, amount, transaction_type, source, reference_id, description)
  VALUES (p_user_id, -v_total_cost, 'redeem', 'shop', p_item_id, 'Redeemed: ' || v_item.name);

  -- Update stock if not unlimited
  IF v_item.stock_quantity != -1 THEN
    UPDATE reward_items SET stock_quantity = stock_quantity - p_quantity WHERE id = p_item_id;
  END IF;

  -- Create redemption record
  INSERT INTO user_redemptions (user_id, item_id, quantity, points_spent, redemption_code, delivery_address, delivery_phone)
  VALUES (p_user_id, p_item_id, p_quantity, v_total_cost, v_redemption_code, p_delivery_address, p_delivery_phone)
  RETURNING id INTO v_redemption_id;

  RETURN jsonb_build_object(
    'success', true,
    'redemption_id', v_redemption_id,
    'redemption_code', v_redemption_code,
    'points_spent', v_total_cost
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate farmer score
CREATE OR REPLACE FUNCTION calculate_farmer_score(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_learning_score DECIMAL(5,2) := 0;
  v_mission_score DECIMAL(5,2) := 0;
  v_engagement_score DECIMAL(5,2) := 0;
  v_reliability_score DECIMAL(5,2) := 0;
  v_total_score DECIMAL(5,2);
  v_tier farmer_score_tier;
  v_articles_completed INTEGER;
  v_videos_completed INTEGER;
  v_missions_completed INTEGER;
  v_current_streak INTEGER;
  v_photo_count INTEGER;
  v_profile user_rewards_profiles%ROWTYPE;
BEGIN
  -- Get user rewards profile
  SELECT * INTO v_profile FROM user_rewards_profiles WHERE user_id = p_user_id;

  IF v_profile.user_id IS NULL THEN
    v_profile.articles_completed := 0;
    v_profile.videos_completed := 0;
  END IF;

  -- Get daily streak
  SELECT COALESCE(current_streak, 0) INTO v_current_streak
  FROM daily_streaks WHERE user_id = p_user_id;

  -- Get missions completed
  SELECT COUNT(*) INTO v_missions_completed
  FROM user_missions WHERE user_id = p_user_id AND status = 'completed';

  -- Get photo count
  SELECT COUNT(*) INTO v_photo_count
  FROM photo_submissions WHERE user_id = p_user_id;

  -- Calculate Learning Score (0-25)
  -- Formula: (articles + videos*1.5) / 50 * 25, capped at 25
  v_learning_score := LEAST(
    ((COALESCE(v_profile.articles_completed, 0) + COALESCE(v_profile.videos_completed, 0) * 1.5) / 50.0) * 25,
    25
  );

  -- Calculate Mission Score (0-25)
  -- Formula: completedMissions / 10 * 25, capped at 25
  v_mission_score := LEAST((v_missions_completed / 10.0) * 25, 25);

  -- Calculate Engagement Score (0-25)
  -- Formula: min(streak, 30) / 30 * 15 + daily_actions / 5 * 10
  v_engagement_score := LEAST(
    (LEAST(v_current_streak, 30) / 30.0) * 15 +
    (COALESCE(v_profile.daily_actions, 0) / 5.0) * 10,
    25
  );

  -- Calculate Reliability Score (0-25)
  -- Formula: data_quality + photo_uploads/10*5 + base_10
  v_reliability_score := LEAST(
    10 + (v_photo_count / 10.0) * 5 + 5, -- Base 10, photo bonus, quality bonus
    25
  );

  -- Calculate Total Score
  v_total_score := v_learning_score + v_mission_score + v_engagement_score + v_reliability_score;

  -- Determine Tier
  IF v_total_score >= 91 THEN
    v_tier := 'champion';
  ELSIF v_total_score >= 71 THEN
    v_tier := 'gold';
  ELSIF v_total_score >= 41 THEN
    v_tier := 'silver';
  ELSE
    v_tier := 'bronze';
  END IF;

  -- Upsert farmer score
  INSERT INTO farmer_scores (
    user_id, learning_score, mission_score, engagement_score,
    reliability_score, total_score, tier, photo_uploads_count, updated_at
  ) VALUES (
    p_user_id, v_learning_score, v_mission_score, v_engagement_score,
    v_reliability_score, v_total_score, v_tier, v_photo_count, NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    learning_score = v_learning_score,
    mission_score = v_mission_score,
    engagement_score = v_engagement_score,
    reliability_score = v_reliability_score,
    total_score = v_total_score,
    tier = v_tier,
    photo_uploads_count = v_photo_count,
    updated_at = NOW();

  RETURN jsonb_build_object(
    'learning_score', v_learning_score,
    'mission_score', v_mission_score,
    'engagement_score', v_engagement_score,
    'reliability_score', v_reliability_score,
    'total_score', v_total_score,
    'tier', v_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to start a mission
CREATE OR REPLACE FUNCTION start_mission(
  p_user_id UUID,
  p_mission_id UUID,
  p_field_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_mission seasonal_missions%ROWTYPE;
  v_user_mission_id UUID;
  v_steps JSONB;
  v_step JSONB;
  v_step_index INTEGER := 0;
BEGIN
  -- Get mission
  SELECT * INTO v_mission FROM seasonal_missions WHERE id = p_mission_id AND is_active = TRUE;

  IF v_mission.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission not found or not active');
  END IF;

  -- Check if already active
  IF EXISTS(
    SELECT 1 FROM user_missions
    WHERE user_id = p_user_id AND mission_id = p_mission_id AND status = 'active'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Mission already active');
  END IF;

  v_steps := v_mission.steps;

  -- Create user mission
  INSERT INTO user_missions (
    user_id, mission_id, field_id, status, current_step,
    total_steps, target_date
  ) VALUES (
    p_user_id, p_mission_id, p_field_id, 'active', 0,
    jsonb_array_length(v_steps),
    NOW() + (v_mission.duration_days || ' days')::INTERVAL
  )
  RETURNING id INTO v_user_mission_id;

  -- Create step progress records
  FOR v_step IN SELECT * FROM jsonb_array_elements(v_steps)
  LOOP
    INSERT INTO mission_step_progress (
      user_mission_id, step_index, step_name, step_description,
      due_date, status
    ) VALUES (
      v_user_mission_id, v_step_index,
      v_step->>'name',
      v_step->>'description',
      NOW() + ((v_step->>'day_offset')::INTEGER || ' days')::INTERVAL,
      CASE WHEN v_step_index = 0 THEN 'in_progress' ELSE 'pending' END
    );
    v_step_index := v_step_index + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'user_mission_id', v_user_mission_id,
    'total_steps', jsonb_array_length(v_steps)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a mission step
CREATE OR REPLACE FUNCTION complete_mission_step(
  p_user_mission_id UUID,
  p_step_index INTEGER,
  p_evidence_photo_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_mission user_missions%ROWTYPE;
  v_mission seasonal_missions%ROWTYPE;
  v_step_xp INTEGER := 5;
  v_total_steps INTEGER;
  v_completed_steps INTEGER;
  v_new_progress DECIMAL(5,2);
BEGIN
  -- Get user mission
  SELECT * INTO v_user_mission FROM user_missions WHERE id = p_user_mission_id AND status = 'active';

  IF v_user_mission.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Active mission not found');
  END IF;

  -- Complete the step
  UPDATE mission_step_progress SET
    status = 'completed',
    completed_at = NOW(),
    evidence_photo_url = COALESCE(p_evidence_photo_url, evidence_photo_url),
    notes = COALESCE(p_notes, notes),
    xp_awarded = v_step_xp
  WHERE user_mission_id = p_user_mission_id AND step_index = p_step_index AND status != 'completed';

  -- Award XP for step completion (using correct signature: user_id, action, action_sw, xp_amount, metadata)
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

  -- Update user mission progress
  UPDATE user_missions SET
    current_step = v_completed_steps,
    progress_percentage = v_new_progress,
    xp_earned = xp_earned + v_step_xp + CASE WHEN p_evidence_photo_url IS NOT NULL THEN 5 ELSE 0 END
  WHERE id = p_user_mission_id;

  -- Start next step if available
  UPDATE mission_step_progress SET status = 'in_progress'
  WHERE user_mission_id = p_user_mission_id AND step_index = p_step_index + 1 AND status = 'pending';

  -- Check if mission completed
  IF v_completed_steps >= v_user_mission.total_steps THEN
    -- Get mission for rewards
    SELECT * INTO v_mission FROM seasonal_missions WHERE id = v_user_mission.mission_id;

    -- Complete mission
    UPDATE user_missions SET
      status = 'completed',
      completed_at = NOW(),
      progress_percentage = 100,
      xp_earned = xp_earned + v_mission.xp_reward,
      points_earned = v_mission.points_reward
    WHERE id = p_user_mission_id;

    -- Award completion rewards (using correct signature: user_id, action, action_sw, xp_amount, metadata)
    PERFORM award_xp(v_user_mission.user_id, 'mission_complete', 'Misheni imekamilika: ' || v_mission.name, v_mission.xp_reward, '{}');
    PERFORM award_points(v_user_mission.user_id, v_mission.points_reward, 'mission', v_user_mission.mission_id, 'Mission completion reward');

    -- Recalculate farmer score
    PERFORM calculate_farmer_score(v_user_mission.user_id);

    RETURN jsonb_build_object(
      'success', true,
      'mission_completed', true,
      'xp_awarded', v_mission.xp_reward + v_step_xp,
      'points_awarded', v_mission.points_reward
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'mission_completed', false,
    'progress', v_new_progress,
    'xp_awarded', v_step_xp
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update challenge progress
CREATE OR REPLACE FUNCTION update_challenge_progress(
  p_user_id UUID,
  p_action TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_challenge weekly_challenges%ROWTYPE;
  v_progress user_challenge_progress%ROWTYPE;
  v_completed_count INTEGER := 0;
BEGIN
  -- Find active challenges matching this action
  FOR v_challenge IN
    SELECT * FROM weekly_challenges
    WHERE target_action = p_action
    AND is_active = TRUE
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  LOOP
    -- Get or create progress
    INSERT INTO user_challenge_progress (user_id, challenge_id, target_progress, status)
    VALUES (p_user_id, v_challenge.id, v_challenge.target_count, 'active')
    ON CONFLICT (user_id, challenge_id) DO NOTHING;

    -- Update progress
    UPDATE user_challenge_progress SET
      current_progress = LEAST(current_progress + p_increment, target_progress)
    WHERE user_id = p_user_id AND challenge_id = v_challenge.id AND status = 'active'
    RETURNING * INTO v_progress;

    -- Check completion
    IF v_progress.current_progress >= v_progress.target_progress AND v_progress.status = 'active' THEN
      UPDATE user_challenge_progress SET
        status = 'completed',
        completed_at = NOW(),
        xp_awarded = v_challenge.xp_reward,
        points_awarded = v_challenge.points_reward
      WHERE id = v_progress.id;

      -- Award rewards (using correct signature: user_id, action, action_sw, xp_amount, metadata)
      PERFORM award_xp(p_user_id, 'challenge_complete', 'Changamoto imekamilika: ' || v_challenge.name, v_challenge.xp_reward, '{}');
      PERFORM award_points(p_user_id, v_challenge.points_reward, 'challenge', v_challenge.id, 'Challenge completion reward');

      v_completed_count := v_completed_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'challenges_completed', v_completed_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and claim referral milestones
CREATE OR REPLACE FUNCTION check_referral_milestones(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_milestone referral_milestones%ROWTYPE;
  v_points_awarded INTEGER := 0;
  v_new_tier referral_tier;
  v_milestones_claimed TEXT[] := '{}';
BEGIN
  SELECT * INTO v_milestone FROM referral_milestones WHERE user_id = p_user_id;

  IF v_milestone.user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No referral record found');
  END IF;

  -- Check 3 referrals milestone
  IF v_milestone.activated_referrals >= 3 AND NOT v_milestone.milestone_3_claimed THEN
    PERFORM award_points(p_user_id, 50, 'referral_milestone', NULL, '3 referrals milestone');
    UPDATE referral_milestones SET milestone_3_claimed = TRUE WHERE user_id = p_user_id;
    v_points_awarded := v_points_awarded + 50;
    v_milestones_claimed := array_append(v_milestones_claimed, '3_referrals');
  END IF;

  -- Check 10 referrals milestone
  IF v_milestone.activated_referrals >= 10 AND NOT v_milestone.milestone_10_claimed THEN
    PERFORM award_points(p_user_id, 150, 'referral_milestone', NULL, '10 referrals milestone');
    UPDATE referral_milestones SET milestone_10_claimed = TRUE, current_tier = 'recruiter' WHERE user_id = p_user_id;
    v_points_awarded := v_points_awarded + 150;
    v_milestones_claimed := array_append(v_milestones_claimed, '10_referrals');
    v_new_tier := 'recruiter';
  END IF;

  -- Check 25 referrals milestone
  IF v_milestone.activated_referrals >= 25 AND NOT v_milestone.milestone_25_claimed THEN
    PERFORM award_points(p_user_id, 400, 'referral_milestone', NULL, '25 referrals milestone');
    UPDATE referral_milestones SET milestone_25_claimed = TRUE WHERE user_id = p_user_id;
    v_points_awarded := v_points_awarded + 400;
    v_milestones_claimed := array_append(v_milestones_claimed, '25_referrals');
  END IF;

  -- Check 50 referrals milestone
  IF v_milestone.activated_referrals >= 50 AND NOT v_milestone.milestone_50_claimed THEN
    PERFORM award_points(p_user_id, 1000, 'referral_milestone', NULL, '50 referrals milestone');
    UPDATE referral_milestones SET milestone_50_claimed = TRUE, current_tier = 'champion' WHERE user_id = p_user_id;
    v_points_awarded := v_points_awarded + 1000;
    v_milestones_claimed := array_append(v_milestones_claimed, '50_referrals');
    v_new_tier := 'champion';
  END IF;

  -- Check 100 referrals milestone
  IF v_milestone.activated_referrals >= 100 AND NOT v_milestone.milestone_100_claimed THEN
    PERFORM award_points(p_user_id, 2500, 'referral_milestone', NULL, '100 referrals milestone');
    UPDATE referral_milestones SET milestone_100_claimed = TRUE, current_tier = 'legend' WHERE user_id = p_user_id;
    v_points_awarded := v_points_awarded + 2500;
    v_milestones_claimed := array_append(v_milestones_claimed, '100_referrals');
    v_new_tier := 'legend';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_points_awarded,
    'milestones_claimed', v_milestones_claimed,
    'new_tier', v_new_tier
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PART 9: ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE farmer_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE seasonal_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE mission_step_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE photo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_redemptions ENABLE ROW LEVEL SECURITY;

-- User Points policies
CREATE POLICY "Users can view own points" ON user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can manage points" ON user_points FOR ALL USING (true);

-- Points Transactions policies
CREATE POLICY "Users can view own transactions" ON points_transactions FOR SELECT USING (auth.uid() = user_id);

-- Farmer Scores policies
CREATE POLICY "Users can view all farmer scores" ON farmer_scores FOR SELECT USING (true);
CREATE POLICY "Users can update own score" ON farmer_scores FOR UPDATE USING (auth.uid() = user_id);

-- Referral Codes policies
CREATE POLICY "Users can view own referral code" ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Anyone can lookup referral codes" ON referral_codes FOR SELECT USING (true);

-- Referrals policies
CREATE POLICY "Users can view own referrals" ON referrals FOR SELECT USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Referral Milestones policies
CREATE POLICY "Users can view own milestones" ON referral_milestones FOR SELECT USING (auth.uid() = user_id);

-- Seasonal Missions policies
CREATE POLICY "Anyone can view active missions" ON seasonal_missions FOR SELECT USING (is_active = true);

-- User Missions policies
CREATE POLICY "Users can view own missions" ON user_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON user_missions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON user_missions FOR UPDATE USING (auth.uid() = user_id);

-- Mission Step Progress policies
CREATE POLICY "Users can view own step progress" ON mission_step_progress FOR SELECT
  USING (EXISTS(SELECT 1 FROM user_missions WHERE id = user_mission_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own step progress" ON mission_step_progress FOR UPDATE
  USING (EXISTS(SELECT 1 FROM user_missions WHERE id = user_mission_id AND user_id = auth.uid()));

-- Weekly Challenges policies
CREATE POLICY "Anyone can view active challenges" ON weekly_challenges FOR SELECT USING (is_active = true);

-- User Challenge Progress policies
CREATE POLICY "Users can view own challenge progress" ON user_challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own challenge progress" ON user_challenge_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own challenge progress" ON user_challenge_progress FOR UPDATE USING (auth.uid() = user_id);

-- Photo Submissions policies
CREATE POLICY "Users can view own photo submissions" ON photo_submissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own photo submissions" ON photo_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Reward Items policies
CREATE POLICY "Anyone can view active reward items" ON reward_items FOR SELECT USING (is_active = true);

-- User Redemptions policies
CREATE POLICY "Users can view own redemptions" ON user_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own redemptions" ON user_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- PART 10: SEED DATA
-- =====================================================

-- Insert sample seasonal missions
INSERT INTO seasonal_missions (name, name_sw, description, description_sw, crop_type, season, steps, xp_reward, points_reward, duration_days, difficulty) VALUES
(
  'Maize Season Success',
  'Mafanikio ya Msimu wa Mahindi',
  'Complete your maize growing cycle from soil preparation to harvest',
  'Kamilisha mzunguko wako wa kupanda mahindi kutoka maandalizi ya udongo hadi mavuno',
  'maize',
  'long_rains',
  '[
    {"name": "Prepare Soil", "name_sw": "Andaa Udongo", "description": "Clear field and prepare soil for planting", "day_offset": 0},
    {"name": "Plant Seeds", "name_sw": "Panda Mbegu", "description": "Plant maize seeds at proper spacing", "day_offset": 7},
    {"name": "First Fertilizer", "name_sw": "Mbolea ya Kwanza", "description": "Apply basal fertilizer", "day_offset": 21},
    {"name": "Pest Inspection", "name_sw": "Ukaguzi wa Wadudu", "description": "Check for pests and diseases", "day_offset": 35},
    {"name": "Top Dressing", "name_sw": "Mbolea ya Juu", "description": "Apply top dressing fertilizer", "day_offset": 50},
    {"name": "Monitor Growth", "name_sw": "Fuatilia Ukuaji", "description": "Monitor crop development", "day_offset": 70},
    {"name": "Harvest", "name_sw": "Vuna", "description": "Harvest mature maize", "day_offset": 90}
  ]'::jsonb,
  50, 30, 90, 'medium'
),
(
  'Bean Growing Quest',
  'Safari ya Kupanda Maharage',
  'Grow beans from planting to harvest with best practices',
  'Panda maharage kutoka kupanda hadi kuvuna kwa mbinu bora',
  'beans',
  'short_rains',
  '[
    {"name": "Prepare Field", "name_sw": "Andaa Shamba", "description": "Prepare your field for beans", "day_offset": 0},
    {"name": "Sow Seeds", "name_sw": "Panda Mbegu", "description": "Sow bean seeds in rows", "day_offset": 5},
    {"name": "Weed Control", "name_sw": "Ondoa Magugu", "description": "First weeding session", "day_offset": 14},
    {"name": "Apply Fertilizer", "name_sw": "Weka Mbolea", "description": "Apply appropriate fertilizer", "day_offset": 21},
    {"name": "Monitor Pests", "name_sw": "Fuatilia Wadudu", "description": "Check for bean pests", "day_offset": 35},
    {"name": "Harvest Beans", "name_sw": "Vuna Maharage", "description": "Harvest when pods are dry", "day_offset": 60}
  ]'::jsonb,
  40, 25, 60, 'easy'
),
(
  'Tomato Champion',
  'Bingwa wa Nyanya',
  'Master tomato cultivation from transplanting to market',
  'Boresha kilimo cha nyanya kutoka kupandikiza hadi sokoni',
  'tomato',
  'all',
  '[
    {"name": "Prepare Nursery", "name_sw": "Andaa Kitalu", "description": "Prepare seedbed for tomato seedlings", "day_offset": 0},
    {"name": "Transplant Seedlings", "name_sw": "Pandikiza Miche", "description": "Transplant seedlings to main field", "day_offset": 21},
    {"name": "Install Staking", "name_sw": "Weka Tegemeo", "description": "Install stakes for support", "day_offset": 35},
    {"name": "Apply Fungicide", "name_sw": "Weka Dawa", "description": "Preventive disease control", "day_offset": 42},
    {"name": "Pruning", "name_sw": "Pogoa", "description": "Prune suckers for better yield", "day_offset": 49},
    {"name": "Monitor Pests", "name_sw": "Fuatilia Wadudu", "description": "Check for tomato pests", "day_offset": 56},
    {"name": "First Harvest", "name_sw": "Vuna Kwanza", "description": "Harvest first ripe tomatoes", "day_offset": 70},
    {"name": "Continue Harvest", "name_sw": "Endelea Kuvuna", "description": "Continue harvesting", "day_offset": 90}
  ]'::jsonb,
  60, 40, 90, 'hard'
);

-- Insert sample weekly challenges
INSERT INTO weekly_challenges (name, name_sw, description, description_sw, challenge_type, target_action, target_count, xp_reward, points_reward, is_recurring, recurrence_pattern, is_active) VALUES
(
  'Photo Patrol',
  'Doria ya Picha',
  'Upload 3 photos of your crops or pests for AI analysis',
  'Pakia picha 3 za mazao yako au wadudu kwa uchambuzi wa AI',
  'photo',
  'upload_photo',
  3,
  20,
  10,
  true,
  'weekly',
  true
),
(
  'Price Checker',
  'Mkaguzi wa Bei',
  'Check market prices for 4 days this week',
  'Angalia bei za soko kwa siku 4 wiki hii',
  'marketplace',
  'check_prices',
  4,
  15,
  8,
  true,
  'weekly',
  true
),
(
  'Community Voice',
  'Sauti ya Jamii',
  'Share 2 farming tips or questions with the community',
  'Shiriki vidokezo 2 vya kilimo au maswali na jamii',
  'community',
  'community_post',
  2,
  15,
  8,
  true,
  'weekly',
  true
),
(
  'Learning Sprint',
  'Mbio za Kujifunza',
  'Complete 2 learning articles or videos',
  'Kamilisha makala 2 au video za kujifunza',
  'learning',
  'complete_lesson',
  2,
  25,
  12,
  true,
  'weekly',
  true
),
(
  'Task Master',
  'Bwana wa Kazi',
  'Complete 5 farm tasks this week',
  'Kamilisha kazi 5 za shamba wiki hii',
  'activity',
  'complete_task',
  5,
  20,
  10,
  true,
  'weekly',
  true
),
(
  'Field Scout',
  'Skauti wa Shamba',
  'Record observations for 3 different fields',
  'Rekodi uchunguzi wa mashamba 3 tofauti',
  'activity',
  'field_observation',
  3,
  15,
  8,
  true,
  'weekly',
  true
);

-- Insert sample reward items
INSERT INTO reward_items (name, name_sw, description, description_sw, category, points_cost, stock_quantity, partner_name, is_featured, is_active) VALUES
(
  'Maize Seeds (2kg)',
  'Mbegu za Mahindi (2kg)',
  'High-quality certified maize seeds for planting',
  'Mbegu bora za mahindi zilizoidhinishwa kwa kupanda',
  'seeds',
  100,
  50,
  'Kenya Seed Company',
  true,
  true
),
(
  'Bean Seeds (1kg)',
  'Mbegu za Maharage (1kg)',
  'Drought-resistant bean variety seeds',
  'Mbegu za maharage zinazostahimili ukame',
  'seeds',
  75,
  100,
  'Kenya Seed Company',
  false,
  true
),
(
  'NPK Fertilizer Voucher',
  'Vocha ya Mbolea NPK',
  'Redeem for 5kg NPK fertilizer at partner agro-dealers',
  'Beba kwa mbolea ya NPK ya kilo 5 kwa wauzaji washirika',
  'fertilizer',
  150,
  -1,
  'National Cereals Board',
  true,
  true
),
(
  'Organic Compost (10kg)',
  'Mboji Asilia (10kg)',
  'Premium organic compost for soil improvement',
  'Mboji bora ya asili kwa kuboresha udongo',
  'fertilizer',
  120,
  30,
  'Twiga Foods',
  false,
  true
),
(
  'Hand Sprayer',
  'Kinyunyizio cha Mkono',
  'Durable 16L knapsack sprayer for pesticide application',
  'Kinyunyizio cha lita 16 kwa kuweka dawa',
  'tools',
  300,
  20,
  'Flamingo Horticulture',
  true,
  true
),
(
  'Soil Testing Kit',
  'Vifaa vya Kupima Udongo',
  'Basic soil pH and nutrient testing kit',
  'Vifaa vya msingi vya kupima pH na virutubisho vya udongo',
  'tools',
  200,
  15,
  'Agricultural Technology',
  false,
  true
),
(
  'Mobile Airtime (KES 100)',
  'Muda wa Simu (KES 100)',
  'Redeem for mobile airtime on any network',
  'Beba kwa muda wa simu kwenye mtandao wowote',
  'vouchers',
  50,
  -1,
  'Safaricom',
  false,
  true
),
(
  'Agro-dealer Voucher (KES 500)',
  'Vocha ya Duka la Kilimo (KES 500)',
  'Spend at any partner agro-dealer shop',
  'Tumia katika duka lolote la kilimo la mshirika',
  'vouchers',
  250,
  -1,
  'Kenya Farmers Association',
  true,
  true
),
(
  'Drip Irrigation Starter Kit',
  'Vifaa vya Umwagiliaji kwa Matone',
  'Basic drip irrigation setup for small plots',
  'Mpangilio wa msingi wa umwagiliaji kwa matone kwa mashamba madogo',
  'tools',
  500,
  10,
  'Amiran Kenya',
  true,
  true
),
(
  'Crop Insurance Voucher',
  'Vocha ya Bima ya Mazao',
  'Discount voucher for crop insurance premium',
  'Vocha ya punguzo kwa malipo ya bima ya mazao',
  'services',
  400,
  25,
  'ACRE Africa',
  false,
  true
);

-- =====================================================
-- PART 11: HELPER VIEWS
-- =====================================================

-- View for referral leaderboard
CREATE OR REPLACE VIEW referral_leaderboard AS
SELECT
  rm.user_id,
  p.full_name,
  p.avatar_url,
  rm.total_referrals,
  rm.activated_referrals,
  rm.current_tier,
  RANK() OVER (ORDER BY rm.activated_referrals DESC) as rank
FROM referral_milestones rm
LEFT JOIN profiles p ON rm.user_id = p.id
WHERE rm.activated_referrals > 0
ORDER BY rm.activated_referrals DESC;

-- View for active user missions with details
CREATE OR REPLACE VIEW user_missions_with_details AS
SELECT
  um.*,
  sm.name as mission_name,
  sm.name_sw as mission_name_sw,
  sm.description as mission_description,
  sm.crop_type,
  sm.season,
  sm.xp_reward as mission_xp_reward,
  sm.points_reward as mission_points_reward,
  sm.difficulty,
  f.name as field_name
FROM user_missions um
JOIN seasonal_missions sm ON um.mission_id = sm.id
LEFT JOIN fields f ON um.field_id = f.id;

-- View for challenge progress with details
CREATE OR REPLACE VIEW user_challenges_with_details AS
SELECT
  ucp.*,
  wc.name as challenge_name,
  wc.name_sw as challenge_name_sw,
  wc.description as challenge_description,
  wc.challenge_type,
  wc.xp_reward as challenge_xp_reward,
  wc.points_reward as challenge_points_reward,
  wc.start_date,
  wc.end_date
FROM user_challenge_progress ucp
JOIN weekly_challenges wc ON ucp.challenge_id = wc.id;

COMMENT ON TABLE farmer_scores IS 'Composite farmer trust score (0-100) calculated from learning, missions, engagement, and reliability';
COMMENT ON TABLE referrals IS 'Tracks referral relationships between users';
COMMENT ON TABLE seasonal_missions IS 'Crop-specific mission templates with step-by-step guidance';
COMMENT ON TABLE weekly_challenges IS 'Recurring weekly engagement challenges';
COMMENT ON TABLE reward_items IS 'Points shop catalog items';
COMMENT ON TABLE user_points IS 'Redeemable points balance (separate from XP)';
