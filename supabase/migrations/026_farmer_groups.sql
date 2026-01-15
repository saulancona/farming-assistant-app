-- Farmer Groups (Communities) Migration
-- Version: 026
-- Description: Adds support for multiple farmer communities/groups that users can join

-- ============================================
-- FARMER GROUPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS farmer_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('crop_specific', 'regional', 'organic', 'livestock', 'technology', 'marketing', 'women_farmers', 'youth_farmers', 'general')),
    cover_image_url TEXT,
    icon_emoji TEXT DEFAULT '🌾',

    -- Group stats
    member_count INTEGER NOT NULL DEFAULT 0,
    post_count INTEGER NOT NULL DEFAULT 0,

    -- Group settings
    is_public BOOLEAN NOT NULL DEFAULT true,
    requires_approval BOOLEAN NOT NULL DEFAULT false,

    -- Creator info
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Location (optional for regional groups)
    region TEXT,
    country TEXT,

    -- Tags for discovery
    tags TEXT[] DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GROUP MEMBERSHIPS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES farmer_groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'banned')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- ============================================
-- UPDATE COMMUNITY_POSTS TO SUPPORT GROUPS
-- ============================================
-- Add group_id column to community_posts (nullable for posts in "All Community" feed)
ALTER TABLE community_posts
ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES farmer_groups(id) ON DELETE CASCADE;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_farmer_groups_category ON farmer_groups(category);
CREATE INDEX IF NOT EXISTS idx_farmer_groups_member_count ON farmer_groups(member_count DESC);
CREATE INDEX IF NOT EXISTS idx_farmer_groups_created_at ON farmer_groups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON group_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON group_memberships(group_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_group_id ON community_posts(group_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE farmer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;

-- Farmer groups - public groups visible to all, private to members only
CREATE POLICY "farmer_groups_select_public" ON farmer_groups
    FOR SELECT TO authenticated
    USING (is_public = true);

CREATE POLICY "farmer_groups_select_member" ON farmer_groups
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_memberships
            WHERE group_memberships.group_id = farmer_groups.id
            AND group_memberships.user_id = auth.uid()
            AND group_memberships.status = 'active'
        )
    );

CREATE POLICY "farmer_groups_insert" ON farmer_groups
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "farmer_groups_update" ON farmer_groups
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = created_by OR
        EXISTS (
            SELECT 1 FROM group_memberships
            WHERE group_memberships.group_id = farmer_groups.id
            AND group_memberships.user_id = auth.uid()
            AND group_memberships.role = 'admin'
        )
    );

CREATE POLICY "farmer_groups_delete" ON farmer_groups
    FOR DELETE TO authenticated
    USING (auth.uid() = created_by);

-- Group memberships - users can see their own memberships and group members
CREATE POLICY "group_memberships_select_own" ON group_memberships
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "group_memberships_select_group_members" ON group_memberships
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_memberships.group_id
            AND gm.user_id = auth.uid()
            AND gm.status = 'active'
        )
    );

CREATE POLICY "group_memberships_insert" ON group_memberships
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "group_memberships_update" ON group_memberships
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = user_id OR
        EXISTS (
            SELECT 1 FROM group_memberships gm
            WHERE gm.group_id = group_memberships.group_id
            AND gm.user_id = auth.uid()
            AND gm.role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "group_memberships_delete" ON group_memberships
    FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to join a group
CREATE OR REPLACE FUNCTION join_group(p_group_id UUID)
RETURNS group_memberships AS $$
DECLARE
    v_group farmer_groups;
    v_membership group_memberships;
    v_status TEXT;
BEGIN
    -- Get group info
    SELECT * INTO v_group FROM farmer_groups WHERE id = p_group_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Group not found';
    END IF;

    -- Determine membership status
    IF v_group.requires_approval THEN
        v_status := 'pending';
    ELSE
        v_status := 'active';
    END IF;

    -- Insert membership
    INSERT INTO group_memberships (group_id, user_id, status)
    VALUES (p_group_id, auth.uid(), v_status)
    ON CONFLICT (group_id, user_id) DO UPDATE
    SET status = v_status, joined_at = NOW()
    RETURNING * INTO v_membership;

    -- Update member count if active
    IF v_status = 'active' THEN
        UPDATE farmer_groups
        SET member_count = member_count + 1, updated_at = NOW()
        WHERE id = p_group_id;
    END IF;

    RETURN v_membership;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to leave a group
CREATE OR REPLACE FUNCTION leave_group(p_group_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Delete membership
    DELETE FROM group_memberships
    WHERE group_id = p_group_id AND user_id = auth.uid();

    -- Update member count
    UPDATE farmer_groups
    SET member_count = GREATEST(member_count - 1, 0), updated_at = NOW()
    WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create a group (creator automatically becomes admin)
CREATE OR REPLACE FUNCTION create_group(
    p_name TEXT,
    p_description TEXT,
    p_category TEXT,
    p_icon_emoji TEXT DEFAULT '🌾',
    p_is_public BOOLEAN DEFAULT true,
    p_requires_approval BOOLEAN DEFAULT false,
    p_tags TEXT[] DEFAULT '{}',
    p_region TEXT DEFAULT NULL,
    p_country TEXT DEFAULT NULL
)
RETURNS farmer_groups AS $$
DECLARE
    v_group farmer_groups;
BEGIN
    -- Create the group
    INSERT INTO farmer_groups (
        name, description, category, icon_emoji,
        is_public, requires_approval, tags,
        region, country, created_by, member_count
    )
    VALUES (
        p_name, p_description, p_category, p_icon_emoji,
        p_is_public, p_requires_approval, p_tags,
        p_region, p_country, auth.uid(), 1
    )
    RETURNING * INTO v_group;

    -- Add creator as admin
    INSERT INTO group_memberships (group_id, user_id, role, status)
    VALUES (v_group.id, auth.uid(), 'admin', 'active');

    RETURN v_group;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's joined groups
CREATE OR REPLACE FUNCTION get_user_groups()
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    cover_image_url TEXT,
    icon_emoji TEXT,
    member_count INTEGER,
    post_count INTEGER,
    is_public BOOLEAN,
    user_role TEXT,
    joined_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        fg.id,
        fg.name,
        fg.description,
        fg.category,
        fg.cover_image_url,
        fg.icon_emoji,
        fg.member_count,
        fg.post_count,
        fg.is_public,
        gm.role as user_role,
        gm.joined_at
    FROM farmer_groups fg
    JOIN group_memberships gm ON fg.id = gm.group_id
    WHERE gm.user_id = auth.uid() AND gm.status = 'active'
    ORDER BY gm.joined_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update post count when posts are added/removed
CREATE OR REPLACE FUNCTION update_group_post_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.group_id IS NOT NULL THEN
        UPDATE farmer_groups
        SET post_count = post_count + 1, updated_at = NOW()
        WHERE id = NEW.group_id;
    ELSIF TG_OP = 'DELETE' AND OLD.group_id IS NOT NULL THEN
        UPDATE farmer_groups
        SET post_count = GREATEST(post_count - 1, 0), updated_at = NOW()
        WHERE id = OLD.group_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_post_count ON community_posts;
CREATE TRIGGER trigger_update_group_post_count
AFTER INSERT OR DELETE ON community_posts
FOR EACH ROW
EXECUTE FUNCTION update_group_post_count();

-- ============================================
-- SEED DEFAULT GROUPS
-- ============================================
INSERT INTO farmer_groups (name, description, category, icon_emoji, tags, is_public) VALUES
    ('Maize Farmers Hub', 'Connect with fellow maize farmers. Share tips on planting, pest control, and harvesting techniques.', 'crop_specific', '🌽', ARRAY['maize', 'corn', 'cereals'], true),
    ('Tomato Growers Network', 'Everything about tomato farming - from seedlings to market. Disease management, irrigation, and best varieties.', 'crop_specific', '🍅', ARRAY['tomatoes', 'vegetables', 'horticulture'], true),
    ('Organic Farming Kenya', 'For farmers practicing or interested in organic farming methods. Certification, natural pesticides, composting.', 'organic', '🌿', ARRAY['organic', 'sustainable', 'certification'], true),
    ('Smart Farming & Tech', 'Discuss modern farming technologies, apps, drones, sensors, and precision agriculture.', 'technology', '📱', ARRAY['technology', 'smart farming', 'innovation'], true),
    ('Women in Agriculture', 'Empowering women farmers with knowledge, resources, and networking opportunities.', 'women_farmers', '👩‍🌾', ARRAY['women', 'empowerment', 'networking'], true),
    ('Youth Agripreneurs', 'Young farmers and agricultural entrepreneurs sharing ideas and opportunities.', 'youth_farmers', '🌱', ARRAY['youth', 'entrepreneurship', 'startups'], true),
    ('Dairy & Livestock Forum', 'For farmers keeping cattle, goats, poultry, and other livestock. Feed, health, breeding discussions.', 'livestock', '🐄', ARRAY['dairy', 'livestock', 'poultry', 'cattle'], true),
    ('Market & Sales Strategies', 'Tips on selling your produce, finding buyers, pricing, and market trends.', 'marketing', '💰', ARRAY['marketing', 'sales', 'pricing', 'buyers'], true),
    ('East Africa Farmers', 'Regional community for farmers across Kenya, Uganda, Tanzania, Rwanda, and beyond.', 'regional', '🌍', ARRAY['east africa', 'regional', 'cross-border'], true),
    ('Beans & Legumes Growers', 'Dedicated to bean, pea, groundnut, and other legume farmers. Varieties, storage, and markets.', 'crop_specific', '🫘', ARRAY['beans', 'legumes', 'pulses'], true)
ON CONFLICT DO NOTHING;
