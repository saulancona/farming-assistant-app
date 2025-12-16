// IndexedDB database using Dexie
import Dexie, { type Table } from 'dexie';
import type { Field, Expense, Task } from '../types';

export type SyncEntityType = 'field' | 'expense' | 'task' | 'income' | 'inventory' | 'storage_bin';

export interface SyncQueueItem {
  id?: number;
  operation: 'create' | 'update' | 'delete';
  entityType: SyncEntityType;
  entityId: string;
  data?: Record<string, unknown>;
  timestamp: number;
  retryCount?: number;
}

export interface CachedWeather {
  id?: number;
  data: any;
  timestamp: number;
  location: string; // lat,lon key
}

export interface CachedMarketData {
  id?: number;
  data: any;
  timestamp: number;
}

export class AgroAfricaDB extends Dexie {
  fields!: Table<Field>;
  expenses!: Table<Expense>;
  tasks!: Table<Task>;
  syncQueue!: Table<SyncQueueItem>;
  weatherCache!: Table<CachedWeather>;
  marketCache!: Table<CachedMarketData>;

  constructor() {
    super('AgroAfricaDB');

    // Version 1: Original tables
    this.version(1).stores({
      fields: 'id, cropType, status, plantingDate',
      expenses: 'id, date, category, fieldId',
      tasks: 'id, dueDate, priority, status, fieldId',
      syncQueue: '++id, timestamp, entityType'
    });

    // Version 2: Add cache tables
    this.version(2).stores({
      weatherCache: '++id, location, timestamp',
      marketCache: '++id, timestamp'
    });

    // Version 3: Add retry count to sync queue
    this.version(3).stores({
      syncQueue: '++id, timestamp, entityType, retryCount'
    });
  }
}

export const db = new AgroAfricaDB();
