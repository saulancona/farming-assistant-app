-- Migration: Add user_id to all tables and enable Row Level Security (RLS)
-- This ensures each user can only see and modify their own data

-- ============================================
-- ADD user_id COLUMNS
-- ============================================

-- Add user_id to fields table
ALTER TABLE fields
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to income table
ALTER TABLE income
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to storage_bins table
ALTER TABLE storage_bins
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to community_posts table (if exists)
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id to knowledge_articles table (if exists - for user-created articles)
-- Note: Seed articles should not have user_id, only user-created ones
ALTER TABLE knowledge_articles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================
-- CREATE INDEXES for user_id columns
-- ============================================

CREATE INDEX IF NOT EXISTS idx_fields_user_id ON fields(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_bins_user_id ON storage_bins(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_articles ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREATE RLS POLICIES (using DROP IF EXISTS to avoid errors)
-- ============================================

-- FIELDS policies
DROP POLICY IF EXISTS "Users can view their own fields" ON fields;
CREATE POLICY "Users can view their own fields" ON fields
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own fields" ON fields;
CREATE POLICY "Users can insert their own fields" ON fields
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own fields" ON fields;
CREATE POLICY "Users can update their own fields" ON fields
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own fields" ON fields;
CREATE POLICY "Users can delete their own fields" ON fields
  FOR DELETE USING (auth.uid() = user_id);

-- EXPENSES policies
DROP POLICY IF EXISTS "Users can view their own expenses" ON expenses;
CREATE POLICY "Users can view their own expenses" ON expenses
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own expenses" ON expenses;
CREATE POLICY "Users can insert their own expenses" ON expenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own expenses" ON expenses;
CREATE POLICY "Users can update their own expenses" ON expenses
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own expenses" ON expenses;
CREATE POLICY "Users can delete their own expenses" ON expenses
  FOR DELETE USING (auth.uid() = user_id);

-- INCOME policies
DROP POLICY IF EXISTS "Users can view their own income" ON income;
CREATE POLICY "Users can view their own income" ON income
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own income" ON income;
CREATE POLICY "Users can insert their own income" ON income
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own income" ON income;
CREATE POLICY "Users can update their own income" ON income
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own income" ON income;
CREATE POLICY "Users can delete their own income" ON income
  FOR DELETE USING (auth.uid() = user_id);

-- TASKS policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- INVENTORY policies
DROP POLICY IF EXISTS "Users can view their own inventory" ON inventory;
CREATE POLICY "Users can view their own inventory" ON inventory
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own inventory" ON inventory;
CREATE POLICY "Users can insert their own inventory" ON inventory
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own inventory" ON inventory;
CREATE POLICY "Users can update their own inventory" ON inventory
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own inventory" ON inventory;
CREATE POLICY "Users can delete their own inventory" ON inventory
  FOR DELETE USING (auth.uid() = user_id);

-- STORAGE_BINS policies
DROP POLICY IF EXISTS "Users can view their own storage bins" ON storage_bins;
CREATE POLICY "Users can view their own storage bins" ON storage_bins
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own storage bins" ON storage_bins;
CREATE POLICY "Users can insert their own storage bins" ON storage_bins
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own storage bins" ON storage_bins;
CREATE POLICY "Users can update their own storage bins" ON storage_bins
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own storage bins" ON storage_bins;
CREATE POLICY "Users can delete their own storage bins" ON storage_bins
  FOR DELETE USING (auth.uid() = user_id);

-- COMMUNITY_POSTS policies (all users can view, only owner can modify)
DROP POLICY IF EXISTS "Anyone can view community posts" ON community_posts;
CREATE POLICY "Anyone can view community posts" ON community_posts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own community posts" ON community_posts;
CREATE POLICY "Users can insert their own community posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own community posts" ON community_posts;
CREATE POLICY "Users can update their own community posts" ON community_posts
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own community posts" ON community_posts;
CREATE POLICY "Users can delete their own community posts" ON community_posts
  FOR DELETE USING (auth.uid() = user_id);

-- KNOWLEDGE_ARTICLES policies (all can view, only creator can modify user-created articles)
DROP POLICY IF EXISTS "Anyone can view knowledge articles" ON knowledge_articles;
CREATE POLICY "Anyone can view knowledge articles" ON knowledge_articles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own knowledge articles" ON knowledge_articles;
CREATE POLICY "Users can insert their own knowledge articles" ON knowledge_articles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own knowledge articles" ON knowledge_articles;
CREATE POLICY "Users can update their own knowledge articles" ON knowledge_articles
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own knowledge articles" ON knowledge_articles;
CREATE POLICY "Users can delete their own knowledge articles" ON knowledge_articles
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- NOTES FOR DEPLOYMENT
-- ============================================

-- IMPORTANT: After running this migration:
-- 1. Existing data will have NULL user_id - you may want to assign these to a specific user or delete them
-- 2. The app code must be updated to include user_id in all INSERT operations
-- 3. Community posts and messages tables need their own RLS policies (see schema-community-messages.sql)
-- 4. Test thoroughly with multiple user accounts before deploying to production
