-- =====================================================
-- Migration 035: Chat Conversations Storage
-- =====================================================
-- Store farming chat conversations in Supabase for persistence
-- =====================================================

-- Create chat_conversations table
CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_messages CHECK (jsonb_typeof(messages) = 'array')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON chat_conversations(updated_at DESC);

-- Enable RLS
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can only access their own conversations
CREATE POLICY "Users can view their own conversations"
  ON chat_conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own conversations"
  ON chat_conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own conversations"
  ON chat_conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own conversations"
  ON chat_conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON chat_conversations TO authenticated;
