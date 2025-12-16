-- =============================================
-- AGROAFRICA DATABASE MIGRATION
-- Run this in your Supabase SQL Editor
-- =============================================

-- =============================================
-- STEP 1: ADD USER_ID COLUMNS (if not exist)
-- =============================================

-- Add user_id to fields table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fields' AND column_name = 'user_id') THEN
        ALTER TABLE fields ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add user_id to expenses table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'user_id') THEN
        ALTER TABLE expenses ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add user_id to income table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'income' AND column_name = 'user_id') THEN
        ALTER TABLE income ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add user_id to tasks table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'user_id') THEN
        ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add user_id to inventory table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'user_id') THEN
        ALTER TABLE inventory ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add user_id to storage_bins table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'storage_bins' AND column_name = 'user_id') THEN
        ALTER TABLE storage_bins ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add user_id to community_posts table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'community_posts' AND column_name = 'user_id') THEN
        ALTER TABLE community_posts ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- Add user_id to marketplace_listings table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketplace_listings' AND column_name = 'user_id') THEN
        ALTER TABLE marketplace_listings ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- =============================================
-- STEP 2: CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_fields_user_id ON fields(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_income_user_id ON income(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_user_id ON inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_storage_bins_user_id ON storage_bins(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_user_id ON community_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_user_id ON marketplace_listings(user_id);

-- =============================================
-- STEP 3: ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STEP 4: DROP EXISTING PERMISSIVE POLICIES
-- =============================================

DROP POLICY IF EXISTS "Allow all operations on fields" ON fields;
DROP POLICY IF EXISTS "Allow all operations on expenses" ON expenses;
DROP POLICY IF EXISTS "Allow all operations on income" ON income;
DROP POLICY IF EXISTS "Allow all operations on tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all operations on inventory" ON inventory;
DROP POLICY IF EXISTS "Allow all operations on storage_bins" ON storage_bins;
DROP POLICY IF EXISTS "Allow all operations on community_posts" ON community_posts;
DROP POLICY IF EXISTS "Allow all operations on marketplace_listings" ON marketplace_listings;

-- =============================================
-- STEP 5: CREATE STRICT RLS POLICIES
-- =============================================

-- FIELDS: Users can only access their own fields
CREATE POLICY "Users can view own fields"
    ON fields FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own fields"
    ON fields FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own fields"
    ON fields FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own fields"
    ON fields FOR DELETE
    USING (auth.uid() = user_id);

-- EXPENSES: Users can only access their own expenses
CREATE POLICY "Users can view own expenses"
    ON expenses FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own expenses"
    ON expenses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own expenses"
    ON expenses FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own expenses"
    ON expenses FOR DELETE
    USING (auth.uid() = user_id);

-- INCOME: Users can only access their own income
CREATE POLICY "Users can view own income"
    ON income FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own income"
    ON income FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own income"
    ON income FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own income"
    ON income FOR DELETE
    USING (auth.uid() = user_id);

-- TASKS: Users can only access their own tasks
CREATE POLICY "Users can view own tasks"
    ON tasks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks"
    ON tasks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
    ON tasks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
    ON tasks FOR DELETE
    USING (auth.uid() = user_id);

-- INVENTORY: Users can only access their own inventory
CREATE POLICY "Users can view own inventory"
    ON inventory FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own inventory"
    ON inventory FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own inventory"
    ON inventory FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own inventory"
    ON inventory FOR DELETE
    USING (auth.uid() = user_id);

-- STORAGE_BINS: Users can only access their own storage bins
CREATE POLICY "Users can view own storage_bins"
    ON storage_bins FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own storage_bins"
    ON storage_bins FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own storage_bins"
    ON storage_bins FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own storage_bins"
    ON storage_bins FOR DELETE
    USING (auth.uid() = user_id);

-- COMMUNITY_POSTS: Anyone can view, only owner can modify
CREATE POLICY "Anyone can view community posts"
    ON community_posts FOR SELECT
    USING (true);

CREATE POLICY "Users can insert community posts"
    ON community_posts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own community posts"
    ON community_posts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own community posts"
    ON community_posts FOR DELETE
    USING (auth.uid() = user_id);

-- MARKETPLACE_LISTINGS: Anyone can view active, only owner can modify
CREATE POLICY "Anyone can view marketplace listings"
    ON marketplace_listings FOR SELECT
    USING (true);

CREATE POLICY "Users can insert marketplace listings"
    ON marketplace_listings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own marketplace listings"
    ON marketplace_listings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own marketplace listings"
    ON marketplace_listings FOR DELETE
    USING (auth.uid() = user_id);

-- =============================================
-- STEP 6: CREATE USER PROFILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    phone TEXT,
    email TEXT,
    language TEXT DEFAULT 'en',
    currency TEXT DEFAULT 'KES',
    farm_size_unit TEXT DEFAULT 'acres',
    location TEXT,
    region TEXT,
    country TEXT DEFAULT 'Kenya',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- =============================================
-- STEP 7: CREATE HELPER FUNCTIONS
-- =============================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, full_name, email, phone)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'full_name',
        NEW.email,
        NEW.phone
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment article views
CREATE OR REPLACE FUNCTION increment_article_views(article_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE knowledge_articles
    SET views = COALESCE(views, 0) + 1
    WHERE id = article_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment listing views
CREATE OR REPLACE FUNCTION increment_listing_views(listing_id_param UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE marketplace_listings
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = listing_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- MIGRATION COMPLETE!
-- =============================================
--
-- What this migration does:
-- 1. Adds user_id column to all user-specific tables
-- 2. Creates indexes for fast queries
-- 3. Enables Row Level Security (RLS)
-- 4. Creates strict policies so users only see their own data
-- 5. Creates a user_profiles table for storing preferences
-- 6. Sets up automatic profile creation on signup
--
-- IMPORTANT: After running this migration, existing data
-- without user_id will not be visible to users!
-- You may need to run an update to assign existing data
-- to specific users.
-- =============================================
