-- =============================================
-- STORY QUESTS (Before & After Crop Documentation)
-- =============================================
-- Farmers document their crop journey from land prep to storage
-- with 5 photo milestones, earning rewards and priority access

-- =============================================
-- ENUMS
-- =============================================

-- Story quest milestone types
CREATE TYPE story_milestone_type AS ENUM (
  'land_before',      -- Land before planting
  'germination',      -- Germination stage
  'flowering',        -- Flowering stage
  'pre_harvest',      -- Before harvest
  'storage'           -- Final storage/harvest
);

-- Story quest status
CREATE TYPE story_quest_status AS ENUM (
  'active',
  'completed',
  'abandoned',
  'expired'
);

-- =============================================
-- TABLES
-- =============================================

-- Story quest templates (crop-specific journeys)
CREATE TABLE story_quest_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_sw TEXT,
  description TEXT,
  description_sw TEXT,
  crop_type TEXT NOT NULL,

  -- Rewards
  points_reward INTEGER NOT NULL DEFAULT 30,
  xp_reward INTEGER NOT NULL DEFAULT 50,
  badge_name TEXT DEFAULT 'Yield Champion',
  badge_icon TEXT DEFAULT '🏆',

  -- Timing
  expected_duration_days INTEGER DEFAULT 90,

  -- Priority access reward
  grants_priority_buyer_access BOOLEAN DEFAULT true,
  priority_access_days INTEGER DEFAULT 30,

  -- Feature story reward
  feature_story_eligible BOOLEAN DEFAULT true,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User's active story quests
CREATE TABLE user_story_quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES story_quest_templates(id),
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,

  -- Status tracking
  status story_quest_status DEFAULT 'active',
  milestones_completed INTEGER DEFAULT 0,

  -- Dates
  started_at TIMESTAMPTZ DEFAULT NOW(),
  target_completion_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- Rewards tracking
  points_awarded INTEGER DEFAULT 0,
  xp_awarded INTEGER DEFAULT 0,
  badge_awarded BOOLEAN DEFAULT false,
  priority_access_granted BOOLEAN DEFAULT false,
  priority_access_expires_at TIMESTAMPTZ,
  featured_story BOOLEAN DEFAULT false,

  -- Notes
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Story quest milestone photos
CREATE TABLE story_quest_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_quest_id UUID NOT NULL REFERENCES user_story_quests(id) ON DELETE CASCADE,

  -- Milestone info
  milestone_type story_milestone_type NOT NULL,
  milestone_order INTEGER NOT NULL, -- 1-5

  -- Photo data
  photo_url TEXT NOT NULL,
  caption TEXT,
  caption_sw TEXT,

  -- Location/metadata
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- AI analysis (optional)
  ai_crop_health_score DECIMAL(3, 2), -- 0.00 to 1.00
  ai_detected_issues TEXT[],
  ai_growth_stage TEXT,

  -- Timing
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_story_quest_id, milestone_type)
);

-- Featured stories (completed quests selected for showcase)
CREATE TABLE featured_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_story_quest_id UUID NOT NULL REFERENCES user_story_quests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Display info
  title TEXT NOT NULL,
  title_sw TEXT,
  summary TEXT,
  summary_sw TEXT,

  -- Visibility
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,

  -- Engagement
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Priority buyer access tracking
CREATE TABLE priority_buyer_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_quest_id UUID REFERENCES user_story_quests(id) ON DELETE SET NULL,

  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,

  -- Access benefits used
  connections_made INTEGER DEFAULT 0,

  UNIQUE(user_id, source_quest_id)
);

-- =============================================
-- INDEXES
-- =============================================

CREATE INDEX idx_user_story_quests_user ON user_story_quests(user_id);
CREATE INDEX idx_user_story_quests_status ON user_story_quests(status);
CREATE INDEX idx_user_story_quests_template ON user_story_quests(template_id);
CREATE INDEX idx_story_quest_photos_quest ON story_quest_photos(user_story_quest_id);
CREATE INDEX idx_story_quest_photos_milestone ON story_quest_photos(milestone_type);
CREATE INDEX idx_featured_stories_published ON featured_stories(is_published, published_at DESC);
CREATE INDEX idx_priority_buyer_access_user ON priority_buyer_access(user_id, is_active);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE story_quest_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_quest_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE featured_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_buyer_access ENABLE ROW LEVEL SECURITY;

-- Templates are public read
CREATE POLICY "Anyone can view active story quest templates"
  ON story_quest_templates FOR SELECT
  USING (is_active = true);

-- Users can manage their own story quests
CREATE POLICY "Users can view their own story quests"
  ON user_story_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own story quests"
  ON user_story_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own story quests"
  ON user_story_quests FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can manage their own photos
CREATE POLICY "Users can view their own story quest photos"
  ON story_quest_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_story_quests usq
      WHERE usq.id = story_quest_photos.user_story_quest_id
      AND usq.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload their own story quest photos"
  ON story_quest_photos FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_story_quests usq
      WHERE usq.id = story_quest_photos.user_story_quest_id
      AND usq.user_id = auth.uid()
    )
  );

-- Featured stories are public when published
CREATE POLICY "Anyone can view published featured stories"
  ON featured_stories FOR SELECT
  USING (is_published = true);

CREATE POLICY "Users can view their own featured stories"
  ON featured_stories FOR SELECT
  USING (user_id = auth.uid());

-- Priority access
CREATE POLICY "Users can view their own priority access"
  ON priority_buyer_access FOR SELECT
  USING (user_id = auth.uid());

-- =============================================
-- FUNCTIONS
-- =============================================

-- Start a new story quest
CREATE OR REPLACE FUNCTION start_story_quest(
  p_user_id UUID,
  p_template_id UUID,
  p_field_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template RECORD;
  v_existing_active INTEGER;
  v_quest_id UUID;
  v_target_date TIMESTAMPTZ;
BEGIN
  -- Get template
  SELECT * INTO v_template
  FROM story_quest_templates
  WHERE id = p_template_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Template not found');
  END IF;

  -- Check if user already has an active quest for this crop
  SELECT COUNT(*) INTO v_existing_active
  FROM user_story_quests usq
  JOIN story_quest_templates sqt ON sqt.id = usq.template_id
  WHERE usq.user_id = p_user_id
    AND usq.status = 'active'
    AND sqt.crop_type = v_template.crop_type;

  IF v_existing_active > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already have an active quest for this crop');
  END IF;

  -- Calculate target completion date
  v_target_date := NOW() + (v_template.expected_duration_days || ' days')::INTERVAL;

  -- Create the quest
  INSERT INTO user_story_quests (
    user_id, template_id, field_id, target_completion_date
  ) VALUES (
    p_user_id, p_template_id, p_field_id, v_target_date
  )
  RETURNING id INTO v_quest_id;

  RETURN jsonb_build_object(
    'success', true,
    'quest_id', v_quest_id,
    'crop_type', v_template.crop_type,
    'target_date', v_target_date
  );
END;
$$;

-- Upload a milestone photo
CREATE OR REPLACE FUNCTION upload_milestone_photo(
  p_user_id UUID,
  p_quest_id UUID,
  p_milestone_type story_milestone_type,
  p_photo_url TEXT,
  p_caption TEXT DEFAULT NULL,
  p_latitude DECIMAL DEFAULT NULL,
  p_longitude DECIMAL DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest RECORD;
  v_milestone_order INTEGER;
  v_photo_id UUID;
  v_all_milestones INTEGER;
  v_xp_per_photo INTEGER := 10;
BEGIN
  -- Verify quest belongs to user and is active
  SELECT * INTO v_quest
  FROM user_story_quests
  WHERE id = p_quest_id AND user_id = p_user_id AND status = 'active';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found or not active');
  END IF;

  -- Determine milestone order
  v_milestone_order := CASE p_milestone_type
    WHEN 'land_before' THEN 1
    WHEN 'germination' THEN 2
    WHEN 'flowering' THEN 3
    WHEN 'pre_harvest' THEN 4
    WHEN 'storage' THEN 5
  END;

  -- Insert or update photo
  INSERT INTO story_quest_photos (
    user_story_quest_id, milestone_type, milestone_order,
    photo_url, caption, latitude, longitude
  ) VALUES (
    p_quest_id, p_milestone_type, v_milestone_order,
    p_photo_url, p_caption, p_latitude, p_longitude
  )
  ON CONFLICT (user_story_quest_id, milestone_type)
  DO UPDATE SET
    photo_url = EXCLUDED.photo_url,
    caption = EXCLUDED.caption,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    uploaded_at = NOW()
  RETURNING id INTO v_photo_id;

  -- Count completed milestones
  SELECT COUNT(*) INTO v_all_milestones
  FROM story_quest_photos
  WHERE user_story_quest_id = p_quest_id;

  -- Update quest progress
  UPDATE user_story_quests
  SET
    milestones_completed = v_all_milestones,
    xp_awarded = xp_awarded + v_xp_per_photo,
    updated_at = NOW()
  WHERE id = p_quest_id;

  -- Award XP to user
  UPDATE user_profiles
  SET total_xp = total_xp + v_xp_per_photo
  WHERE id = p_user_id;

  -- Check if all 5 milestones completed
  IF v_all_milestones >= 5 THEN
    PERFORM complete_story_quest(p_user_id, p_quest_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'photo_id', v_photo_id,
    'milestones_completed', v_all_milestones,
    'xp_awarded', v_xp_per_photo,
    'quest_completed', v_all_milestones >= 5
  );
END;
$$;

-- Complete a story quest
CREATE OR REPLACE FUNCTION complete_story_quest(
  p_user_id UUID,
  p_quest_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest RECORD;
  v_template RECORD;
  v_priority_expires TIMESTAMPTZ;
  v_badge_id UUID;
BEGIN
  -- Get quest with template
  SELECT usq.*, sqt.points_reward, sqt.xp_reward, sqt.badge_name, sqt.badge_icon,
         sqt.grants_priority_buyer_access, sqt.priority_access_days, sqt.feature_story_eligible
  INTO v_quest
  FROM user_story_quests usq
  JOIN story_quest_templates sqt ON sqt.id = usq.template_id
  WHERE usq.id = p_quest_id AND usq.user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest not found');
  END IF;

  IF v_quest.status = 'completed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quest already completed');
  END IF;

  -- Calculate priority access expiry
  v_priority_expires := NOW() + (v_quest.priority_access_days || ' days')::INTERVAL;

  -- Update quest as completed
  UPDATE user_story_quests
  SET
    status = 'completed',
    completed_at = NOW(),
    points_awarded = v_quest.points_reward,
    xp_awarded = xp_awarded + v_quest.xp_reward,
    badge_awarded = true,
    priority_access_granted = v_quest.grants_priority_buyer_access,
    priority_access_expires_at = CASE WHEN v_quest.grants_priority_buyer_access THEN v_priority_expires ELSE NULL END,
    updated_at = NOW()
  WHERE id = p_quest_id;

  -- Award points and XP
  UPDATE user_profiles
  SET
    total_xp = total_xp + v_quest.xp_reward,
    current_streak = current_streak -- Maintain streak
  WHERE id = p_user_id;

  -- Award points (if user_points table exists)
  INSERT INTO user_points (user_id, total_points, lifetime_points)
  VALUES (p_user_id, v_quest.points_reward, v_quest.points_reward)
  ON CONFLICT (user_id)
  DO UPDATE SET
    total_points = user_points.total_points + v_quest.points_reward,
    lifetime_points = user_points.lifetime_points + v_quest.points_reward,
    updated_at = NOW();

  -- Record points transaction
  INSERT INTO points_transactions (user_id, amount, transaction_type, source, reference_id)
  VALUES (p_user_id, v_quest.points_reward, 'earn', 'story_quest', p_quest_id);

  -- Check/create Yield Champion badge
  SELECT id INTO v_badge_id
  FROM badges
  WHERE name = v_quest.badge_name;

  IF v_badge_id IS NOT NULL THEN
    INSERT INTO user_badges (user_id, badge_id, earned_at, progress)
    VALUES (p_user_id, v_badge_id, NOW(), 100)
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;

  -- Grant priority buyer access
  IF v_quest.grants_priority_buyer_access THEN
    INSERT INTO priority_buyer_access (user_id, source_quest_id, expires_at)
    VALUES (p_user_id, p_quest_id, v_priority_expires)
    ON CONFLICT (user_id, source_quest_id) DO UPDATE
    SET expires_at = v_priority_expires, is_active = true;
  END IF;

  -- Create featured story placeholder (for admin selection)
  IF v_quest.feature_story_eligible THEN
    INSERT INTO featured_stories (user_story_quest_id, user_id, title)
    VALUES (p_quest_id, p_user_id, 'Yield Champion Story')
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'points_awarded', v_quest.points_reward,
    'xp_awarded', v_quest.xp_reward,
    'badge_name', v_quest.badge_name,
    'priority_access_granted', v_quest.grants_priority_buyer_access,
    'priority_access_expires', v_priority_expires
  );
END;
$$;

-- Get user's story quests
CREATE OR REPLACE FUNCTION get_user_story_quests(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quests JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', usq.id,
      'templateId', usq.template_id,
      'fieldId', usq.field_id,
      'status', usq.status,
      'milestonesCompleted', usq.milestones_completed,
      'startedAt', usq.started_at,
      'targetDate', usq.target_completion_date,
      'completedAt', usq.completed_at,
      'pointsAwarded', usq.points_awarded,
      'xpAwarded', usq.xp_awarded,
      'badgeAwarded', usq.badge_awarded,
      'priorityAccessGranted', usq.priority_access_granted,
      'priorityAccessExpires', usq.priority_access_expires_at,
      'template', jsonb_build_object(
        'name', sqt.name,
        'nameSw', sqt.name_sw,
        'description', sqt.description,
        'descriptionSw', sqt.description_sw,
        'cropType', sqt.crop_type,
        'pointsReward', sqt.points_reward,
        'xpReward', sqt.xp_reward,
        'badgeName', sqt.badge_name,
        'badgeIcon', sqt.badge_icon,
        'expectedDays', sqt.expected_duration_days
      ),
      'photos', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', sqp.id,
            'milestoneType', sqp.milestone_type,
            'milestoneOrder', sqp.milestone_order,
            'photoUrl', sqp.photo_url,
            'caption', sqp.caption,
            'uploadedAt', sqp.uploaded_at,
            'aiHealthScore', sqp.ai_crop_health_score,
            'aiIssues', sqp.ai_detected_issues
          )
          ORDER BY sqp.milestone_order
        )
        FROM story_quest_photos sqp
        WHERE sqp.user_story_quest_id = usq.id
      )
    )
    ORDER BY
      CASE usq.status WHEN 'active' THEN 0 ELSE 1 END,
      usq.started_at DESC
  )
  INTO v_quests
  FROM user_story_quests usq
  JOIN story_quest_templates sqt ON sqt.id = usq.template_id
  WHERE usq.user_id = p_user_id;

  RETURN COALESCE(v_quests, '[]'::jsonb);
END;
$$;

-- Get available story quest templates
CREATE OR REPLACE FUNCTION get_story_quest_templates(p_crop_type TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_templates JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'name', name,
      'nameSw', name_sw,
      'description', description,
      'descriptionSw', description_sw,
      'cropType', crop_type,
      'pointsReward', points_reward,
      'xpReward', xp_reward,
      'badgeName', badge_name,
      'badgeIcon', badge_icon,
      'expectedDays', expected_duration_days,
      'grantsPriorityAccess', grants_priority_buyer_access,
      'featureStoryEligible', feature_story_eligible
    )
    ORDER BY crop_type, name
  )
  INTO v_templates
  FROM story_quest_templates
  WHERE is_active = true
    AND (p_crop_type IS NULL OR crop_type = p_crop_type);

  RETURN COALESCE(v_templates, '[]'::jsonb);
END;
$$;

-- Get featured stories
CREATE OR REPLACE FUNCTION get_featured_stories(p_limit INTEGER DEFAULT 10)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stories JSONB;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', fs.id,
      'title', fs.title,
      'titleSw', fs.title_sw,
      'summary', fs.summary,
      'summarySw', fs.summary_sw,
      'viewCount', fs.view_count,
      'likeCount', fs.like_count,
      'publishedAt', fs.published_at,
      'farmer', jsonb_build_object(
        'id', up.id,
        'name', up.full_name,
        'avatarUrl', up.avatar_url,
        'location', up.location
      ),
      'quest', jsonb_build_object(
        'cropType', sqt.crop_type,
        'completedAt', usq.completed_at
      ),
      'photos', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'milestoneType', sqp.milestone_type,
            'photoUrl', sqp.photo_url
          )
          ORDER BY sqp.milestone_order
        )
        FROM story_quest_photos sqp
        WHERE sqp.user_story_quest_id = usq.id
      )
    )
    ORDER BY fs.published_at DESC
  )
  INTO v_stories
  FROM featured_stories fs
  JOIN user_story_quests usq ON usq.id = fs.user_story_quest_id
  JOIN story_quest_templates sqt ON sqt.id = usq.template_id
  JOIN user_profiles up ON up.id = fs.user_id
  WHERE fs.is_published = true
  LIMIT p_limit;

  RETURN COALESCE(v_stories, '[]'::jsonb);
END;
$$;

-- Check user's priority buyer access
CREATE OR REPLACE FUNCTION check_priority_access(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_access RECORD;
BEGIN
  SELECT * INTO v_access
  FROM priority_buyer_access
  WHERE user_id = p_user_id
    AND is_active = true
    AND expires_at > NOW()
  ORDER BY expires_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'hasAccess', false,
      'message', 'Complete a Story Quest to earn priority buyer access'
    );
  END IF;

  RETURN jsonb_build_object(
    'hasAccess', true,
    'expiresAt', v_access.expires_at,
    'connectionsUsed', v_access.connections_made
  );
END;
$$;

-- =============================================
-- SEED DATA: Story Quest Templates
-- =============================================

INSERT INTO story_quest_templates (name, name_sw, description, description_sw, crop_type, points_reward, xp_reward, expected_duration_days) VALUES
-- Maize
('Maize Journey', 'Safari ya Mahindi', 'Document your maize from planting to harvest', 'Andika safari yako ya mahindi kutoka kupanda hadi kuvuna', 'maize', 30, 50, 90),

-- Beans
('Bean Story', 'Hadithi ya Maharage', 'Capture your bean crop''s complete growth cycle', 'Nasa mzunguko kamili wa ukuaji wa maharage yako', 'beans', 30, 50, 75),

-- Tomatoes
('Tomato Tales', 'Hadithi za Nyanya', 'Share your tomato growing experience', 'Shiriki uzoefu wako wa kulima nyanya', 'tomatoes', 30, 50, 60),

-- Rice
('Rice Chronicles', 'Mambo ya Mpunga', 'Document your rice paddy journey', 'Andika safari yako ya shamba la mpunga', 'rice', 30, 50, 120),

-- Cassava
('Cassava Story', 'Hadithi ya Muhogo', 'Track your cassava from cutting to harvest', 'Fuatilia muhogo wako kutoka kipandikizi hadi mavuno', 'cassava', 35, 60, 270),

-- Sweet Potato
('Sweet Potato Journey', 'Safari ya Viazi Vitamu', 'Document your sweet potato cultivation', 'Andika kilimo chako cha viazi vitamu', 'sweet_potato', 30, 50, 120),

-- Coffee
('Coffee Chronicles', 'Mambo ya Kahawa', 'Share your coffee growing season', 'Shiriki msimu wako wa kulima kahawa', 'coffee', 40, 70, 300),

-- Vegetables (general)
('Vegetable Garden Story', 'Hadithi ya Bustani', 'Document your vegetable garden progress', 'Andika maendeleo ya bustani yako ya mboga', 'vegetables', 25, 40, 45);

-- =============================================
-- CREATE YIELD CHAMPION BADGE (if badges table exists)
-- =============================================

INSERT INTO badges (name, name_sw, description, description_sw, icon, category, rarity, xp_reward, criteria, criteria_value)
VALUES (
  'Yield Champion',
  'Bingwa wa Mavuno',
  'Completed a full crop story quest with all 5 milestones',
  'Umekamilisha safari kamili ya mazao na hatua zote 5',
  '🏆',
  'achievements',
  'epic',
  100,
  'story_quest_complete',
  1
)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- GRANTS
-- =============================================

GRANT EXECUTE ON FUNCTION start_story_quest TO authenticated;
GRANT EXECUTE ON FUNCTION upload_milestone_photo TO authenticated;
GRANT EXECUTE ON FUNCTION complete_story_quest TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_story_quests TO authenticated;
GRANT EXECUTE ON FUNCTION get_story_quest_templates TO authenticated;
GRANT EXECUTE ON FUNCTION get_featured_stories TO authenticated;
GRANT EXECUTE ON FUNCTION check_priority_access TO authenticated;
