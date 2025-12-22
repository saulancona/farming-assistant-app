-- Photo Challenges & Diagnostic Rewards System
-- Creates weekly photo challenge themes with AI confidence scoring and "Healthy Farm" badge

-- ============================================
-- 1. PHOTO CHALLENGE THEMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS photo_challenge_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_sw TEXT NOT NULL,
  description TEXT NOT NULL,
  description_sw TEXT NOT NULL,
  theme_type TEXT NOT NULL CHECK (theme_type IN ('pest_patrol', 'nutrient_deficiency', 'disease_detection', 'growth_tracking', 'harvest_quality')),
  target_photos_per_day INTEGER NOT NULL DEFAULT 1,
  duration_days INTEGER NOT NULL DEFAULT 7,
  xp_per_photo INTEGER NOT NULL DEFAULT 5,
  bonus_xp_clear_photo INTEGER NOT NULL DEFAULT 3,
  bonus_xp_early_detection INTEGER NOT NULL DEFAULT 10,
  bonus_xp_correct_id INTEGER NOT NULL DEFAULT 15,
  points_per_photo INTEGER NOT NULL DEFAULT 2,
  badge_id TEXT REFERENCES achievements(id),
  is_recurring BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. WEEKLY PHOTO CHALLENGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_photo_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_id UUID REFERENCES photo_challenge_themes(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  total_participants INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(theme_id, start_date)
);

-- ============================================
-- 3. USER PHOTO CHALLENGE PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_photo_challenge_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES weekly_photo_challenges(id) ON DELETE CASCADE,
  photos_submitted INTEGER DEFAULT 0,
  photos_target INTEGER NOT NULL,
  streak_days INTEGER DEFAULT 0,
  last_photo_date DATE,
  total_xp_earned INTEGER DEFAULT 0,
  total_points_earned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- ============================================
-- 4. PHOTO SUBMISSIONS TABLE (Enhanced)
-- ============================================
CREATE TABLE IF NOT EXISTS challenge_photo_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES weekly_photo_challenges(id) ON DELETE CASCADE,
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  crop_type TEXT,
  photo_url TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('pest', 'disease', 'nutrient', 'growth', 'harvest', 'general')),

  -- AI Analysis Results
  ai_confidence_score DECIMAL(5,2) DEFAULT 0,
  ai_detected_issue TEXT,
  ai_severity TEXT CHECK (ai_severity IN ('none', 'low', 'medium', 'high', 'critical')),
  is_early_detection BOOLEAN DEFAULT false,
  is_clear_photo BOOLEAN DEFAULT false,
  is_correct_identification BOOLEAN DEFAULT false,

  -- Rewards
  base_xp_awarded INTEGER DEFAULT 0,
  bonus_xp_awarded INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,

  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- ============================================
-- 5. USER CROP PHOTO COVERAGE (For Healthy Farm Badge)
-- ============================================
CREATE TABLE IF NOT EXISTS user_crop_photo_coverage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  crop_type TEXT NOT NULL,
  total_photos INTEGER DEFAULT 0,
  last_photo_date DATE,
  has_pest_photo BOOLEAN DEFAULT false,
  has_disease_photo BOOLEAN DEFAULT false,
  has_nutrient_photo BOOLEAN DEFAULT false,
  has_growth_photo BOOLEAN DEFAULT false,
  coverage_complete BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, crop_type)
);

-- ============================================
-- 6. INSERT DEFAULT CHALLENGE THEMES
-- ============================================
INSERT INTO photo_challenge_themes (name, name_sw, description, description_sw, theme_type, target_photos_per_day, duration_days, xp_per_photo, bonus_xp_clear_photo, bonus_xp_early_detection, bonus_xp_correct_id, points_per_photo)
VALUES
  -- Pest Patrol Week
  ('Pest Patrol Week', 'Wiki ya Doria ya Wadudu',
   'Upload 1 photo per day of your crops to check for pests. Early detection saves your harvest!',
   'Pakia picha 1 kwa siku ya mazao yako kuangalia wadudu. Kugundua mapema kunasaidia mavuno yako!',
   'pest_patrol', 1, 7, 5, 3, 10, 15, 2),

  -- Nutrient Deficiency Challenge
  ('Spot the Nutrient Deficiency', 'Gundua Upungufu wa Virutubisho',
   'Learn to identify nutrient deficiencies in your crops through daily photo inspections.',
   'Jifunze kutambua upungufu wa virutubisho katika mazao yako kupitia ukaguzi wa picha za kila siku.',
   'nutrient_deficiency', 1, 7, 5, 3, 10, 15, 2),

  -- Disease Detection Challenge
  ('Disease Detective', 'Mpelelezi wa Magonjwa',
   'Become a disease detective! Upload photos to catch plant diseases early.',
   'Kuwa mpelelezi wa magonjwa! Pakia picha kugundua magonjwa ya mimea mapema.',
   'disease_detection', 1, 7, 6, 4, 12, 18, 3),

  -- Growth Tracking Challenge
  ('Growth Tracker', 'Mfuatiliaji wa Ukuaji',
   'Document your crop growth journey with daily photos. Watch your farm thrive!',
   'Andika safari ya ukuaji wa mazao yako kwa picha za kila siku. Tazama shamba lako likistawi!',
   'growth_tracking', 1, 7, 4, 2, 5, 8, 2),

  -- Harvest Quality Challenge
  ('Harvest Heroes', 'Mashujaa wa Mavuno',
   'Share photos of your harvest quality. Learn what makes a great harvest!',
   'Shiriki picha za ubora wa mavuno yako. Jifunze nini kinachofanya mavuno mazuri!',
   'harvest_quality', 1, 5, 6, 3, 8, 12, 3)
ON CONFLICT DO NOTHING;

-- ============================================
-- 7. CREATE HEALTHY FARM BADGE
-- ============================================
INSERT INTO achievements (
  id, name, name_sw, description, description_sw,
  category, xp_reward, icon, requirement_type, requirement_value
)
VALUES (
  'healthy_farm_guardian',
  'Healthy Farm Guardian', 'Mlezi wa Shamba Lenye Afya',
  'Submitted diagnostic photos for all your crops - a true farm health champion!',
  'Umewasilisha picha za uchunguzi kwa mazao yako yote - bingwa wa kweli wa afya ya shamba!',
  'farming', 100, '🏥', 'photo_coverage', 1
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 8. FUNCTION: Submit Challenge Photo
-- ============================================
CREATE OR REPLACE FUNCTION submit_challenge_photo(
  p_user_id UUID,
  p_challenge_id UUID,
  p_field_id UUID,
  p_crop_type TEXT,
  p_photo_url TEXT,
  p_photo_type TEXT,
  p_ai_confidence DECIMAL DEFAULT 0,
  p_ai_issue TEXT DEFAULT NULL,
  p_ai_severity TEXT DEFAULT 'none'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_theme photo_challenge_themes%ROWTYPE;
  v_challenge weekly_photo_challenges%ROWTYPE;
  v_progress user_photo_challenge_progress%ROWTYPE;
  v_base_xp INTEGER := 0;
  v_bonus_xp INTEGER := 0;
  v_points INTEGER := 0;
  v_is_clear BOOLEAN := false;
  v_is_early BOOLEAN := false;
  v_is_correct BOOLEAN := false;
  v_submission_id UUID;
  v_today DATE := CURRENT_DATE;
BEGIN
  -- Get challenge and theme info
  SELECT wpc.*, pct.*
  INTO v_challenge
  FROM weekly_photo_challenges wpc
  WHERE wpc.id = p_challenge_id AND wpc.is_active = true;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found or inactive');
  END IF;

  SELECT * INTO v_theme FROM photo_challenge_themes WHERE id = v_challenge.theme_id;

  -- Get or create user progress
  INSERT INTO user_photo_challenge_progress (user_id, challenge_id, photos_target)
  VALUES (p_user_id, p_challenge_id, v_theme.target_photos_per_day * v_theme.duration_days)
  ON CONFLICT (user_id, challenge_id) DO NOTHING;

  SELECT * INTO v_progress FROM user_photo_challenge_progress
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id;

  -- Calculate base XP
  v_base_xp := v_theme.xp_per_photo;
  v_points := v_theme.points_per_photo;

  -- Check for clear photo bonus (AI confidence > 80%)
  IF p_ai_confidence >= 80 THEN
    v_is_clear := true;
    v_bonus_xp := v_bonus_xp + v_theme.bonus_xp_clear_photo;
  END IF;

  -- Check for early detection bonus (issue detected with medium+ severity)
  IF p_ai_issue IS NOT NULL AND p_ai_severity IN ('medium', 'high', 'critical') THEN
    v_is_early := true;
    v_bonus_xp := v_bonus_xp + v_theme.bonus_xp_early_detection;
    v_points := v_points + 5; -- Extra points for early detection
  END IF;

  -- Check for correct identification bonus (high confidence + issue match)
  IF p_ai_confidence >= 85 AND p_ai_issue IS NOT NULL THEN
    v_is_correct := true;
    v_bonus_xp := v_bonus_xp + v_theme.bonus_xp_correct_id;
    v_points := v_points + 3;
  END IF;

  -- Insert photo submission
  INSERT INTO challenge_photo_submissions (
    user_id, challenge_id, field_id, crop_type, photo_url, photo_type,
    ai_confidence_score, ai_detected_issue, ai_severity,
    is_early_detection, is_clear_photo, is_correct_identification,
    base_xp_awarded, bonus_xp_awarded, points_awarded
  )
  VALUES (
    p_user_id, p_challenge_id, p_field_id, p_crop_type, p_photo_url, p_photo_type,
    p_ai_confidence, p_ai_issue, p_ai_severity,
    v_is_early, v_is_clear, v_is_correct,
    v_base_xp, v_bonus_xp, v_points
  )
  RETURNING id INTO v_submission_id;

  -- Update user progress
  UPDATE user_photo_challenge_progress
  SET
    photos_submitted = photos_submitted + 1,
    streak_days = CASE
      WHEN last_photo_date = v_today - INTERVAL '1 day' THEN streak_days + 1
      WHEN last_photo_date = v_today THEN streak_days
      ELSE 1
    END,
    last_photo_date = v_today,
    total_xp_earned = total_xp_earned + v_base_xp + v_bonus_xp,
    total_points_earned = total_points_earned + v_points,
    status = CASE
      WHEN photos_submitted + 1 >= photos_target THEN 'completed'
      ELSE 'active'
    END,
    completed_at = CASE
      WHEN photos_submitted + 1 >= photos_target THEN NOW()
      ELSE NULL
    END
  WHERE user_id = p_user_id AND challenge_id = p_challenge_id;

  -- Award XP to user rewards profile
  UPDATE user_rewards_profiles
  SET total_xp = total_xp + v_base_xp + v_bonus_xp,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Award points
  INSERT INTO points_transactions (user_id, amount, transaction_type, source, reference_id)
  VALUES (p_user_id, v_points, 'earn', 'photo_challenge', v_submission_id)
  ON CONFLICT DO NOTHING;

  UPDATE user_points
  SET total_points = total_points + v_points,
      lifetime_points = lifetime_points + v_points
  WHERE user_id = p_user_id;

  -- Update crop coverage
  PERFORM update_crop_photo_coverage(p_user_id, p_crop_type, p_photo_type);

  -- Check for Healthy Farm badge
  PERFORM check_healthy_farm_badge(p_user_id);

  -- Update challenge participant count
  UPDATE weekly_photo_challenges
  SET total_participants = (
    SELECT COUNT(DISTINCT user_id) FROM user_photo_challenge_progress WHERE challenge_id = p_challenge_id
  )
  WHERE id = p_challenge_id;

  RETURN jsonb_build_object(
    'success', true,
    'submission_id', v_submission_id,
    'base_xp', v_base_xp,
    'bonus_xp', v_bonus_xp,
    'total_xp', v_base_xp + v_bonus_xp,
    'points', v_points,
    'bonuses', jsonb_build_object(
      'clear_photo', v_is_clear,
      'early_detection', v_is_early,
      'correct_identification', v_is_correct
    )
  );
END;
$$;

-- ============================================
-- 9. FUNCTION: Update Crop Photo Coverage
-- ============================================
CREATE OR REPLACE FUNCTION update_crop_photo_coverage(
  p_user_id UUID,
  p_crop_type TEXT,
  p_photo_type TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_crop_photo_coverage (user_id, crop_type, total_photos, last_photo_date)
  VALUES (p_user_id, p_crop_type, 1, CURRENT_DATE)
  ON CONFLICT (user_id, crop_type) DO UPDATE SET
    total_photos = user_crop_photo_coverage.total_photos + 1,
    last_photo_date = CURRENT_DATE,
    has_pest_photo = CASE WHEN p_photo_type = 'pest' THEN true ELSE user_crop_photo_coverage.has_pest_photo END,
    has_disease_photo = CASE WHEN p_photo_type = 'disease' THEN true ELSE user_crop_photo_coverage.has_disease_photo END,
    has_nutrient_photo = CASE WHEN p_photo_type = 'nutrient' THEN true ELSE user_crop_photo_coverage.has_nutrient_photo END,
    has_growth_photo = CASE WHEN p_photo_type = 'growth' THEN true ELSE user_crop_photo_coverage.has_growth_photo END,
    coverage_complete = (
      (CASE WHEN p_photo_type = 'pest' THEN true ELSE user_crop_photo_coverage.has_pest_photo END) AND
      (CASE WHEN p_photo_type = 'disease' THEN true ELSE user_crop_photo_coverage.has_disease_photo END) AND
      (CASE WHEN p_photo_type = 'nutrient' THEN true ELSE user_crop_photo_coverage.has_nutrient_photo END) AND
      (CASE WHEN p_photo_type = 'growth' THEN true ELSE user_crop_photo_coverage.has_growth_photo END)
    ),
    updated_at = NOW();
END;
$$;

-- ============================================
-- 10. FUNCTION: Check Healthy Farm Badge
-- ============================================
CREATE OR REPLACE FUNCTION check_healthy_farm_badge(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_crops TEXT[];
  v_covered_crops INTEGER;
  v_total_crops INTEGER;
  v_badge_id TEXT;
  v_already_has BOOLEAN;
BEGIN
  -- Get user's crops from their fields
  SELECT ARRAY_AGG(DISTINCT crop_type) INTO v_user_crops
  FROM fields
  WHERE user_id = p_user_id AND crop_type IS NOT NULL;

  IF v_user_crops IS NULL OR array_length(v_user_crops, 1) = 0 THEN
    RETURN false;
  END IF;

  v_total_crops := array_length(v_user_crops, 1);

  -- Count crops with complete coverage
  SELECT COUNT(*) INTO v_covered_crops
  FROM user_crop_photo_coverage
  WHERE user_id = p_user_id
    AND crop_type = ANY(v_user_crops)
    AND coverage_complete = true;

  -- Check if all crops are covered
  IF v_covered_crops >= v_total_crops THEN
    -- Get the Healthy Farm badge ID
    v_badge_id := 'healthy_farm_guardian';

    IF v_badge_id IS NOT NULL THEN
      -- Check if user already has badge
      SELECT EXISTS(
        SELECT 1 FROM user_achievements WHERE user_id = p_user_id AND achievement_id = v_badge_id
      ) INTO v_already_has;

      IF NOT v_already_has THEN
        -- Award badge
        INSERT INTO user_achievements (user_id, achievement_id)
        VALUES (p_user_id, v_badge_id);

        -- Award XP
        UPDATE user_rewards_profiles SET total_xp = total_xp + 100, updated_at = NOW() WHERE user_id = p_user_id;

        RETURN true;
      END IF;
    END IF;
  END IF;

  RETURN false;
END;
$$;

-- ============================================
-- 11. FUNCTION: Get Active Challenges
-- ============================================
CREATE OR REPLACE FUNCTION get_active_photo_challenges(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  challenge_id UUID,
  theme_name TEXT,
  theme_name_sw TEXT,
  theme_description TEXT,
  theme_description_sw TEXT,
  theme_type TEXT,
  target_photos_per_day INTEGER,
  duration_days INTEGER,
  xp_per_photo INTEGER,
  bonus_xp_clear INTEGER,
  bonus_xp_early INTEGER,
  bonus_xp_correct INTEGER,
  points_per_photo INTEGER,
  start_date DATE,
  end_date DATE,
  days_remaining INTEGER,
  total_participants INTEGER,
  user_photos_submitted INTEGER,
  user_photos_target INTEGER,
  user_streak_days INTEGER,
  user_total_xp INTEGER,
  user_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    wpc.id,
    pct.name,
    pct.name_sw,
    pct.description,
    pct.description_sw,
    pct.theme_type,
    pct.target_photos_per_day,
    pct.duration_days,
    pct.xp_per_photo,
    pct.bonus_xp_clear_photo,
    pct.bonus_xp_early_detection,
    pct.bonus_xp_correct_id,
    pct.points_per_photo,
    wpc.start_date,
    wpc.end_date,
    (wpc.end_date - CURRENT_DATE)::INTEGER,
    wpc.total_participants,
    COALESCE(upcp.photos_submitted, 0),
    COALESCE(upcp.photos_target, pct.target_photos_per_day * pct.duration_days),
    COALESCE(upcp.streak_days, 0),
    COALESCE(upcp.total_xp_earned, 0),
    COALESCE(upcp.status, 'active')
  FROM weekly_photo_challenges wpc
  JOIN photo_challenge_themes pct ON pct.id = wpc.theme_id
  LEFT JOIN user_photo_challenge_progress upcp ON upcp.challenge_id = wpc.id AND upcp.user_id = p_user_id
  WHERE wpc.is_active = true
    AND wpc.end_date >= CURRENT_DATE
  ORDER BY wpc.start_date DESC;
END;
$$;

-- ============================================
-- 12. FUNCTION: Get User Photo Stats
-- ============================================
CREATE OR REPLACE FUNCTION get_user_photo_stats(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total_photos', COALESCE(SUM(total_photos), 0),
    'crops_covered', COUNT(*),
    'crops_complete', COUNT(*) FILTER (WHERE coverage_complete = true),
    'crop_coverage', jsonb_agg(jsonb_build_object(
      'crop_type', crop_type,
      'total_photos', total_photos,
      'has_pest', has_pest_photo,
      'has_disease', has_disease_photo,
      'has_nutrient', has_nutrient_photo,
      'has_growth', has_growth_photo,
      'complete', coverage_complete
    ))
  ) INTO v_stats
  FROM user_crop_photo_coverage
  WHERE user_id = p_user_id;

  -- Add challenge stats
  SELECT v_stats || jsonb_build_object(
    'challenges_completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'challenges_active', COUNT(*) FILTER (WHERE status = 'active'),
    'total_challenge_xp', COALESCE(SUM(total_xp_earned), 0),
    'total_challenge_points', COALESCE(SUM(total_points_earned), 0),
    'best_streak', COALESCE(MAX(streak_days), 0)
  ) INTO v_stats
  FROM user_photo_challenge_progress
  WHERE user_id = p_user_id;

  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$;

-- ============================================
-- 13. FUNCTION: Create Weekly Challenge (Auto-rotation)
-- ============================================
CREATE OR REPLACE FUNCTION create_weekly_photo_challenge()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_theme_id UUID;
  v_challenge_id UUID;
  v_start_date DATE := CURRENT_DATE;
  v_end_date DATE;
  v_duration INTEGER;
BEGIN
  -- Get a random recurring theme that hasn't been used recently
  SELECT id, duration_days INTO v_theme_id, v_duration
  FROM photo_challenge_themes
  WHERE is_recurring = true
    AND id NOT IN (
      SELECT theme_id FROM weekly_photo_challenges
      WHERE start_date > CURRENT_DATE - INTERVAL '14 days'
    )
  ORDER BY RANDOM()
  LIMIT 1;

  IF v_theme_id IS NULL THEN
    -- Fallback to any recurring theme
    SELECT id, duration_days INTO v_theme_id, v_duration
    FROM photo_challenge_themes
    WHERE is_recurring = true
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;

  IF v_theme_id IS NULL THEN
    RETURN NULL;
  END IF;

  v_end_date := v_start_date + v_duration;

  -- Create the challenge
  INSERT INTO weekly_photo_challenges (theme_id, start_date, end_date)
  VALUES (v_theme_id, v_start_date, v_end_date)
  RETURNING id INTO v_challenge_id;

  RETURN v_challenge_id;
END;
$$;

-- ============================================
-- 14. VIEW: Photo Challenge Leaderboard
-- ============================================
CREATE OR REPLACE VIEW photo_challenge_leaderboard AS
SELECT
  up.id as user_id,
  up.full_name,
  NULL::text as avatar_url,
  COUNT(DISTINCT cps.id) as total_photos,
  COALESCE(SUM(cps.base_xp_awarded + cps.bonus_xp_awarded), 0) as total_xp,
  COALESCE(SUM(cps.points_awarded), 0) as total_points,
  COUNT(*) FILTER (WHERE cps.is_early_detection = true) as early_detections,
  COUNT(*) FILTER (WHERE cps.is_correct_identification = true) as correct_ids,
  MAX(cps.submitted_at) as last_submission
FROM user_profiles up
LEFT JOIN challenge_photo_submissions cps ON cps.user_id = up.id
GROUP BY up.id, up.full_name
HAVING COUNT(cps.id) > 0
ORDER BY total_xp DESC;

-- ============================================
-- 15. Create Initial Weekly Challenge
-- ============================================
DO $$
BEGIN
  -- Create a Pest Patrol challenge starting today
  INSERT INTO weekly_photo_challenges (theme_id, start_date, end_date)
  SELECT id, CURRENT_DATE, CURRENT_DATE + duration_days
  FROM photo_challenge_themes
  WHERE theme_type = 'pest_patrol'
  ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================
-- 16. Enable RLS
-- ============================================
ALTER TABLE photo_challenge_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_photo_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_photo_challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_photo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_crop_photo_coverage ENABLE ROW LEVEL SECURITY;

-- Policies for photo_challenge_themes (read-only for all authenticated users)
CREATE POLICY "Anyone can view challenge themes"
  ON photo_challenge_themes FOR SELECT
  USING (true);

-- Policies for weekly_photo_challenges (read-only for all authenticated users)
CREATE POLICY "Anyone can view weekly challenges"
  ON weekly_photo_challenges FOR SELECT
  USING (true);

-- Policies for user_photo_challenge_progress
CREATE POLICY "Users can view own challenge progress"
  ON user_photo_challenge_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenge progress"
  ON user_photo_challenge_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenge progress"
  ON user_photo_challenge_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Policies for challenge_photo_submissions
CREATE POLICY "Users can view own photo submissions"
  ON challenge_photo_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photo submissions"
  ON challenge_photo_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for user_crop_photo_coverage
CREATE POLICY "Users can view own crop coverage"
  ON user_crop_photo_coverage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own crop coverage"
  ON user_crop_photo_coverage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own crop coverage"
  ON user_crop_photo_coverage FOR UPDATE
  USING (auth.uid() = user_id);

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION submit_challenge_photo TO authenticated;
GRANT EXECUTE ON FUNCTION update_crop_photo_coverage TO authenticated;
GRANT EXECUTE ON FUNCTION check_healthy_farm_badge TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_photo_challenges TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_photo_stats TO authenticated;
GRANT EXECUTE ON FUNCTION create_weekly_photo_challenge TO authenticated;
