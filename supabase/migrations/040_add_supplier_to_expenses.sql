-- Migration: Add supplier column to expenses table
-- This allows tracking which supplier provided the goods/services for each expense

-- Add supplier column to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Add comment for documentation
COMMENT ON COLUMN expenses.supplier IS
'Name of the supplier who provided the goods or services for this expense.';
