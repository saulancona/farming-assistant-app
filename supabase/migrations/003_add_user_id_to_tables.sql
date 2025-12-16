-- =====================================================
-- Add user_id to all shared tables for cross-app sync
-- =====================================================

-- Add user_id to tasks table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'tasks'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.tasks ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX idx_tasks_user_id ON public.tasks(user_id);
    END IF;
END $$;

-- Add user_id to fields table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'fields'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.fields ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX idx_fields_user_id ON public.fields(user_id);
    END IF;
END $$;

-- Add user_id to expenses table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'expenses'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.expenses ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX idx_expenses_user_id ON public.expenses(user_id);
    END IF;
END $$;

-- Add user_id to income table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'income'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.income ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE INDEX idx_income_user_id ON public.income(user_id);
    END IF;
END $$;

-- Update RLS policies for tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
CREATE POLICY "Users can create their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for fields
DROP POLICY IF EXISTS "Users can view their own fields" ON fields;
CREATE POLICY "Users can view their own fields"
  ON fields FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own fields" ON fields;
CREATE POLICY "Users can create their own fields"
  ON fields FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own fields" ON fields;
CREATE POLICY "Users can update their own fields"
  ON fields FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own fields" ON fields;
CREATE POLICY "Users can delete their own fields"
  ON fields FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for expenses
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own expenses" ON expenses;
CREATE POLICY "Users can create their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- Update RLS policies for income
DROP POLICY IF EXISTS "Users can view their own income" ON income;
CREATE POLICY "Users can view their own income"
  ON income FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own income" ON income;
CREATE POLICY "Users can create their own income"
  ON income FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own income" ON income;
CREATE POLICY "Users can update their own income"
  ON income FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own income" ON income;
CREATE POLICY "Users can delete their own income"
  ON income FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on all tables if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;

SELECT 'SUCCESS! user_id added to all tables and RLS policies updated' as result;
