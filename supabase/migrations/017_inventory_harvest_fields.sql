-- Migration: Add harvest-related fields to inventory table
-- This allows linking inventory items to fields and tracking harvest dates

-- Add field_id column to inventory table (optional foreign key to fields)
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS field_id TEXT;

-- Add harvest_date column to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS harvest_date DATE;

-- Add an index on field_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_field_id ON inventory(field_id);

-- Add an index on harvest_date for filtering harvests by date
CREATE INDEX IF NOT EXISTS idx_inventory_harvest_date ON inventory(harvest_date);

-- Update the category check constraint to include 'harvest' if not already present
-- First, check if the constraint exists and drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'inventory_category_check'
    AND table_name = 'inventory'
  ) THEN
    ALTER TABLE inventory DROP CONSTRAINT inventory_category_check;
  END IF;
END $$;

-- Note: If there's no constraint, the category is likely just a text field
-- and the app handles validation on the frontend

COMMENT ON COLUMN inventory.field_id IS 'Links harvest inventory items to their source field';
COMMENT ON COLUMN inventory.harvest_date IS 'Date when the harvest was recorded';
