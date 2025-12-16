-- ============================================
-- SUPABASE SECURITY & PERFORMANCE FIXES
-- ============================================
-- This script addresses common security and performance warnings from Supabase advisors

-- ============================================
-- PART 1: SECURITY FIXES
-- ============================================

-- Fix overly permissive UPDATE/DELETE policies on knowledge_articles
-- The current policies allow anyone to update/delete, which is a security risk
DROP POLICY IF EXISTS "Authors can update their articles" ON knowledge_articles;
DROP POLICY IF EXISTS "Authors can delete their articles" ON knowledge_articles;

-- Create more secure policies - only allow updates/deletes if user is admin or original author
-- Since we don't have author_id, we'll restrict to authenticated users only
CREATE POLICY "Only authenticated users can update articles" ON knowledge_articles
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Only authenticated users can delete articles" ON knowledge_articles
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Add missing UPDATE policy for post_likes (security warning)
CREATE POLICY "Users cannot update likes" ON post_likes
  FOR UPDATE
  USING (false); -- Likes should only be inserted or deleted, never updated

-- Add missing UPDATE policy for article_likes (security warning)
CREATE POLICY "Users cannot update article likes" ON article_likes
  FOR UPDATE
  USING (false); -- Likes should only be inserted or deleted, never updated

-- Add missing UPDATE policy for article_bookmarks (security warning)
CREATE POLICY "Users cannot update bookmarks" ON article_bookmarks
  FOR UPDATE
  USING (false); -- Bookmarks should only be inserted or deleted, never updated

-- Add missing DELETE policy for conversations (security warning)
CREATE POLICY "Participants can delete conversations" ON conversations
  FOR DELETE
  USING (auth.uid() = ANY(participant_ids));

-- Add missing DELETE policy for messages (security warning)
CREATE POLICY "Senders can delete their messages" ON messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- ============================================
-- PART 2: PERFORMANCE FIXES - INDEXES
-- ============================================

-- Add composite indexes for common query patterns

-- For post_likes: improve performance when counting likes per post
CREATE INDEX IF NOT EXISTS idx_post_likes_post_user ON post_likes(post_id, user_id);

-- For article_likes: improve performance when counting likes per article
CREATE INDEX IF NOT EXISTS idx_article_likes_article_user ON article_likes(article_id, user_id);

-- For article_bookmarks: improve performance when fetching user bookmarks
CREATE INDEX IF NOT EXISTS idx_article_bookmarks_user_article ON article_bookmarks(user_id, article_id);

-- For messages: improve performance when fetching conversation messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- For post_comments: improve performance when fetching post comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_created ON post_comments(post_id, created_at DESC);

-- Add GIN index for text search on knowledge articles
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_title_content ON knowledge_articles USING GIN (to_tsvector('english', title || ' ' || content));

-- Add GIN index for text search on community posts
CREATE INDEX IF NOT EXISTS idx_community_posts_title_content ON community_posts USING GIN (to_tsvector('english', title || ' ' || content));

-- Add index for filtering articles by crops (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_crops ON knowledge_articles USING GIN (crops);

-- Add index for filtering posts by tags (GIN index for array operations)
CREATE INDEX IF NOT EXISTS idx_community_posts_tags ON community_posts USING GIN (tags);

-- ============================================
-- PART 3: PERFORMANCE FIXES - FUNCTION OPTIMIZATION
-- ============================================

-- Optimize trigger functions to use SECURITY DEFINER to avoid RLS overhead
-- This is safe because these functions only update counts

ALTER FUNCTION increment_post_likes_count() SECURITY DEFINER;
ALTER FUNCTION decrement_post_likes_count() SECURITY DEFINER;
ALTER FUNCTION increment_post_comments_count() SECURITY DEFINER;
ALTER FUNCTION decrement_post_comments_count() SECURITY DEFINER;
ALTER FUNCTION increment_article_likes_count() SECURITY DEFINER;
ALTER FUNCTION decrement_article_likes_count() SECURITY DEFINER;

-- Optimize the increment_article_views function
DROP FUNCTION IF EXISTS increment_article_views(UUID);

CREATE OR REPLACE FUNCTION increment_article_views(article_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for better performance
AS $$
BEGIN
  UPDATE knowledge_articles
  SET views = views + 1
  WHERE id = article_id_param;
END;
$$;

-- ============================================
-- PART 4: ADD MISSING CONSTRAINTS
-- ============================================

-- Add check constraints to ensure data integrity

-- Ensure likes_count and comments_count are never negative
ALTER TABLE community_posts
  ADD CONSTRAINT check_likes_count_positive CHECK (likes_count >= 0),
  ADD CONSTRAINT check_comments_count_positive CHECK (comments_count >= 0);

-- Ensure likes and views are never negative
ALTER TABLE knowledge_articles
  ADD CONSTRAINT check_likes_positive CHECK (likes >= 0),
  ADD CONSTRAINT check_views_positive CHECK (views >= 0);

-- Ensure participant_ids array is not empty in conversations
ALTER TABLE conversations
  ADD CONSTRAINT check_participants_not_empty CHECK (array_length(participant_ids, 1) > 0);

-- ============================================
-- PART 5: ADD HELPFUL FUNCTIONS
-- ============================================

-- Function to get conversation between two users (or create if not exists)
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  user1_id UUID,
  user2_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  conversation_id_result UUID;
BEGIN
  -- Try to find existing conversation
  SELECT id INTO conversation_id_result
  FROM conversations
  WHERE participant_ids @> ARRAY[user1_id, user2_id]
    AND array_length(participant_ids, 1) = 2;

  -- If not found, create new conversation
  IF conversation_id_result IS NULL THEN
    INSERT INTO conversations (participant_ids)
    VALUES (ARRAY[user1_id, user2_id])
    RETURNING id INTO conversation_id_result;
  END IF;

  RETURN conversation_id_result;
END;
$$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION mark_messages_read(
  conversation_id_param UUID,
  user_id_param UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE messages
  SET read = true
  WHERE conversation_id = conversation_id_param
    AND sender_id != user_id_param
    AND read = false;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;

-- ============================================
-- PART 6: VACUUM AND ANALYZE
-- ============================================

-- Note: These should be run separately after the schema changes
-- Run VACUUM ANALYZE on all tables to update statistics for query planner

-- VACUUM ANALYZE community_posts;
-- VACUUM ANALYZE post_likes;
-- VACUUM ANALYZE post_comments;
-- VACUUM ANALYZE conversations;
-- VACUUM ANALYZE messages;
-- VACUUM ANALYZE knowledge_articles;
-- VACUUM ANALYZE article_likes;
-- VACUUM ANALYZE article_bookmarks;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- After running this script, verify the changes:

-- Check all RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- Check all indexes
-- SELECT schemaname, tablename, indexname, indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
-- ORDER BY tablename, indexname;

-- Check all constraints
-- SELECT conname, contype, conrelid::regclass AS table_name, pg_get_constraintdef(oid) AS definition
-- FROM pg_constraint
-- WHERE conrelid::regclass::text IN (
--   'community_posts', 'post_likes', 'post_comments', 'conversations',
--   'messages', 'knowledge_articles', 'article_likes', 'article_bookmarks'
-- )
-- ORDER BY table_name, conname;
