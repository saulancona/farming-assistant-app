-- Marketplace schema for AgroAfrica
-- This allows farmers to list crops for sale

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_location TEXT,
  user_contact TEXT,
  crop_type TEXT NOT NULL,
  variety TEXT,
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'bags', 'tonnes', 'crates', 'bunches', 'pieces')),
  price_per_unit DECIMAL(10,2) NOT NULL CHECK (price_per_unit > 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
  quality TEXT NOT NULL CHECK (quality IN ('premium', 'grade_a', 'grade_b', 'standard')),
  harvest_date DATE NOT NULL,
  available_from DATE NOT NULL,
  description TEXT,
  images TEXT[], -- Array of image URLs
  location TEXT NOT NULL,
  delivery_available BOOLEAN DEFAULT false,
  delivery_radius INTEGER, -- in km
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'sold', 'reserved', 'expired')),
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_marketplace_user_id ON marketplace_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_crop_type ON marketplace_listings(crop_type);
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_location ON marketplace_listings(location);
CREATE INDEX IF NOT EXISTS idx_marketplace_created_at ON marketplace_listings(created_at DESC);

-- Enable Row Level Security
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view active listings
CREATE POLICY "Anyone can view active marketplace listings"
  ON marketplace_listings
  FOR SELECT
  USING (status = 'active' OR auth.uid() = user_id);

-- Policy: Authenticated users can create listings
CREATE POLICY "Authenticated users can create marketplace listings"
  ON marketplace_listings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own listings
CREATE POLICY "Users can update their own marketplace listings"
  ON marketplace_listings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only delete their own listings
CREATE POLICY "Users can delete their own marketplace listings"
  ON marketplace_listings
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketplace_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on row update
DROP TRIGGER IF EXISTS marketplace_listings_updated_at ON marketplace_listings;
CREATE TRIGGER marketplace_listings_updated_at
  BEFORE UPDATE ON marketplace_listings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_updated_at();

-- Function to increment views count
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id_param UUID)
RETURNS void AS $$
BEGIN
  UPDATE marketplace_listings
  SET views_count = views_count + 1
  WHERE id = listing_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically expire old listings (run this periodically via cron job)
CREATE OR REPLACE FUNCTION expire_old_marketplace_listings()
RETURNS void AS $$
BEGIN
  UPDATE marketplace_listings
  SET status = 'expired'
  WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
