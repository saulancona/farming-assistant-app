/**
 * React hook for offline sync functionality
 */

import { useState, useEffect, useCallback } from 'react';
import {
  queueOperation,
  processSyncQueue,
  getPendingCount,
  startAutoSync,
  stopAutoSync,
  type SyncEntityType,
} from '../services/offlineSync';

interface UseSyncQueueOptions {
  autoSync?: boolean;
  syncInterval?: number;
}

interface SyncState {
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncResult?: { processed: number; failed: number };
}

/**
 * Hook for managing offline sync queue
 */
export function useOfflineSyncQueue(options: UseSyncQueueOptions = {}) {
  const { autoSync = true, syncInterval = 30000 } = options;

  const [state, setState] = useState<SyncState>({
    pendingCount: 0,
    isOnline: navigator.onLine,
    isSyncing: false,
  });

  // Update pending count
  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingCount();
    setState((prev) => ({ ...prev, pendingCount: count }));
  }, []);

  // Queue an operation
  const queue = useCallback(
    async (
      operation: 'create' | 'update' | 'delete',
      entityType: SyncEntityType,
      entityId: string,
      data?: Record<string, unknown>
    ) => {
      await queueOperation(operation, entityType, entityId, data);
      await refreshPendingCount();
    },
    [refreshPendingCount]
  );

  // Manual sync trigger
  const sync = useCallback(async () => {
    setState((prev) => ({ ...prev, isSyncing: true }));
    const result = await processSyncQueue();
    setState((prev) => ({
      ...prev,
      isSyncing: false,
      lastSyncResult: result,
    }));
    await refreshPendingCount();
    return result;
  }, [refreshPendingCount]);

  // Setup event listeners
  useEffect(() => {
    const handleOnline = () => {
      setState((prev) => ({ ...prev, isOnline: true }));
      if (autoSync) {
        processSyncQueue().then(refreshPendingCount);
      }
    };

    const handleOffline = () => {
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    const handleSyncComplete = (event: Event) => {
      const { processed, failed } = (event as CustomEvent).detail;
      setState((prev) => ({
        ...prev,
        isSyncing: false,
        lastSyncResult: { processed, failed },
      }));
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('syncComplete', handleSyncComplete);

    // Initial count
    refreshPendingCount();

    // Start auto sync if enabled
    if (autoSync) {
      startAutoSync(syncInterval);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('syncComplete', handleSyncComplete);
      if (autoSync) {
        stopAutoSync();
      }
    };
  }, [autoSync, syncInterval, refreshPendingCount]);

  return {
    ...state,
    queue,
    sync,
    refreshPendingCount,
  };
}

/**
 * Simple hook to check if offline sync is needed
 */
export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get initial pending count
    getPendingCount().then(setPendingCount);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, pendingCount, hasPending: pendingCount > 0 };
}
