-- =====================================================
-- Migration 024: Monthly Raffle System
-- =====================================================
-- Implements a monthly raffle where farmers can win prizes
-- (e.g., solar panels) by earning raffle entries through:
-- - 30-day streak milestones
-- - Completing missions
-- - Other achievements
-- =====================================================

-- ============================================
-- 1. TABLE: Raffle Prizes
-- ============================================
CREATE TABLE IF NOT EXISTS raffle_prizes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_sw TEXT NOT NULL, -- Swahili name
  description TEXT,
  description_sw TEXT,
  image_url TEXT,
  value_usd DECIMAL(10,2), -- Estimated value
  sponsor TEXT, -- Company/org sponsoring the prize
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. TABLE: Monthly Raffles
-- ============================================
CREATE TABLE IF NOT EXISTS monthly_raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2024),
  prize_id UUID REFERENCES raffle_prizes(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('upcoming', 'active', 'drawing', 'completed')),
  winner_id UUID REFERENCES auth.users(id),
  winner_name TEXT,
  total_entries INTEGER DEFAULT 0,
  draw_date TIMESTAMPTZ,
  drawn_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(month, year)
);

-- ============================================
-- 3. TABLE: Raffle Entries
-- ============================================
CREATE TABLE IF NOT EXISTS raffle_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES monthly_raffles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_count INTEGER DEFAULT 1, -- Number of entries (tickets)
  source TEXT NOT NULL, -- 'streak_30', 'mission_complete', 'achievement', etc.
  source_id TEXT, -- Reference to what earned this entry
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Each source can only give entries once per raffle
  UNIQUE(raffle_id, user_id, source, source_id)
);

-- ============================================
-- 4. TABLE: Raffle Winners History
-- ============================================
CREATE TABLE IF NOT EXISTS raffle_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id UUID NOT NULL REFERENCES monthly_raffles(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  prize_id UUID REFERENCES raffle_prizes(id),
  prize_name TEXT NOT NULL,
  entries_at_draw INTEGER, -- How many entries winner had
  total_participants INTEGER, -- Total people who entered
  notified BOOLEAN DEFAULT false,
  claimed BOOLEAN DEFAULT false,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_raffle_entries_raffle_id ON raffle_entries(raffle_id);
CREATE INDEX IF NOT EXISTS idx_raffle_entries_user_id ON raffle_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_raffles_status ON monthly_raffles(status);
CREATE INDEX IF NOT EXISTS idx_monthly_raffles_month_year ON monthly_raffles(month, year);

-- Enable RLS
ALTER TABLE raffle_prizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE raffle_winners ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view raffle prizes"
  ON raffle_prizes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can view monthly raffles"
  ON monthly_raffles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can view their own raffle entries"
  ON raffle_entries FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view all entry counts for leaderboard"
  ON raffle_entries FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can view raffle winners"
  ON raffle_winners FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- 5. FUNCTION: Get or Create Current Month's Raffle
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_monthly_raffle()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month INTEGER;
  v_year INTEGER;
  v_raffle_id UUID;
  v_prize_id UUID;
BEGIN
  v_month := EXTRACT(MONTH FROM now());
  v_year := EXTRACT(YEAR FROM now());

  -- Check if raffle exists for this month
  SELECT id INTO v_raffle_id
  FROM monthly_raffles
  WHERE month = v_month AND year = v_year;

  IF v_raffle_id IS NULL THEN
    -- Get the solar panel prize (or first available prize)
    SELECT id INTO v_prize_id
    FROM raffle_prizes
    LIMIT 1;

    -- Create new raffle
    INSERT INTO monthly_raffles (month, year, prize_id, status, draw_date)
    VALUES (
      v_month,
      v_year,
      v_prize_id,
      'active',
      (date_trunc('month', now()) + interval '1 month - 1 day')::timestamptz -- Last day of month
    )
    RETURNING id INTO v_raffle_id;
  END IF;

  RETURN v_raffle_id;
END;
$$;

-- ============================================
-- 6. FUNCTION: Award Raffle Entry
-- ============================================
CREATE OR REPLACE FUNCTION award_raffle_entry(
  p_user_id UUID,
  p_source TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_entry_count INTEGER DEFAULT 1
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle_id UUID;
  v_entry_id UUID;
  v_total_entries INTEGER;
BEGIN
  -- Get current month's raffle
  v_raffle_id := get_or_create_monthly_raffle();

  -- Try to insert entry (will fail silently if duplicate)
  INSERT INTO raffle_entries (raffle_id, user_id, entry_count, source, source_id)
  VALUES (v_raffle_id, p_user_id, p_entry_count, p_source, COALESCE(p_source_id, p_source))
  ON CONFLICT (raffle_id, user_id, source, source_id) DO NOTHING
  RETURNING id INTO v_entry_id;

  -- Update total entries count on raffle
  UPDATE monthly_raffles
  SET total_entries = (
    SELECT COALESCE(SUM(entry_count), 0)
    FROM raffle_entries
    WHERE raffle_id = v_raffle_id
  )
  WHERE id = v_raffle_id;

  -- Get user's total entries for this raffle
  SELECT COALESCE(SUM(entry_count), 0) INTO v_total_entries
  FROM raffle_entries
  WHERE raffle_id = v_raffle_id AND user_id = p_user_id;

  RETURN json_build_object(
    'success', v_entry_id IS NOT NULL,
    'entryId', v_entry_id,
    'raffleId', v_raffle_id,
    'totalUserEntries', v_total_entries,
    'source', p_source,
    'alreadyAwarded', v_entry_id IS NULL
  );
END;
$$;

-- ============================================
-- 7. FUNCTION: Get User's Raffle Status
-- ============================================
CREATE OR REPLACE FUNCTION get_user_raffle_status(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle_id UUID;
  v_raffle RECORD;
  v_user_entries INTEGER;
  v_total_participants INTEGER;
  v_prize RECORD;
  v_days_remaining INTEGER;
  v_entry_sources JSONB;
BEGIN
  -- Get current month's raffle
  v_raffle_id := get_or_create_monthly_raffle();

  -- Get raffle details
  SELECT * INTO v_raffle
  FROM monthly_raffles
  WHERE id = v_raffle_id;

  -- Get prize details
  SELECT * INTO v_prize
  FROM raffle_prizes
  WHERE id = v_raffle.prize_id;

  -- Get user's entries
  SELECT COALESCE(SUM(entry_count), 0) INTO v_user_entries
  FROM raffle_entries
  WHERE raffle_id = v_raffle_id AND user_id = p_user_id;

  -- Get total unique participants
  SELECT COUNT(DISTINCT user_id) INTO v_total_participants
  FROM raffle_entries
  WHERE raffle_id = v_raffle_id;

  -- Get entry sources for this user
  SELECT jsonb_agg(jsonb_build_object(
    'source', source,
    'entries', entry_count,
    'earnedAt', created_at
  )) INTO v_entry_sources
  FROM raffle_entries
  WHERE raffle_id = v_raffle_id AND user_id = p_user_id;

  -- Calculate days remaining
  v_days_remaining := GREATEST(0, EXTRACT(DAY FROM v_raffle.draw_date - now())::INTEGER);

  RETURN json_build_object(
    'raffleId', v_raffle_id,
    'month', v_raffle.month,
    'year', v_raffle.year,
    'status', v_raffle.status,
    'drawDate', v_raffle.draw_date,
    'daysRemaining', v_days_remaining,
    'userEntries', v_user_entries,
    'totalEntries', v_raffle.total_entries,
    'totalParticipants', v_total_participants,
    'entrySources', COALESCE(v_entry_sources, '[]'::jsonb),
    'prize', CASE WHEN v_prize.id IS NOT NULL THEN json_build_object(
      'id', v_prize.id,
      'name', v_prize.name,
      'nameSw', v_prize.name_sw,
      'description', v_prize.description,
      'descriptionSw', v_prize.description_sw,
      'imageUrl', v_prize.image_url,
      'valueUsd', v_prize.value_usd,
      'sponsor', v_prize.sponsor
    ) ELSE NULL END,
    'winnerId', v_raffle.winner_id,
    'winnerName', v_raffle.winner_name
  );
END;
$$;

-- ============================================
-- 8. FUNCTION: Get Raffle Leaderboard
-- ============================================
CREATE OR REPLACE FUNCTION get_raffle_leaderboard(p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  full_name TEXT,
  total_entries BIGINT,
  entry_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle_id UUID;
BEGIN
  v_raffle_id := get_or_create_monthly_raffle();

  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(re.entry_count) DESC) as rank,
    re.user_id,
    COALESCE(up.full_name, 'Farmer') as full_name,
    SUM(re.entry_count) as total_entries,
    COUNT(re.id) as entry_count
  FROM raffle_entries re
  LEFT JOIN user_profiles up ON up.id = re.user_id
  WHERE re.raffle_id = v_raffle_id
  GROUP BY re.user_id, up.full_name
  ORDER BY total_entries DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- 9. FUNCTION: Draw Raffle Winner (Admin only)
-- ============================================
CREATE OR REPLACE FUNCTION draw_raffle_winner(p_raffle_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raffle RECORD;
  v_winner RECORD;
  v_prize RECORD;
  v_total_participants INTEGER;
BEGIN
  -- Get raffle
  SELECT * INTO v_raffle
  FROM monthly_raffles
  WHERE id = p_raffle_id AND status = 'active';

  IF v_raffle IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Raffle not found or not active');
  END IF;

  -- Get total participants
  SELECT COUNT(DISTINCT user_id) INTO v_total_participants
  FROM raffle_entries
  WHERE raffle_id = p_raffle_id;

  IF v_total_participants = 0 THEN
    RETURN json_build_object('success', false, 'error', 'No participants in raffle');
  END IF;

  -- Weighted random selection based on entry count
  -- Each entry is a "ticket" in the draw
  WITH weighted_entries AS (
    SELECT
      re.user_id,
      up.full_name,
      SUM(re.entry_count) as entries,
      random() * SUM(re.entry_count) as weighted_random
    FROM raffle_entries re
    LEFT JOIN user_profiles up ON up.id = re.user_id
    WHERE re.raffle_id = p_raffle_id
    GROUP BY re.user_id, up.full_name
  ),
  cumulative AS (
    SELECT
      user_id,
      full_name,
      entries,
      SUM(entries) OVER (ORDER BY weighted_random) as cumulative_entries
    FROM weighted_entries
  )
  SELECT user_id, full_name, entries INTO v_winner
  FROM cumulative
  WHERE cumulative_entries >= (random() * (SELECT SUM(entries) FROM weighted_entries))
  ORDER BY cumulative_entries
  LIMIT 1;

  -- Get prize info
  SELECT * INTO v_prize
  FROM raffle_prizes
  WHERE id = v_raffle.prize_id;

  -- Update raffle with winner
  UPDATE monthly_raffles
  SET
    status = 'completed',
    winner_id = v_winner.user_id,
    winner_name = v_winner.full_name,
    drawn_at = now()
  WHERE id = p_raffle_id;

  -- Record in winners history
  INSERT INTO raffle_winners (
    raffle_id, user_id, prize_id, prize_name,
    entries_at_draw, total_participants
  )
  VALUES (
    p_raffle_id,
    v_winner.user_id,
    v_raffle.prize_id,
    COALESCE(v_prize.name, 'Solar Panel'),
    v_winner.entries,
    v_total_participants
  );

  RETURN json_build_object(
    'success', true,
    'winnerId', v_winner.user_id,
    'winnerName', v_winner.full_name,
    'winnerEntries', v_winner.entries,
    'totalParticipants', v_total_participants,
    'totalEntries', v_raffle.total_entries,
    'prizeName', v_prize.name
  );
END;
$$;

-- ============================================
-- 10. FUNCTION: Get Past Winners
-- ============================================
CREATE OR REPLACE FUNCTION get_raffle_past_winners(p_limit INTEGER DEFAULT 12)
RETURNS TABLE (
  raffle_id UUID,
  month INTEGER,
  year INTEGER,
  winner_id UUID,
  winner_name TEXT,
  prize_name TEXT,
  prize_image_url TEXT,
  total_entries INTEGER,
  total_participants INTEGER,
  drawn_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mr.id as raffle_id,
    mr.month,
    mr.year,
    mr.winner_id,
    mr.winner_name,
    COALESCE(rp.name, 'Prize') as prize_name,
    rp.image_url as prize_image_url,
    mr.total_entries,
    (SELECT COUNT(DISTINCT re.user_id)::INTEGER FROM raffle_entries re WHERE re.raffle_id = mr.id) as total_participants,
    mr.drawn_at
  FROM monthly_raffles mr
  LEFT JOIN raffle_prizes rp ON rp.id = mr.prize_id
  WHERE mr.status = 'completed' AND mr.winner_id IS NOT NULL
  ORDER BY mr.year DESC, mr.month DESC
  LIMIT p_limit;
END;
$$;

-- ============================================
-- 11. INSERT: Initial Solar Panel Prize
-- ============================================
INSERT INTO raffle_prizes (name, name_sw, description, description_sw, value_usd, sponsor)
VALUES (
  'Solar Panel Kit',
  'Kifurushi cha Paneli ya Jua',
  'A complete solar panel kit including panel, battery, and LED lights - perfect for powering your farm equipment and home lighting!',
  'Kifurushi kamili cha paneli ya jua ikiwa na paneli, betri, na taa za LED - kamilifu kwa kuwasha vifaa vya shamba na mwanga wa nyumbani!',
  150.00,
  'AgroAfrica'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- 12. TRIGGER: Award raffle entry on 30-day streak
-- ============================================
CREATE OR REPLACE FUNCTION trigger_award_streak_raffle_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Award raffle entry when user reaches 30-day streak
  IF NEW.current_streak >= 30 AND (OLD.current_streak IS NULL OR OLD.current_streak < 30) THEN
    PERFORM award_raffle_entry(
      NEW.user_id,
      'streak_30',
      'streak_milestone_30'
    );
  END IF;

  -- Bonus entry at 60-day streak
  IF NEW.current_streak >= 60 AND (OLD.current_streak IS NULL OR OLD.current_streak < 60) THEN
    PERFORM award_raffle_entry(
      NEW.user_id,
      'streak_60',
      'streak_milestone_60',
      2 -- 2 entries for 60-day streak
    );
  END IF;

  -- Bonus entry at 90-day streak
  IF NEW.current_streak >= 90 AND (OLD.current_streak IS NULL OR OLD.current_streak < 90) THEN
    PERFORM award_raffle_entry(
      NEW.user_id,
      'streak_90',
      'streak_milestone_90',
      3 -- 3 entries for 90-day streak
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Apply trigger to gamification_profiles (where streaks are tracked)
DROP TRIGGER IF EXISTS award_streak_raffle_entry ON gamification_profiles;
CREATE TRIGGER award_streak_raffle_entry
  AFTER UPDATE ON gamification_profiles
  FOR EACH ROW
  WHEN (NEW.current_streak IS DISTINCT FROM OLD.current_streak)
  EXECUTE FUNCTION trigger_award_streak_raffle_entry();

-- ============================================
-- 13. GRANT PERMISSIONS
-- ============================================
GRANT SELECT ON raffle_prizes TO authenticated;
GRANT SELECT ON monthly_raffles TO authenticated;
GRANT SELECT ON raffle_entries TO authenticated;
GRANT SELECT ON raffle_winners TO authenticated;

GRANT EXECUTE ON FUNCTION get_or_create_monthly_raffle() TO authenticated;
GRANT EXECUTE ON FUNCTION award_raffle_entry(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_raffle_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_raffle_leaderboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_raffle_past_winners(INTEGER) TO authenticated;
-- draw_raffle_winner should be admin only, not granted to authenticated
