// Offline-first database service using IndexedDB
// Stores data locally and syncs with Supabase when online

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { Field, Expense, Income, Task } from '../types';

// Define the database schema
// @ts-ignore - DBSchema type checking is too strict
interface AgroAfricaDB extends DBSchema {
  // @ts-ignore
  fields: {
    key: string;
    value: Field & { synced: boolean; lastModified: number };
    indexes: { 'by-synced': boolean };
  };
  // @ts-ignore
  expenses: {
    key: string;
    value: Expense & { synced: boolean; lastModified: number };
    indexes: { 'by-synced': boolean };
  };
  // @ts-ignore
  income: {
    key: string;
    value: Income & { synced: boolean; lastModified: number };
    indexes: { 'by-synced': boolean };
  };
  // @ts-ignore
  tasks: {
    key: string;
    value: Task & { synced: boolean; lastModified: number };
    indexes: { 'by-synced': boolean };
  };
  syncQueue: {
    key: number;
    value: {
      id: number;
      action: 'create' | 'update' | 'delete';
      store: 'fields' | 'expenses' | 'income' | 'tasks';
      data: any;
      timestamp: number;
    };
  };
  metadata: {
    key: string;
    value: {
      key: string;
      value: any;
    };
  };
}

let db: IDBPDatabase<AgroAfricaDB> | null = null;

// Initialize the database
export async function initOfflineDb(): Promise<IDBPDatabase<AgroAfricaDB>> {
  if (db) return db;

  db = await openDB<AgroAfricaDB>('agroafrica-offline', 1, {
    upgrade(database) {
      // Fields store
      const fieldsStore = database.createObjectStore('fields', { keyPath: 'id' });
      fieldsStore.createIndex('by-synced', 'synced');

      // Expenses store
      const expensesStore = database.createObjectStore('expenses', { keyPath: 'id' });
      expensesStore.createIndex('by-synced', 'synced');

      // Income store
      const incomeStore = database.createObjectStore('income', { keyPath: 'id' });
      incomeStore.createIndex('by-synced', 'synced');

      // Tasks store
      const tasksStore = database.createObjectStore('tasks', { keyPath: 'id' });
      tasksStore.createIndex('by-synced', 'synced');

      // Sync queue for offline changes
      database.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });

      // Metadata store for last sync time, etc.
      database.createObjectStore('metadata', { keyPath: 'key' });
    },
  });

  return db;
}

// Get the database instance
async function getDb(): Promise<IDBPDatabase<AgroAfricaDB>> {
  if (!db) {
    await initOfflineDb();
  }
  return db!;
}

// Check if online
export function isOnline(): boolean {
  return navigator.onLine;
}

// Generate a temporary ID for offline-created items
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// GENERIC CRUD OPERATIONS
// ============================================

type StoreName = 'fields' | 'expenses' | 'income' | 'tasks';

// Get all items from a store
export async function getAllFromStore<T>(storeName: StoreName): Promise<T[]> {
  const database = await getDb();
  const items = await database.getAll(storeName);
  // Remove sync metadata before returning
  return items.map(({ synced, lastModified, ...item }) => item as unknown as T);
}

// Get a single item from a store
export async function getFromStore<T>(storeName: StoreName, id: string): Promise<T | undefined> {
  const database = await getDb();
  const item = await database.get(storeName, id);
  if (!item) return undefined;
  const { synced, lastModified, ...data } = item;
  return data as unknown as T;
}

// Add item to a store
export async function addToStore<T extends { id: string }>(
  storeName: StoreName,
  item: T
): Promise<T> {
  const database = await getDb();

  const storeItem = {
    ...item,
    synced: isOnline(),
    lastModified: Date.now(),
  };

  await database.put(storeName, storeItem as any);

  // If offline, add to sync queue
  if (!isOnline()) {
    await addToSyncQueue('create', storeName, item);
  }

  return item;
}

// Update item in a store
export async function updateInStore<T extends { id: string }>(
  storeName: StoreName,
  id: string,
  updates: Partial<T>
): Promise<T> {
  const database = await getDb();

  const existing = await database.get(storeName, id);
  if (!existing) {
    throw new Error(`Item with id ${id} not found in ${storeName}`);
  }

  const updatedItem = {
    ...existing,
    ...updates,
    synced: isOnline(),
    lastModified: Date.now(),
  };

  await database.put(storeName, updatedItem as any);

  // If offline, add to sync queue
  if (!isOnline()) {
    await addToSyncQueue('update', storeName, { id, ...updates });
  }

  const { synced, lastModified, ...data } = updatedItem;
  return data as unknown as T;
}

// Delete item from a store
export async function deleteFromStore(storeName: StoreName, id: string): Promise<void> {
  const database = await getDb();

  await database.delete(storeName, id);

  // If offline, add to sync queue
  if (!isOnline()) {
    await addToSyncQueue('delete', storeName, { id });
  }
}

// ============================================
// SYNC QUEUE OPERATIONS
// ============================================

// Add operation to sync queue
async function addToSyncQueue(
  action: 'create' | 'update' | 'delete',
  store: StoreName,
  data: any
): Promise<void> {
  const database = await getDb();
  await database.add('syncQueue', {
    id: Date.now(),
    action,
    store,
    data,
    timestamp: Date.now(),
  });
}

// Get all pending sync operations
export async function getPendingSyncOperations(): Promise<any[]> {
  const database = await getDb();
  return database.getAll('syncQueue');
}

// Clear a sync operation after successful sync
export async function clearSyncOperation(id: number): Promise<void> {
  const database = await getDb();
  await database.delete('syncQueue', id);
}

// Get pending sync count
export async function getPendingSyncCount(): Promise<number> {
  const database = await getDb();
  return database.count('syncQueue');
}

// ============================================
// BULK OPERATIONS FOR INITIAL SYNC
// ============================================

// Bulk save items (used when syncing from server)
export async function bulkSaveToStore<T extends { id: string }>(
  storeName: StoreName,
  items: T[]
): Promise<void> {
  const database = await getDb();
  const tx = database.transaction(storeName, 'readwrite');

  for (const item of items) {
    await tx.store.put({
      ...item,
      synced: true,
      lastModified: Date.now(),
    } as any);
  }

  await tx.done;
}

// Clear all items from a store
export async function clearStore(storeName: StoreName): Promise<void> {
  const database = await getDb();
  await database.clear(storeName);
}

// ============================================
// METADATA OPERATIONS
// ============================================

// Save metadata
export async function setMetadata(key: string, value: any): Promise<void> {
  const database = await getDb();
  await database.put('metadata', { key, value });
}

// Get metadata
export async function getMetadata(key: string): Promise<any> {
  const database = await getDb();
  const item = await database.get('metadata', key);
  return item?.value;
}

// Get last sync time
export async function getLastSyncTime(): Promise<number | null> {
  return getMetadata('lastSyncTime');
}

// Set last sync time
export async function setLastSyncTime(time: number): Promise<void> {
  return setMetadata('lastSyncTime', time);
}

// ============================================
// SYNC STATUS
// ============================================

// Get sync status for UI display
export async function getSyncStatus(): Promise<{
  isOnline: boolean;
  pendingChanges: number;
  lastSyncTime: number | null;
}> {
  const pendingChanges = await getPendingSyncCount();
  const lastSyncTime = await getLastSyncTime();

  return {
    isOnline: isOnline(),
    pendingChanges,
    lastSyncTime,
  };
}

// Mark all items in a store as synced
export async function markStoreSynced(storeName: StoreName): Promise<void> {
  const database = await getDb();
  const tx = database.transaction(storeName, 'readwrite');
  const index = tx.store.index('by-synced');

  let cursor = await index.openCursor(IDBKeyRange.only(false));
  while (cursor) {
    const item = { ...cursor.value, synced: true };
    await cursor.update(item);
    cursor = await cursor.continue();
  }

  await tx.done;
}

// ============================================
// CONVENIENCE FUNCTIONS FOR EACH DATA TYPE
// ============================================

// Fields
export const offlineFields = {
  getAll: () => getAllFromStore<Field>('fields'),
  get: (id: string) => getFromStore<Field>('fields', id),
  add: (field: Field) => addToStore('fields', field),
  update: (id: string, updates: Partial<Field>) => updateInStore<Field>('fields', id, updates),
  delete: (id: string) => deleteFromStore('fields', id),
  bulkSave: (fields: Field[]) => bulkSaveToStore('fields', fields),
  clear: () => clearStore('fields'),
};

// Expenses
export const offlineExpenses = {
  getAll: () => getAllFromStore<Expense>('expenses'),
  get: (id: string) => getFromStore<Expense>('expenses', id),
  add: (expense: Expense) => addToStore('expenses', expense),
  update: (id: string, updates: Partial<Expense>) => updateInStore<Expense>('expenses', id, updates),
  delete: (id: string) => deleteFromStore('expenses', id),
  bulkSave: (expenses: Expense[]) => bulkSaveToStore('expenses', expenses),
  clear: () => clearStore('expenses'),
};

// Income
export const offlineIncome = {
  getAll: () => getAllFromStore<Income>('income'),
  get: (id: string) => getFromStore<Income>('income', id),
  add: (income: Income) => addToStore('income', income),
  update: (id: string, updates: Partial<Income>) => updateInStore<Income>('income', id, updates),
  delete: (id: string) => deleteFromStore('income', id),
  bulkSave: (income: Income[]) => bulkSaveToStore('income', income),
  clear: () => clearStore('income'),
};

// Tasks
export const offlineTasks = {
  getAll: () => getAllFromStore<Task>('tasks'),
  get: (id: string) => getFromStore<Task>('tasks', id),
  add: (task: Task) => addToStore('tasks', task),
  update: (id: string, updates: Partial<Task>) => updateInStore<Task>('tasks', id, updates),
  delete: (id: string) => deleteFromStore('tasks', id),
  bulkSave: (tasks: Task[]) => bulkSaveToStore('tasks', tasks),
  clear: () => clearStore('tasks'),
};
