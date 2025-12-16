-- Business Profiles Schema for AgroAfrica B2B Marketplace
-- This creates the infrastructure for user roles, verification, and seller ratings

-- ==========================================
-- Business Profiles Table
-- ==========================================

CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Business Information
  business_name TEXT,
  business_type TEXT NOT NULL DEFAULT 'farmer' CHECK (business_type IN ('farmer', 'buyer', 'aggregator', 'cooperative', 'exporter')),
  registration_number TEXT,
  tax_id TEXT,

  -- Contact & Location
  phone TEXT NOT NULL,
  whatsapp_number TEXT,
  email TEXT NOT NULL,
  address TEXT,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'KE',
  coordinates JSONB, -- {lat: number, lng: number}

  -- For Farmers/Sellers
  farm_size DECIMAL(10,2),
  farm_size_unit TEXT CHECK (farm_size_unit IN ('acres', 'hectares')),
  main_products TEXT[], -- category IDs
  production_capacity TEXT,
  certifications TEXT[],

  -- For Buyers
  buyer_type TEXT CHECK (buyer_type IN ('hotel', 'restaurant', 'supermarket', 'processor', 'exporter', 'wholesaler', 'retailer')),
  average_order_size TEXT,
  preferred_products TEXT[],

  -- Verification
  verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  verification_badges TEXT[] DEFAULT '{}',
  verified_at TIMESTAMP WITH TIME ZONE,
  verification_documents TEXT[],

  -- Ratings & Reputation
  rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  total_ratings INTEGER DEFAULT 0,
  total_transactions INTEGER DEFAULT 0,
  response_rate INTEGER CHECK (response_rate >= 0 AND response_rate <= 100),
  response_time TEXT,

  -- Profile
  bio TEXT,
  logo_url TEXT,
  cover_image_url TEXT,
  website TEXT,
  social_links JSONB, -- {facebook, instagram, twitter}

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_business_profiles_business_type ON business_profiles(business_type);
CREATE INDEX IF NOT EXISTS idx_business_profiles_verification_status ON business_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_business_profiles_country ON business_profiles(country);
CREATE INDEX IF NOT EXISTS idx_business_profiles_city ON business_profiles(city);
CREATE INDEX IF NOT EXISTS idx_business_profiles_rating ON business_profiles(rating DESC);

-- Enable RLS
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all active business profiles"
  ON business_profiles FOR SELECT
  USING (is_active = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own profile"
  ON business_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON business_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ==========================================
-- Seller Reviews Table
-- ==========================================

CREATE TABLE IF NOT EXISTS seller_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,

  -- Ratings (1-5)
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 5),
  quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),

  -- Review content
  title TEXT,
  comment TEXT NOT NULL,
  images TEXT[],

  -- Transaction details
  product_name TEXT,
  quantity DECIMAL(10,2),
  transaction_date DATE,

  -- Response from seller
  seller_response TEXT,
  seller_response_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate reviews for same transaction
  UNIQUE(seller_id, buyer_id, listing_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_seller_reviews_seller_id ON seller_reviews(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_buyer_id ON seller_reviews(buyer_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_listing_id ON seller_reviews(listing_id);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_overall_rating ON seller_reviews(overall_rating);
CREATE INDEX IF NOT EXISTS idx_seller_reviews_created_at ON seller_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE seller_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reviews"
  ON seller_reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON seller_reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Buyers can update their own reviews"
  ON seller_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = buyer_id)
  WITH CHECK (auth.uid() = buyer_id);

CREATE POLICY "Sellers can respond to their reviews"
  ON seller_reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- ==========================================
-- Functions
-- ==========================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_business_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS business_profiles_updated_at ON business_profiles;
CREATE TRIGGER business_profiles_updated_at
  BEFORE UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_business_profile_timestamp();

-- Function to recalculate seller rating
CREATE OR REPLACE FUNCTION recalculate_seller_rating(seller_uuid UUID)
RETURNS void AS $$
DECLARE
  avg_rating DECIMAL(2,1);
  review_count INTEGER;
BEGIN
  SELECT
    ROUND(AVG(overall_rating)::numeric, 1),
    COUNT(*)
  INTO avg_rating, review_count
  FROM seller_reviews
  WHERE seller_id = seller_uuid;

  UPDATE business_profiles
  SET
    rating = COALESCE(avg_rating, 0),
    total_ratings = COALESCE(review_count, 0)
  WHERE user_id = seller_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update seller rating when review is added/updated
CREATE OR REPLACE FUNCTION trigger_update_seller_rating()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_seller_rating(OLD.seller_id);
  ELSE
    PERFORM recalculate_seller_rating(NEW.seller_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_seller_rating_on_review ON seller_reviews;
CREATE TRIGGER update_seller_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON seller_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_seller_rating();

-- ==========================================
-- Update marketplace_listings to join with business_profiles
-- ==========================================

-- Add seller profile fields to marketplace listings (for efficient querying)
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS seller_business_name TEXT,
  ADD COLUMN IF NOT EXISTS seller_business_type TEXT,
  ADD COLUMN IF NOT EXISTS seller_rating DECIMAL(2,1),
  ADD COLUMN IF NOT EXISTS seller_total_ratings INTEGER,
  ADD COLUMN IF NOT EXISTS seller_verification_status TEXT,
  ADD COLUMN IF NOT EXISTS seller_badges TEXT[],
  ADD COLUMN IF NOT EXISTS seller_whatsapp TEXT;

-- Create index for seller filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_rating ON marketplace_listings(seller_rating DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller_verification ON marketplace_listings(seller_verification_status);

-- Function to sync seller info to listings
CREATE OR REPLACE FUNCTION sync_seller_info_to_listings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_listings ml
  SET
    seller_business_name = NEW.business_name,
    seller_business_type = NEW.business_type,
    seller_rating = NEW.rating,
    seller_total_ratings = NEW.total_ratings,
    seller_verification_status = NEW.verification_status,
    seller_badges = NEW.verification_badges,
    seller_whatsapp = NEW.whatsapp_number
  WHERE ml.user_id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS sync_seller_info ON business_profiles;
CREATE TRIGGER sync_seller_info
  AFTER INSERT OR UPDATE ON business_profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_seller_info_to_listings();

-- Function to increment review helpful count
CREATE OR REPLACE FUNCTION increment_review_helpful(review_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE seller_reviews
  SET helpful = helpful + 1
  WHERE id = review_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_review_helpful(UUID) TO authenticated;
