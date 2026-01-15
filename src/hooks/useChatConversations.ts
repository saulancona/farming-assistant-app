import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ChatMessage } from '../services/gemini';

export interface ChatConversation {
  id: string;
  user_id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

// Fetch all conversations for a user
export function useChatConversations(userId: string | undefined) {
  return useQuery({
    queryKey: ['chatConversations', userId],
    queryFn: async (): Promise<ChatConversation[]> => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('chat_conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[ChatConversations] Error fetching:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Create a new conversation
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      title,
      messages = [],
    }: {
      userId: string;
      title: string;
      messages?: ChatMessage[];
    }): Promise<ChatConversation> => {
      const { data, error } = await supabase
        .from('chat_conversations')
        .insert({
          user_id: userId,
          title,
          messages,
        })
        .select()
        .single();

      if (error) {
        console.error('[ChatConversations] Error creating:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations', data.user_id] });
    },
  });
}

// Update a conversation (title or messages)
export function useUpdateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      userId,
      title,
      messages,
    }: {
      conversationId: string;
      userId: string;
      title?: string;
      messages?: ChatMessage[];
    }): Promise<ChatConversation> => {
      const updates: Partial<ChatConversation> = {
        updated_at: new Date().toISOString(),
      };

      if (title !== undefined) {
        updates.title = title;
      }

      if (messages !== undefined) {
        updates.messages = messages;
      }

      const { data, error } = await supabase
        .from('chat_conversations')
        .update(updates)
        .eq('id', conversationId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('[ChatConversations] Error updating:', error);
        throw error;
      }

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations', data.user_id] });
    },
  });
}

// Delete a conversation
export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      userId,
    }: {
      conversationId: string;
      userId: string;
    }): Promise<void> => {
      const { error } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);

      if (error) {
        console.error('[ChatConversations] Error deleting:', error);
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chatConversations', variables.userId] });
    },
  });
}

export default useChatConversations;
