/**
 * Offline Sync Service
 *
 * Manages queuing and syncing of operations when offline.
 * Uses Dexie (IndexedDB) for persistence and auto-syncs when online.
 */

import { db, type SyncQueueItem } from './db';
import { supabase } from '../lib/supabase';

// Supported entity types for offline sync
export type SyncEntityType = 'field' | 'expense' | 'income' | 'task' | 'inventory' | 'storage_bin';

// Table name mapping
const TABLE_MAP: Record<SyncEntityType, string> = {
  field: 'fields',
  expense: 'expenses',
  income: 'income',
  task: 'tasks',
  inventory: 'inventory',
  storage_bin: 'storage_bins',
};

// Track sync status
let isSyncing = false;
let syncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Add an operation to the sync queue
 */
export async function queueOperation(
  operation: 'create' | 'update' | 'delete',
  entityType: SyncEntityType,
  entityId: string,
  data?: Record<string, unknown>
): Promise<void> {
  await db.syncQueue.add({
    operation,
    entityType: entityType as 'field' | 'expense' | 'task',
    entityId,
    data,
    timestamp: Date.now(),
  });

  // Try to sync immediately if online
  if (navigator.onLine) {
    processSyncQueue();
  }
}

/**
 * Get pending operations count
 */
export async function getPendingCount(): Promise<number> {
  return db.syncQueue.count();
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(): Promise<SyncQueueItem[]> {
  return db.syncQueue.orderBy('timestamp').toArray();
}

/**
 * Process a single sync operation
 */
async function processSyncItem(item: SyncQueueItem): Promise<boolean> {
  const tableName = TABLE_MAP[item.entityType as SyncEntityType] || item.entityType + 's';

  try {
    switch (item.operation) {
      case 'create':
        if (item.data) {
          const { error: createError } = await supabase
            .from(tableName)
            .insert(item.data);
          if (createError) throw createError;
        }
        break;

      case 'update':
        if (item.data) {
          const { error: updateError } = await supabase
            .from(tableName)
            .update(item.data)
            .eq('id', item.entityId);
          if (updateError) throw updateError;
        }
        break;

      case 'delete':
        const { error: deleteError } = await supabase
          .from(tableName)
          .delete()
          .eq('id', item.entityId);
        if (deleteError) throw deleteError;
        break;
    }

    return true;
  } catch (error) {
    console.error(`Sync failed for ${item.entityType}/${item.entityId}:`, error);
    return false;
  }
}

/**
 * Process the sync queue
 */
export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
}> {
  if (isSyncing || !navigator.onLine) {
    return { processed: 0, failed: 0 };
  }

  isSyncing = true;
  let processed = 0;
  let failed = 0;

  try {
    const items = await db.syncQueue.orderBy('timestamp').toArray();

    for (const item of items) {
      const success = await processSyncItem(item);

      if (success) {
        // Remove from queue
        await db.syncQueue.delete(item.id!);
        processed++;
      } else {
        failed++;
      }
    }
  } finally {
    isSyncing = false;
  }

  // Dispatch event for UI updates
  window.dispatchEvent(
    new CustomEvent('syncComplete', {
      detail: { processed, failed },
    })
  );

  return { processed, failed };
}

/**
 * Clear all pending operations
 */
export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

/**
 * Start automatic sync polling
 */
export function startAutoSync(intervalMs: number = 30000): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  // Process immediately
  processSyncQueue();

  // Then poll periodically
  syncInterval = setInterval(() => {
    if (navigator.onLine) {
      processSyncQueue();
    }
  }, intervalMs);

  // Also process when coming back online
  window.addEventListener('online', processSyncQueue);
}

/**
 * Stop automatic sync polling
 */
export function stopAutoSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }

  window.removeEventListener('online', processSyncQueue);
}

/**
 * Check if currently syncing
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}

/**
 * Hook to use offline sync in components
 */
export function useOfflineSync() {
  return {
    queueOperation,
    processSyncQueue,
    getPendingCount,
    getPendingOperations,
    clearSyncQueue,
    startAutoSync,
    stopAutoSync,
    isSyncInProgress,
  };
}
