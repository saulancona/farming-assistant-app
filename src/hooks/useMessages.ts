import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { Message, Conversation } from '../types';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// Refetch interval for messages (5 seconds for more responsive chat)
const REFETCH_INTERVAL = 5000;

/**
 * Hook to fetch all conversations for the current user
 * Enriches conversations with participant names from user_profiles
 */
export function useConversations() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Fetch conversations
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId])
        .order('last_message_at', { ascending: false });

      if (convError) throw convError;
      if (!convData || convData.length === 0) return [];

      // Get all unique participant IDs from ALL conversations
      const allParticipantIds = new Set<string>();
      convData.forEach((conv: { participant_ids: string[] }) => {
        conv.participant_ids.forEach(id => allParticipantIds.add(id));
      });

      // Create a map of user ID to name
      const nameMap = new Map<string, string>();

      // FIRST: Get names from messages (most reliable - stored when message was sent)
      const conversationIds = convData.map((c: { id: string }) => c.id);
      const { data: allMessages } = await supabase
        .from('messages')
        .select('sender_id, sender_name')
        .in('conversation_id', conversationIds);

      // Add sender names from messages (skip generic names)
      allMessages?.forEach((msg: { sender_id: string; sender_name: string }) => {
        if (msg.sender_name && msg.sender_name !== 'Anonymous' && msg.sender_name !== 'Farmer') {
          nameMap.set(msg.sender_id, msg.sender_name);
        }
      });

      // SECOND: Fetch profiles from user_profiles for any IDs we still don't have
      const allIds = Array.from(allParticipantIds);
      const stillMissingIds = allIds.filter(id => !nameMap.has(id));

      if (stillMissingIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .in('id', stillMissingIds);

        profiles?.forEach((p: { id: string; full_name: string | null; email: string | null }) => {
          const displayName = p.full_name || p.email?.split('@')[0];
          if (displayName) {
            nameMap.set(p.id, displayName);
          }
        });
      }

      // THIRD: Use RPC to get emails directly from auth.users for any still missing
      const finalMissingIds = allIds.filter(id => !nameMap.has(id));
      if (finalMissingIds.length > 0) {
        const { data: authEmails } = await supabase
          .rpc('get_user_emails', { user_ids: finalMissingIds });

        authEmails?.forEach((u: { id: string; email: string | null }) => {
          if (u.email) {
            nameMap.set(u.id, u.email.split('@')[0]);
          }
        });
      }

      // FOURTH: Fall back to stored participant_names for any still missing
      convData.forEach((conv: { participant_ids: string[]; participant_names?: string[] }) => {
        if (conv.participant_names) {
          conv.participant_ids.forEach((id, index) => {
            if (!nameMap.has(id)) {
              const name = conv.participant_names?.[index];
              if (name && name !== 'Farmer' && name !== 'Anonymous' && name !== 'Unknown') {
                nameMap.set(id, name);
              }
            }
          });
        }
      });

      // Enrich ALL conversations with looked up names
      // Always use freshly looked-up names to ensure they're current
      convData.forEach((conv: { participant_ids: string[]; participant_names?: string[] }) => {
        conv.participant_names = conv.participant_ids.map((id, index) => {
          // First try the name map (freshly looked up)
          const lookedUpName = nameMap.get(id);
          if (lookedUpName) return lookedUpName;

          // Fall back to existing name if it's valid
          const existingName = conv.participant_names?.[index];
          if (existingName && existingName !== 'Farmer' && existingName !== 'Anonymous' && existingName !== 'Unknown') {
            return existingName;
          }

          return 'Farmer';
        });
      });

      return toCamelCase(convData) as Conversation[];
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
  });
}

/**
 * Hook to fetch messages for a specific conversation
 */
export function useMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ['messages', conversationId],
    queryFn: async () => {
      if (!conversationId) return [];
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return toCamelCase(data) as Message[];
    },
    enabled: !!conversationId,
    refetchInterval: REFETCH_INTERVAL,
  });
}

/**
 * Hook to get total unread message count
 */
export function useUnreadCount() {
  const { user } = useAuth();
  const userId = user?.id;

  return useQuery({
    queryKey: ['unreadCount', userId],
    queryFn: async () => {
      if (!userId) return 0;

      // Get all conversations for user
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .contains('participant_ids', [userId]);

      if (convError) throw convError;
      if (!conversations?.length) return 0;

      const conversationIds = conversations.map((c: { id: string }) => c.id);

      // Count unread messages in those conversations (not sent by current user)
      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', conversationIds)
        .eq('read', false)
        .neq('sender_id', userId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
  });
}

/**
 * Hook to search farmers by name or email
 */
export function useSearchFarmers(query: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['searchFarmers', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];

      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, avatar_url, location')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .neq('id', user?.id || '')
        .limit(10);

      if (error) throw error;

      // Map results with fallback for display name
      return data.map((p: { id: string; full_name: string | null; email: string | null; avatar_url: string | null; location: string | null }) => ({
        id: p.id,
        fullName: p.full_name || p.email?.split('@')[0] || 'Farmer',
        avatarUrl: p.avatar_url,
        location: p.location,
      })) as Array<{
        id: string;
        fullName: string;
        avatarUrl?: string | null;
        location?: string | null;
      }>;
    },
    enabled: query.length >= 2,
  });
}

/**
 * Hook for messaging operations (send, mark as read, etc.)
 */
export function useMessagingOperations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  const sendMessageMutation = useMutation({
    mutationFn: async ({
      conversationId,
      content,
      recipientId,
    }: {
      conversationId?: string;
      content: string;
      recipientId?: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      // Get user's name from profile (with multiple fallbacks)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      let senderName = profile?.full_name || profile?.email?.split('@')[0];

      // If still no name, try to get email from auth.users
      if (!senderName) {
        const { data: authEmails } = await supabase
          .rpc('get_user_emails', { user_ids: [userId] });
        const authEmail = authEmails?.[0]?.email;
        senderName = authEmail?.split('@')[0] || 'Farmer';
      }

      // If no conversationId, create or find one
      let finalConversationId = conversationId;
      if (!finalConversationId && recipientId) {
        // Try to find existing conversation
        const { data: existing } = await supabase
          .from('conversations')
          .select('*')
          .contains('participant_ids', [userId, recipientId])
          .limit(1)
          .single();

        if (existing) {
          finalConversationId = existing.id;
        } else {
          // Create new conversation (only use columns that exist in schema)
          const { data: newConv, error: createError } = await supabase
            .from('conversations')
            .insert([{
              participant_ids: [userId, recipientId],
              last_message: content,
              last_message_at: new Date().toISOString(),
            }])
            .select()
            .single();

          if (createError) throw createError;
          finalConversationId = newConv.id;
        }
      }

      if (!finalConversationId) throw new Error('No conversation ID');

      // Insert the message
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert([{
          conversation_id: finalConversationId,
          sender_id: userId,
          sender_name: senderName,
          content,
          read: false,
        }])
        .select()
        .single();

      if (msgError) throw msgError;

      // Update conversation's last message
      await supabase
        .from('conversations')
        .update({
          last_message: content,
          last_message_at: new Date().toISOString(),
        })
        .eq('id', finalConversationId);

      return { message: toCamelCase(message), conversationId: finalConversationId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['messages', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
    onError: (error) => {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, conversationId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] });
    },
  });

  const startConversationMutation = useMutation({
    mutationFn: async ({
      recipientId,
      recipientName,
      initialMessage,
    }: {
      recipientId: string;
      recipientName: string;
      initialMessage?: string;
    }) => {
      if (!userId) throw new Error('User not authenticated');

      // Get user's name from profile (with multiple fallbacks)
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', userId)
        .single();

      let senderName = profile?.full_name || profile?.email?.split('@')[0];

      // If still no name, try to get email from auth.users
      if (!senderName) {
        const { data: authEmails } = await supabase
          .rpc('get_user_emails', { user_ids: [userId] });
        const authEmail = authEmails?.[0]?.email;
        senderName = authEmail?.split('@')[0] || 'Farmer';
      }

      // Check for existing conversation
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [userId, recipientId])
        .limit(1)
        .single();

      if (existing) {
        // Return enriched conversation with participant names in correct order
        // Match names to the order of IDs stored in the database
        const participantNames = existing.participant_ids.map((id: string) => {
          if (id === userId) return senderName;
          if (id === recipientId) return recipientName;
          return 'Unknown';
        });
        const enrichedExisting = {
          ...existing,
          participant_names: participantNames,
        };
        return toCamelCase(enrichedExisting) as Conversation;
      }

      // Create new conversation with participant names stored in DB
      const { data: newConv, error } = await supabase
        .from('conversations')
        .insert([{
          participant_ids: [userId, recipientId],
          participant_names: [senderName, recipientName],
          last_message: initialMessage || '',
          last_message_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;

      // If there's an initial message, send it
      if (initialMessage) {
        await supabase
          .from('messages')
          .insert([{
            conversation_id: newConv.id,
            sender_id: userId,
            sender_name: senderName,
            content: initialMessage,
            read: false,
          }]);

        await supabase
          .from('conversations')
          .update({
            last_message: initialMessage,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', newConv.id);
      }

      return toCamelCase(newConv) as Conversation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
    onError: (error) => {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    },
  });

  return {
    sendMessage: sendMessageMutation.mutateAsync,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutateAsync,
    startConversation: startConversationMutation.mutateAsync,
    isStartingConversation: startConversationMutation.isPending,
  };
}

/**
 * Hook to delete a conversation and its messages
 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async (conversationId: string) => {
      if (!userId) throw new Error('User not authenticated');

      // First delete all messages in the conversation
      const { error: msgError } = await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);

      if (msgError) throw msgError;

      // Then delete the conversation
      const { error: convError } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (convError) throw convError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
      queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] });
      toast.success('Conversation deleted');
    },
    onError: (error) => {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation');
    },
  });
}

/**
 * Hook to set up real-time subscriptions for messages
 * Automatically invalidates queries when new messages arrive
 */
export function useMessageSubscription(conversationId: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!conversationId || !userId) return;

    // Subscribe to new messages in this conversation
    const messageSubscription = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          // Invalidate the messages query to refetch
          queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
          // Also update conversations list for last message
          queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [conversationId, userId, queryClient]);
}

/**
 * Hook to set up real-time subscriptions for conversations list
 * Automatically updates when conversations change
 */
export function useConversationSubscription() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    // Subscribe to changes in messages table (for unread counts and last message)
    const messageSubscription = supabase
      .channel(`user-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        () => {
          // Refetch conversations to update last message and unread counts
          queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
          queryClient.invalidateQueries({ queryKey: ['unreadCount', userId] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          // Refetch conversations list
          queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(messageSubscription);
    };
  }, [userId, queryClient]);
}

export default useMessagingOperations;
