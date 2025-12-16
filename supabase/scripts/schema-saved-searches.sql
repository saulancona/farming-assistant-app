-- Saved Searches Schema for AgroAfrica B2B Marketplace
-- This enables buyers to save searches and receive alerts for matching products

-- ==========================================
-- Saved Searches Table
-- ==========================================

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Search name and description
  name TEXT NOT NULL,
  description TEXT,

  -- Search criteria (stored as JSONB for flexibility)
  criteria JSONB NOT NULL DEFAULT '{}',
  -- Example criteria structure:
  -- {
  --   "query": "maize",
  --   "categoryId": "grains",
  --   "subcategoryId": "maize",
  --   "location": "Nairobi",
  --   "priceMin": 50,
  --   "priceMax": 200,
  --   "quality": "grade_a",
  --   "deliveryOnly": true,
  --   "verifiedOnly": false
  -- }

  -- Alert settings
  alerts_enabled BOOLEAN DEFAULT true,
  alert_frequency TEXT DEFAULT 'daily' CHECK (alert_frequency IN ('instant', 'daily', 'weekly')),
  alert_method TEXT DEFAULT 'in_app' CHECK (alert_method IN ('in_app', 'email', 'sms', 'whatsapp')),

  -- Tracking
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_alert_sent_at TIMESTAMP WITH TIME ZONE,
  new_matches_count INTEGER DEFAULT 0,
  total_matches_found INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alerts_enabled ON saved_searches(alerts_enabled) WHERE alerts_enabled = true;
CREATE INDEX IF NOT EXISTS idx_saved_searches_is_active ON saved_searches(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own saved searches"
  ON saved_searches FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
  ON saved_searches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
  ON saved_searches FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
  ON saved_searches FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ==========================================
-- Search Match History Table
-- ==========================================
-- Tracks which listings matched a saved search (for showing "new" badges)

CREATE TABLE IF NOT EXISTS search_match_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id UUID NOT NULL REFERENCES saved_searches(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,

  -- When this match was found
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Has the user seen this match?
  is_viewed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMP WITH TIME ZONE,

  -- Prevent duplicate matches
  UNIQUE(saved_search_id, listing_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_search_match_history_saved_search_id ON search_match_history(saved_search_id);
CREATE INDEX IF NOT EXISTS idx_search_match_history_listing_id ON search_match_history(listing_id);
CREATE INDEX IF NOT EXISTS idx_search_match_history_is_viewed ON search_match_history(is_viewed) WHERE is_viewed = false;

-- Enable RLS
ALTER TABLE search_match_history ENABLE ROW LEVEL SECURITY;

-- Policies (users can only see matches for their saved searches)
CREATE POLICY "Users can view their own search matches"
  ON search_match_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_searches
      WHERE saved_searches.id = search_match_history.saved_search_id
      AND saved_searches.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own search matches"
  ON search_match_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM saved_searches
      WHERE saved_searches.id = search_match_history.saved_search_id
      AND saved_searches.user_id = auth.uid()
    )
  );

-- ==========================================
-- Functions
-- ==========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_saved_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_searches_updated_at ON saved_searches;
CREATE TRIGGER saved_searches_updated_at
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_search_timestamp();

-- Function to mark matches as viewed
CREATE OR REPLACE FUNCTION mark_search_matches_viewed(search_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE search_match_history
  SET is_viewed = true, viewed_at = NOW()
  WHERE saved_search_id = search_id AND is_viewed = false;

  UPDATE saved_searches
  SET new_matches_count = 0
  WHERE id = search_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get new matches count for a user
CREATE OR REPLACE FUNCTION get_user_new_matches_count(user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_count INTEGER;
BEGIN
  SELECT COALESCE(SUM(new_matches_count), 0)
  INTO total_count
  FROM saved_searches
  WHERE user_id = user_uuid AND is_active = true AND alerts_enabled = true;

  RETURN total_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
