-- Migration: Add category system to marketplace_listings
-- Run this AFTER schema-marketplace.sql

-- Add new columns for category system
ALTER TABLE marketplace_listings
  ADD COLUMN IF NOT EXISTS category_id TEXT,
  ADD COLUMN IF NOT EXISTS subcategory_id TEXT,
  ADD COLUMN IF NOT EXISTS product_name TEXT,
  ADD COLUMN IF NOT EXISTS minimum_order DECIMAL(10,2);

-- Update unit constraint to include more options
ALTER TABLE marketplace_listings
  DROP CONSTRAINT IF EXISTS marketplace_listings_unit_check;

ALTER TABLE marketplace_listings
  ADD CONSTRAINT marketplace_listings_unit_check
  CHECK (unit IN ('kg', 'bags', 'tonnes', 'crates', 'bunches', 'pieces', 'boxes', 'litres', 'trays', 'punnets', 'bales', 'bundles', 'packets'));

-- Add indexes for category filtering
CREATE INDEX IF NOT EXISTS idx_marketplace_category_id ON marketplace_listings(category_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_subcategory_id ON marketplace_listings(subcategory_id);

-- Migrate existing data: set product_name from crop_type for existing records
UPDATE marketplace_listings
SET product_name = crop_type
WHERE product_name IS NULL AND crop_type IS NOT NULL;

-- Add comment explaining the category system
COMMENT ON COLUMN marketplace_listings.category_id IS 'Category ID from the app category system (e.g., grains, vegetables, fruits)';
COMMENT ON COLUMN marketplace_listings.subcategory_id IS 'Subcategory ID (e.g., maize, rice, tomatoes)';
COMMENT ON COLUMN marketplace_listings.product_name IS 'Display name for the product';
COMMENT ON COLUMN marketplace_listings.minimum_order IS 'Minimum order quantity in the specified unit';
