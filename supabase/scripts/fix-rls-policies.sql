-- Check if RLS is causing issues and fix
-- Run this in Supabase SQL Editor

-- First, check what policies exist
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename IN ('tasks', 'fields', 'expenses', 'income')
ORDER BY tablename, policyname;

-- Drop old policies that might be conflicting
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON tasks;
DROP POLICY IF EXISTS "Enable read access for all users" ON tasks;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON fields;
DROP POLICY IF EXISTS "Enable read access for all users" ON fields;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON expenses;
DROP POLICY IF EXISTS "Enable read access for all users" ON expenses;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON income;
DROP POLICY IF EXISTS "Enable read access for all users" ON income;

-- Make sure user_id column exists and RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

-- Create simple, permissive policies for testing
-- Tasks policies
DROP POLICY IF EXISTS "Allow authenticated users full access to tasks" ON tasks;
CREATE POLICY "Allow authenticated users full access to tasks"
  ON tasks
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fields policies
DROP POLICY IF EXISTS "Allow authenticated users full access to fields" ON fields;
CREATE POLICY "Allow authenticated users full access to fields"
  ON fields
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Expenses policies
DROP POLICY IF EXISTS "Allow authenticated users full access to expenses" ON expenses;
CREATE POLICY "Allow authenticated users full access to expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Income policies
DROP POLICY IF EXISTS "Allow authenticated users full access to income" ON income;
CREATE POLICY "Allow authenticated users full access to income"
  ON income
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

SELECT 'RLS policies fixed! Try again.' as result;
