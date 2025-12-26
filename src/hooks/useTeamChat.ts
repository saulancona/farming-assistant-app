import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { TeamMessage } from '../types';

/**
 * Team Chat Hook - Uses direct table operations (like working direct messaging)
 * instead of RPC functions for reliability
 */
export function useTeamChat(teamId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Use refs to track fetch state without causing re-renders
  const lastFetchedTeamId = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const isSendingRef = useRef(false);

  // Fetch messages using direct table query (more reliable than RPC)
  const fetchMessages = useCallback(async (forceRefetch = false) => {
    if (!teamId) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    // Prevent duplicate fetches (but allow if force refetch)
    if (isFetchingRef.current && !forceRefetch) {
      return;
    }

    // Skip if already fetched for this team (unless force)
    if (!forceRefetch && lastFetchedTeamId.current === teamId) {
      return;
    }

    isFetchingRef.current = true;

    try {
      console.log('[TeamChat] Fetching messages for team:', teamId);

      // Direct table query with joins (simpler and more reliable than RPC)
      const { data, error: fetchError } = await supabase
        .from('team_messages')
        .select(`
          id,
          team_id,
          sender_id,
          sender_name,
          content,
          message_type,
          created_at
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (fetchError) {
        console.error('[TeamChat] Error fetching messages:', fetchError);
        setError(fetchError);
        setMessages([]);
      } else {
        console.log('[TeamChat] Fetched messages:', data?.length || 0);

        // Convert snake_case to camelCase
        const convertedMessages: TeamMessage[] = (data || []).map((msg: any) => ({
          id: msg.id,
          teamId: msg.team_id,
          senderId: msg.sender_id,
          senderName: msg.sender_name,
          content: msg.content,
          messageType: msg.message_type as TeamMessage['messageType'],
          createdAt: msg.created_at,
        }));

        setMessages(convertedMessages);
        setError(null);
        lastFetchedTeamId.current = teamId;
      }
    } catch (err) {
      console.error('[TeamChat] Fetch error:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [teamId]);

  // Initial fetch when teamId changes
  useEffect(() => {
    if (teamId) {
      // Reset state for new team
      if (lastFetchedTeamId.current !== teamId) {
        setIsLoading(true);
        setMessages([]);
        lastFetchedTeamId.current = null; // Reset to allow fetch
      }
      fetchMessages();
    } else {
      setMessages([]);
      setIsLoading(false);
      lastFetchedTeamId.current = null;
    }
  }, [teamId, fetchMessages]);

  // Set up real-time subscription for new messages
  useEffect(() => {
    if (!teamId) return;

    console.log('[TeamChat] Setting up real-time subscription for team:', teamId);

    const channel = supabase
      .channel(`team_messages_${teamId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'team_messages',
          filter: `team_id=eq.${teamId}`,
        },
        (payload: any) => {
          console.log('[TeamChat] Real-time message received:', payload);
          const newMsg = payload.new as any;

          // Convert and add to messages
          const convertedMsg: TeamMessage = {
            id: newMsg.id,
            teamId: newMsg.team_id,
            senderId: newMsg.sender_id,
            senderName: newMsg.sender_name,
            content: newMsg.content,
            messageType: newMsg.message_type,
            createdAt: newMsg.created_at,
          };

          setMessages(prev => {
            // Avoid duplicates
            if (prev.some(m => m.id === convertedMsg.id)) {
              return prev;
            }
            return [...prev, convertedMsg];
          });
        }
      )
      .subscribe((status: string) => {
        console.log('[TeamChat] Subscription status:', status);
      });

    return () => {
      console.log('[TeamChat] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [teamId]);

  // Get sender name with multiple fallbacks (like direct messaging does)
  const getSenderName = useCallback(async (): Promise<string> => {
    if (!user?.id) return 'Team Member';

    try {
      // Try user_profiles first
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      if (profile?.full_name) {
        return profile.full_name;
      }

      if (profile?.email) {
        return profile.email.split('@')[0];
      }

      // Fallback to user email from auth
      if (user.email) {
        return user.email.split('@')[0];
      }

      return 'Team Member';
    } catch (err) {
      console.error('[TeamChat] Error getting sender name:', err);
      return user.email?.split('@')[0] || 'Team Member';
    }
  }, [user]);

  // Send message using direct table insert (like working direct messaging)
  const sendMessage = useCallback(async (content: string) => {
    if (!teamId || !content.trim()) {
      console.log('[TeamChat] Cannot send: missing teamId or empty content');
      return;
    }

    if (!user?.id) {
      toast.error('You must be logged in to send messages');
      return;
    }

    // Use ref to check if already sending (avoids stale state issues)
    if (isSendingRef.current) {
      console.log('[TeamChat] Already sending, skipping');
      return;
    }

    isSendingRef.current = true;
    setIsSending(true);

    try {
      console.log('[TeamChat] Sending message to team:', teamId);

      // Get sender name
      const senderName = await getSenderName();
      console.log('[TeamChat] Sender name:', senderName);

      // Direct table insert (like working direct messaging)
      const { data: newMessage, error: insertError } = await supabase
        .from('team_messages')
        .insert({
          team_id: teamId,
          sender_id: user.id,
          sender_name: senderName,
          content: content.trim(),
          message_type: 'text',
        })
        .select()
        .single();

      if (insertError) {
        console.error('[TeamChat] Error inserting message:', {
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint,
          code: insertError.code,
        });
        toast.error(`Failed to send: ${insertError.message}`);
      } else {
        console.log('[TeamChat] Message sent successfully:', newMessage?.id);

        // Add message to local state immediately (optimistic update)
        // Real-time subscription will also add it, but we check for duplicates
        if (newMessage) {
          const convertedMsg: TeamMessage = {
            id: newMessage.id,
            teamId: newMessage.team_id,
            senderId: newMessage.sender_id,
            senderName: newMessage.sender_name,
            content: newMessage.content,
            messageType: newMessage.message_type,
            createdAt: newMessage.created_at,
          };

          setMessages(prev => {
            if (prev.some(m => m.id === convertedMsg.id)) {
              return prev;
            }
            return [...prev, convertedMsg];
          });
        }
      }
    } catch (err) {
      console.error('[TeamChat] Send error:', err);
      toast.error('Failed to send message');
    } finally {
      isSendingRef.current = false;
      setIsSending(false);
    }
  }, [teamId, user, getSenderName]);

  // Manual refetch function (force refetch)
  const refetch = useCallback(async () => {
    isFetchingRef.current = false; // Reset fetch flag to allow refetch
    await fetchMessages(true);
  }, [fetchMessages]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    isSending,
    refetch,
    currentUserId: user?.id,
  };
}

export default useTeamChat;
