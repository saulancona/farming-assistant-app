import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Hook to setup realtime subscriptions for live data updates
 * Integrates with React Query for automatic cache invalidation
 */
export function useRealtimeSubscriptions(user: User | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    // Subscribe to fields changes
    const fieldsChannel = supabase
      .channel('fields-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fields', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['fields', user.id] });
        }
      )
      .subscribe();

    // Subscribe to expenses changes
    const expensesChannel = supabase
      .channel('expenses-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['expenses', user.id] });
        }
      )
      .subscribe();

    // Subscribe to income changes
    const incomeChannel = supabase
      .channel('income-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'income', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['income', user.id] });
        }
      )
      .subscribe();

    // Subscribe to tasks changes
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
        }
      )
      .subscribe();

    // Subscribe to inventory changes
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['inventory', user.id] });
        }
      )
      .subscribe();

    // Subscribe to storage bins changes
    const storageChannel = supabase
      .channel('storage-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'storage_bins', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['storage_bins', user.id] });
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount or user change
    return () => {
      supabase.removeChannel(fieldsChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(incomeChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(storageChannel);
    };
  }, [user, queryClient]);
}
