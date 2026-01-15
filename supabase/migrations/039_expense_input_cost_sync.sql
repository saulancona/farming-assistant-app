-- Migration: Link expenses to input costs for unified tracking
-- This allows input costs to automatically sync to the expenses table

-- Add source_input_cost_id column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS source_input_cost_id UUID REFERENCES input_costs(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_expenses_source_input_cost_id
ON expenses(source_input_cost_id)
WHERE source_input_cost_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN expenses.source_input_cost_id IS
'Links this expense to an input cost entry. When an input cost is added, a corresponding expense is automatically created. NULL for manually created expenses.';
