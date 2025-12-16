// Sync service to sync IndexedDB changes to Supabase when online
import { db } from './offlineDatabase';
import { supabase } from '../lib/supabase';
import type { SyncQueueItem } from './db';

let isSyncing = false;

// Helper function to convert camelCase to snake_case for Supabase
function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      acc[snakeKey] = toSnakeCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

export async function syncToSupabase(): Promise<{ success: boolean; synced: number; errors: number }> {
  if (isSyncing) {
    console.log('Sync already in progress...');
    return { success: false, synced: 0, errors: 0 };
  }

  if (!navigator.onLine) {
    console.log('Cannot sync - offline');
    return { success: false, synced: 0, errors: 0 };
  }

  isSyncing = true;
  let syncedCount = 0;
  let errorCount = 0;

  try {
    console.log('Starting sync to Supabase...');

    // Get all pending sync items
    const syncItems = await db.syncQueue.orderBy('timestamp').toArray();

    if (syncItems.length === 0) {
      console.log('✓ No items to sync');
      return { success: true, synced: 0, errors: 0 };
    }

    console.log(`Syncing ${syncItems.length} items...`);

    // Process each sync item
    for (const item of syncItems) {
      try {
        await processSyncItem(item);
        await db.syncQueue.delete(item.id!);
        syncedCount++;
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
        errorCount++;
      }
    }

    console.log(`✓ Sync complete: ${syncedCount} synced, ${errorCount} errors`);
    return { success: true, synced: syncedCount, errors: errorCount };
  } catch (error) {
    console.error('Sync error:', error);
    return { success: false, synced: syncedCount, errors: errorCount + 1 };
  } finally {
    isSyncing = false;
  }
}

async function processSyncItem(item: SyncQueueItem): Promise<void> {
  const tableName = `${item.entityType}s`; // e.g., 'fields', 'expenses', 'tasks'

  switch (item.operation) {
    case 'create':
      const createData = toSnakeCase(item.data);
      const { error: createError } = await supabase
        .from(tableName)
        .insert([createData]);

      if (createError) throw createError;
      break;

    case 'update':
      const updateData = toSnakeCase(item.data);
      const { error: updateError } = await supabase
        .from(tableName)
        .update(updateData)
        .eq('id', item.entityId);

      if (updateError) throw updateError;
      break;

    case 'delete':
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .eq('id', item.entityId);

      if (deleteError) throw deleteError;
      break;
  }
}

// Auto-sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('Connection restored - starting sync...');
    setTimeout(() => {
      syncToSupabase().then(result => {
        if (result.synced > 0) {
          // Could show a toast notification here
          console.log(`✓ Synced ${result.synced} changes to cloud`);
        }
      });
    }, 1000); // Wait 1 second to ensure connection is stable
  });
}

export async function getSyncStatus(): Promise<{ pending: number; isSyncing: boolean }> {
  const pending = await db.syncQueue.count();
  return { pending, isSyncing };
}
