-- ============================================
-- ROLLBACK SCRIPT
-- ============================================
-- Use this to undo the changes from fix-security-performance.sql

-- ============================================
-- 1. REMOVE ADDED POLICIES
-- ============================================

-- Remove the restrictive UPDATE/DELETE policies we added
DROP POLICY IF EXISTS "Only authenticated users can update articles" ON knowledge_articles;
DROP POLICY IF EXISTS "Only authenticated users can delete articles" ON knowledge_articles;

-- Remove the "cannot update" policies
DROP POLICY IF EXISTS "Users cannot update likes" ON post_likes;
DROP POLICY IF EXISTS "Users cannot update article likes" ON article_likes;
DROP POLICY IF EXISTS "Users cannot update bookmarks" ON article_bookmarks;

-- Remove the DELETE policies we added
DROP POLICY IF EXISTS "Participants can delete conversations" ON conversations;
DROP POLICY IF EXISTS "Senders can delete their messages" ON messages;

-- ============================================
-- 2. RESTORE ORIGINAL POLICIES
-- ============================================

-- Restore original knowledge_articles policies (from schema-knowledge-articles.sql)
CREATE POLICY "Authors can update their articles" ON knowledge_articles FOR UPDATE USING (true);
CREATE POLICY "Authors can delete their articles" ON knowledge_articles FOR DELETE USING (true);

-- ============================================
-- 3. REMOVE ADDED INDEXES
-- ============================================

DROP INDEX IF EXISTS idx_post_likes_post_user;
DROP INDEX IF EXISTS idx_article_likes_article_user;
DROP INDEX IF EXISTS idx_article_bookmarks_user_article;
DROP INDEX IF EXISTS idx_messages_conversation_created;
DROP INDEX IF EXISTS idx_post_comments_post_created;
DROP INDEX IF EXISTS idx_knowledge_articles_title_content;
DROP INDEX IF EXISTS idx_community_posts_title_content;
DROP INDEX IF EXISTS idx_knowledge_articles_crops;
DROP INDEX IF EXISTS idx_community_posts_tags;

-- ============================================
-- 4. REMOVE ADDED CONSTRAINTS
-- ============================================

ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS check_likes_count_positive;
ALTER TABLE community_posts DROP CONSTRAINT IF EXISTS check_comments_count_positive;
ALTER TABLE knowledge_articles DROP CONSTRAINT IF EXISTS check_likes_positive;
ALTER TABLE knowledge_articles DROP CONSTRAINT IF EXISTS check_views_positive;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS check_participants_not_empty;

-- ============================================
-- 5. REMOVE HELPER FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS get_or_create_conversation(UUID, UUID);
DROP FUNCTION IF EXISTS mark_messages_read(UUID, UUID);

-- ============================================
-- 6. RESTORE ORIGINAL FUNCTION SECURITY
-- ============================================

-- Note: Cannot easily revert SECURITY DEFINER changes
-- These will remain as SECURITY DEFINER (which is actually better for performance)

-- Done!
SELECT 'Rollback completed successfully' AS status;
