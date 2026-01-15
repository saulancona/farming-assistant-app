-- =====================================================
-- Migration 037: Calendar Activity Log System
-- =====================================================
-- Creates a unified activity log that feeds into the calendar
-- All app activities are logged here for comprehensive tracking
-- =====================================================

-- ============================================
-- 1. TABLE: Calendar Activity Log
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  title_sw TEXT, -- Swahili translation
  description TEXT,
  description_sw TEXT,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_time TIME,

  -- Related entity references
  related_id UUID, -- ID of the related entity (mission, task, harvest, etc.)
  related_type TEXT, -- Type of related entity
  field_id UUID REFERENCES fields(id) ON DELETE SET NULL,
  field_name TEXT,

  -- Visual/display properties
  icon TEXT, -- Emoji or icon name
  color TEXT DEFAULT 'green', -- Color for calendar display

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional data (XP earned, points, etc.)

  created_at TIMESTAMPTZ DEFAULT now(),

  -- Prevent duplicate entries for the same activity
  CONSTRAINT unique_activity UNIQUE (user_id, activity_type, related_id, activity_date)
);

-- Activity type enum for reference:
-- mission_step_completed, mission_completed
-- challenge_step_completed, challenge_completed
-- harvest_recorded, harvest_sold
-- task_completed, task_created
-- expense_logged, income_logged
-- article_completed, video_completed
-- story_milestone_uploaded, story_quest_completed
-- photo_submitted
-- streak_milestone
-- achievement_unlocked
-- field_planted, field_harvested

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cal_activity_user_id ON calendar_activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_cal_activity_date ON calendar_activity_log(activity_date);
CREATE INDEX IF NOT EXISTS idx_cal_activity_type ON calendar_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_cal_activity_user_date ON calendar_activity_log(user_id, activity_date);
CREATE INDEX IF NOT EXISTS idx_cal_activity_field ON calendar_activity_log(field_id);

-- Enable RLS
ALTER TABLE calendar_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own activities"
  ON calendar_activity_log FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activities"
  ON calendar_activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 2. FUNCTION: Log Calendar Activity
-- ============================================
CREATE OR REPLACE FUNCTION log_calendar_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_title TEXT,
  p_title_sw TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_description_sw TEXT DEFAULT NULL,
  p_activity_date DATE DEFAULT CURRENT_DATE,
  p_activity_time TIME DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_related_type TEXT DEFAULT NULL,
  p_field_id UUID DEFAULT NULL,
  p_field_name TEXT DEFAULT NULL,
  p_icon TEXT DEFAULT NULL,
  p_color TEXT DEFAULT 'green',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO calendar_activity_log (
    user_id, activity_type, title, title_sw, description, description_sw,
    activity_date, activity_time, related_id, related_type,
    field_id, field_name, icon, color, metadata
  )
  VALUES (
    p_user_id, p_activity_type, p_title, p_title_sw, p_description, p_description_sw,
    p_activity_date, COALESCE(p_activity_time, CURRENT_TIME), p_related_id, p_related_type,
    p_field_id, p_field_name, p_icon, p_color, p_metadata
  )
  ON CONFLICT (user_id, activity_type, related_id, activity_date)
  DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    metadata = EXCLUDED.metadata,
    activity_time = EXCLUDED.activity_time
  RETURNING id INTO v_activity_id;

  RETURN v_activity_id;
END;
$$;

-- ============================================
-- 3. FUNCTION: Get User Calendar Activities
-- ============================================
CREATE OR REPLACE FUNCTION get_calendar_activities(
  p_user_id UUID,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_activity_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  title TEXT,
  title_sw TEXT,
  description TEXT,
  description_sw TEXT,
  activity_date DATE,
  activity_time TIME,
  related_id UUID,
  related_type TEXT,
  field_id UUID,
  field_name TEXT,
  icon TEXT,
  color TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cal.id,
    cal.activity_type,
    cal.title,
    cal.title_sw,
    cal.description,
    cal.description_sw,
    cal.activity_date,
    cal.activity_time,
    cal.related_id,
    cal.related_type,
    cal.field_id,
    cal.field_name,
    cal.icon,
    cal.color,
    cal.metadata,
    cal.created_at
  FROM calendar_activity_log cal
  WHERE cal.user_id = p_user_id
    AND (p_start_date IS NULL OR cal.activity_date >= p_start_date)
    AND (p_end_date IS NULL OR cal.activity_date <= p_end_date)
    AND (p_activity_types IS NULL OR cal.activity_type = ANY(p_activity_types))
  ORDER BY cal.activity_date DESC, cal.activity_time DESC;
END;
$$;

-- ============================================
-- 4. TRIGGER: Log Mission Step Completions
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_mission_step_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mission RECORD;
  v_step RECORD;
  v_field_name TEXT;
BEGIN
  -- Only log when step is completed
  IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
    -- Get mission info
    SELECT m.title, m.title_sw, um.field_id INTO v_mission
    FROM user_missions um
    JOIN missions m ON m.id = um.mission_id
    WHERE um.id = NEW.mission_id;

    -- Get step info
    SELECT ms.name, ms.name_sw INTO v_step
    FROM mission_steps ms
    WHERE ms.id = NEW.step_id;

    -- Get field name
    SELECT name INTO v_field_name FROM fields WHERE id = v_mission.field_id;

    PERFORM log_calendar_activity(
      NEW.user_id,
      'mission_step_completed',
      'Completed: ' || COALESCE(v_step.name, 'Mission Step'),
      'Imekamilika: ' || COALESCE(v_step.name_sw, 'Hatua ya Misheni'),
      v_mission.title,
      v_mission.title_sw,
      CURRENT_DATE,
      CURRENT_TIME,
      NEW.id,
      'mission_step',
      v_mission.field_id,
      v_field_name,
      '🎯',
      'blue',
      jsonb_build_object('mission_title', v_mission.title, 'step_name', v_step.name)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_mission_step_activity ON mission_step_progress;
CREATE TRIGGER log_mission_step_activity
  AFTER INSERT OR UPDATE ON mission_step_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_mission_step_activity();

-- ============================================
-- 5. TRIGGER: Log Mission Completions
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_mission_complete_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_mission RECORD;
  v_field_name TEXT;
BEGIN
  -- Only log when mission is completed
  IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
    -- Get mission info
    SELECT m.title, m.title_sw INTO v_mission
    FROM missions m
    WHERE m.id = NEW.mission_id;

    -- Get field name
    SELECT name INTO v_field_name FROM fields WHERE id = NEW.field_id;

    PERFORM log_calendar_activity(
      NEW.user_id,
      'mission_completed',
      'Mission Complete: ' || COALESCE(v_mission.title, 'Mission'),
      'Misheni Imekamilika: ' || COALESCE(v_mission.title_sw, 'Misheni'),
      'Successfully completed all mission steps!',
      'Umekamilisha hatua zote za misheni!',
      CURRENT_DATE,
      CURRENT_TIME,
      NEW.id,
      'mission',
      NEW.field_id,
      v_field_name,
      '🏆',
      'gold',
      jsonb_build_object('mission_title', v_mission.title, 'xp_earned', NEW.xp_earned)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_mission_complete_activity ON user_missions;
CREATE TRIGGER log_mission_complete_activity
  AFTER UPDATE ON user_missions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_mission_complete_activity();

-- ============================================
-- 6. TRIGGER: Log Harvest Events
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_harvest_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_field_name TEXT;
  v_crop_name TEXT;
BEGIN
  -- Get field and crop info
  SELECT f.name, f.crop_type INTO v_field_name, v_crop_name
  FROM fields f
  WHERE f.id = NEW.field_id;

  IF TG_OP = 'INSERT' THEN
    -- Log new harvest
    PERFORM log_calendar_activity(
      NEW.user_id,
      'harvest_recorded',
      'Harvested ' || NEW.quantity || ' ' || NEW.unit || ' of ' || COALESCE(v_crop_name, 'crop'),
      'Imevunwa ' || NEW.quantity || ' ' || NEW.unit || ' ya ' || COALESCE(v_crop_name, 'mazao'),
      'From field: ' || COALESCE(v_field_name, 'Unknown'),
      'Kutoka shamba: ' || COALESCE(v_field_name, 'Haijulikani'),
      NEW.harvest_date,
      CURRENT_TIME,
      NEW.id,
      'harvest',
      NEW.field_id,
      v_field_name,
      '🌾',
      'amber',
      jsonb_build_object('quantity', NEW.quantity, 'unit', NEW.unit, 'crop', v_crop_name)
    );
  ELSIF TG_OP = 'UPDATE' AND NEW.sold_quantity IS NOT NULL AND (OLD.sold_quantity IS NULL OR NEW.sold_quantity > OLD.sold_quantity) THEN
    -- Log harvest sale
    PERFORM log_calendar_activity(
      NEW.user_id,
      'harvest_sold',
      'Sold ' || NEW.sold_quantity || ' ' || NEW.unit || ' for ' || NEW.currency || ' ' || NEW.sold_amount,
      'Imeuzwa ' || NEW.sold_quantity || ' ' || NEW.unit || ' kwa ' || NEW.currency || ' ' || NEW.sold_amount,
      COALESCE(v_crop_name, 'Crop') || ' from ' || COALESCE(v_field_name, 'field'),
      COALESCE(v_crop_name, 'Mazao') || ' kutoka ' || COALESCE(v_field_name, 'shamba'),
      COALESCE(NEW.sale_date, CURRENT_DATE),
      CURRENT_TIME,
      NEW.id,
      'harvest_sale',
      NEW.field_id,
      v_field_name,
      '💰',
      'green',
      jsonb_build_object('sold_quantity', NEW.sold_quantity, 'amount', NEW.sold_amount, 'currency', NEW.currency)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_harvest_activity ON harvests;
CREATE TRIGGER log_harvest_activity
  AFTER INSERT OR UPDATE ON harvests
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_harvest_activity();

-- ============================================
-- 7. TRIGGER: Log Task Completions
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_task_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_field_name TEXT;
BEGIN
  -- Get field name if task has a field
  IF NEW.field_id IS NOT NULL THEN
    SELECT name INTO v_field_name FROM fields WHERE id = NEW.field_id;
  END IF;

  -- Log task completion
  IF NEW.status = 'completed' AND (OLD IS NULL OR OLD.status != 'completed') THEN
    PERFORM log_calendar_activity(
      NEW.user_id,
      'task_completed',
      'Completed: ' || NEW.title,
      'Imekamilika: ' || NEW.title,
      NEW.description,
      NULL,
      COALESCE(NEW.completed_at::date, CURRENT_DATE),
      CURRENT_TIME,
      NEW.id,
      'task',
      NEW.field_id,
      v_field_name,
      '✅',
      'green',
      jsonb_build_object('priority', NEW.priority, 'task_type', NEW.task_type)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_task_activity ON tasks;
CREATE TRIGGER log_task_activity
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_task_activity();

-- ============================================
-- 8. TRIGGER: Log Expense Entries
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_expense_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_field_name TEXT;
BEGIN
  -- Get field name if expense has a field
  IF NEW.field_id IS NOT NULL THEN
    SELECT name INTO v_field_name FROM fields WHERE id = NEW.field_id;
  END IF;

  PERFORM log_calendar_activity(
    NEW.user_id,
    'expense_logged',
    'Expense: ' || NEW.category || ' - ' || NEW.currency || ' ' || NEW.amount,
    'Gharama: ' || NEW.category || ' - ' || NEW.currency || ' ' || NEW.amount,
    NEW.description,
    NULL,
    NEW.date,
    CURRENT_TIME,
    NEW.id,
    'expense',
    NEW.field_id,
    v_field_name,
    '💸',
    'red',
    jsonb_build_object('category', NEW.category, 'amount', NEW.amount, 'currency', NEW.currency)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_expense_activity ON expenses;
CREATE TRIGGER log_expense_activity
  AFTER INSERT ON expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_expense_activity();

-- ============================================
-- 9. TRIGGER: Log Income Entries
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_income_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_field_name TEXT;
BEGIN
  -- Get field name if income has a field
  IF NEW.field_id IS NOT NULL THEN
    SELECT name INTO v_field_name FROM fields WHERE id = NEW.field_id;
  END IF;

  PERFORM log_calendar_activity(
    NEW.user_id,
    'income_logged',
    'Income: ' || NEW.source || ' - ' || NEW.currency || ' ' || NEW.amount,
    'Mapato: ' || NEW.source || ' - ' || NEW.currency || ' ' || NEW.amount,
    NEW.description,
    NULL,
    NEW.date,
    CURRENT_TIME,
    NEW.id,
    'income',
    NEW.field_id,
    v_field_name,
    '💵',
    'green',
    jsonb_build_object('source', NEW.source, 'amount', NEW.amount, 'currency', NEW.currency)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_income_activity ON income;
CREATE TRIGGER log_income_activity
  AFTER INSERT ON income
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_income_activity();

-- ============================================
-- 10. TRIGGER: Log Story Quest Milestone Photos
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_story_milestone_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quest RECORD;
  v_field_name TEXT;
  v_milestone_display TEXT;
BEGIN
  -- Get quest info
  SELECT sq.name, sq.name_sw, usq.field_id INTO v_quest
  FROM user_story_quests usq
  JOIN story_quests sq ON sq.id = usq.quest_id
  WHERE usq.id = NEW.user_quest_id;

  -- Get field name
  SELECT name INTO v_field_name FROM fields WHERE id = v_quest.field_id;

  -- Map milestone type to display name
  v_milestone_display := CASE NEW.milestone_type
    WHEN 'land_before' THEN 'Land Before Planting'
    WHEN 'germination' THEN 'Germination Stage'
    WHEN 'flowering' THEN 'Flowering Stage'
    WHEN 'pre_harvest' THEN 'Pre-Harvest Stage'
    WHEN 'storage' THEN 'Storage/Final Harvest'
    ELSE NEW.milestone_type
  END;

  PERFORM log_calendar_activity(
    NEW.user_id,
    'story_milestone_uploaded',
    'Story Photo: ' || v_milestone_display,
    'Picha ya Hadithi: ' || v_milestone_display,
    v_quest.name || ' progress photo',
    v_quest.name_sw || ' picha ya maendeleo',
    CURRENT_DATE,
    CURRENT_TIME,
    NEW.id,
    'story_photo',
    v_quest.field_id,
    v_field_name,
    '📸',
    'purple',
    jsonb_build_object('quest_name', v_quest.name, 'milestone', NEW.milestone_type, 'verified', NEW.ai_verified)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_story_milestone_activity ON story_quest_photos;
CREATE TRIGGER log_story_milestone_activity
  AFTER INSERT ON story_quest_photos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_story_milestone_activity();

-- ============================================
-- 11. TRIGGER: Log Article Completions
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_article_complete_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_article RECORD;
BEGIN
  -- Only log when article is completed
  IF NEW.completed = true AND (OLD IS NULL OR OLD.completed = false) THEN
    -- Get article info
    SELECT title, title_sw, category INTO v_article
    FROM knowledge_articles
    WHERE id = NEW.article_id;

    PERFORM log_calendar_activity(
      NEW.user_id,
      'article_completed',
      'Read: ' || COALESCE(v_article.title, 'Article'),
      'Imesomwa: ' || COALESCE(v_article.title_sw, 'Makala'),
      'Category: ' || COALESCE(v_article.category, 'General'),
      'Kategoria: ' || COALESCE(v_article.category, 'Jumla'),
      CURRENT_DATE,
      CURRENT_TIME,
      NEW.id,
      'article',
      NULL,
      NULL,
      '📚',
      'indigo',
      jsonb_build_object('article_title', v_article.title, 'category', v_article.category)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_article_complete_activity ON article_progress;
CREATE TRIGGER log_article_complete_activity
  AFTER INSERT OR UPDATE ON article_progress
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_article_complete_activity();

-- ============================================
-- 12. TRIGGER: Log Challenge Completions
-- ============================================
CREATE OR REPLACE FUNCTION trigger_log_challenge_complete_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_challenge RECORD;
BEGIN
  -- Only log when challenge is completed
  IF NEW.completed_at IS NOT NULL AND (OLD IS NULL OR OLD.completed_at IS NULL) THEN
    -- Get challenge info
    SELECT c.title, c.title_sw, c.challenge_type INTO v_challenge
    FROM challenges c
    WHERE c.id = NEW.challenge_id;

    PERFORM log_calendar_activity(
      NEW.user_id,
      'challenge_completed',
      'Challenge Complete: ' || COALESCE(v_challenge.title, 'Challenge'),
      'Changamoto Imekamilika: ' || COALESCE(v_challenge.title_sw, 'Changamoto'),
      'Challenge type: ' || COALESCE(v_challenge.challenge_type, 'general'),
      'Aina ya changamoto: ' || COALESCE(v_challenge.challenge_type, 'jumla'),
      CURRENT_DATE,
      CURRENT_TIME,
      NEW.id,
      'challenge',
      NULL,
      NULL,
      '🎯',
      'orange',
      jsonb_build_object('challenge_title', v_challenge.title, 'type', v_challenge.challenge_type)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS log_challenge_complete_activity ON user_challenges;
CREATE TRIGGER log_challenge_complete_activity
  AFTER UPDATE ON user_challenges
  FOR EACH ROW
  EXECUTE FUNCTION trigger_log_challenge_complete_activity();

-- ============================================
-- 13. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT ON calendar_activity_log TO authenticated;
GRANT EXECUTE ON FUNCTION log_calendar_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_calendar_activities TO authenticated;
