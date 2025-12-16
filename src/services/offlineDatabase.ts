// Offline-first database layer
// Uses IndexedDB as primary storage, syncs to Supabase when online
import { db } from './db';
import type { Field, Expense, Task } from '../types';
import { migrateLocalStorageToIndexedDB } from './migration';

// Track if migration has run
let migrationCompleted = false;

// Ensure migration runs once
async function ensureMigration() {
  if (!migrationCompleted) {
    await migrateLocalStorageToIndexedDB();
    migrationCompleted = true;
  }
}

// Helper to generate IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to add to sync queue
async function queueSync(operation: 'create' | 'update' | 'delete', entityType: 'field' | 'expense' | 'task', entityId: string, data?: any) {
  await db.syncQueue.add({
    operation,
    entityType,
    entityId,
    data,
    timestamp: Date.now()
  });
}

// ============================================
// FIELDS
// ============================================

export async function getFields(): Promise<Field[]> {
  await ensureMigration();
  const fields = await db.fields.toArray();
  return fields.sort((a, b) => new Date(b.plantingDate).getTime() - new Date(a.plantingDate).getTime());
}

export async function addField(field: Omit<Field, 'id'>): Promise<Field> {
  await ensureMigration();
  const newField: Field = {
    ...field,
    id: generateId()
  };

  await db.fields.add(newField);
  await queueSync('create', 'field', newField.id, newField);

  return newField;
}

export async function updateField(id: string, updates: Partial<Field>): Promise<Field> {
  await ensureMigration();
  await db.fields.update(id, updates);

  const updated = await db.fields.get(id);
  if (!updated) throw new Error('Field not found');

  await queueSync('update', 'field', id, updates);

  return updated;
}

export async function deleteField(id: string): Promise<void> {
  await ensureMigration();
  await db.fields.delete(id);
  await queueSync('delete', 'field', id);
}

// ============================================
// EXPENSES
// ============================================

export async function getExpenses(): Promise<Expense[]> {
  await ensureMigration();
  const expenses = await db.expenses.toArray();
  return expenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function addExpense(expense: Omit<Expense, 'id'>): Promise<Expense> {
  await ensureMigration();
  const newExpense: Expense = {
    ...expense,
    id: generateId()
  };

  await db.expenses.add(newExpense);
  await queueSync('create', 'expense', newExpense.id, newExpense);

  return newExpense;
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<Expense> {
  await ensureMigration();
  await db.expenses.update(id, updates);

  const updated = await db.expenses.get(id);
  if (!updated) throw new Error('Expense not found');

  await queueSync('update', 'expense', id, updates);

  return updated;
}

export async function deleteExpense(id: string): Promise<void> {
  await ensureMigration();
  await db.expenses.delete(id);
  await queueSync('delete', 'expense', id);
}

// ============================================
// TASKS
// ============================================

export async function getTasks(): Promise<Task[]> {
  await ensureMigration();
  const tasks = await db.tasks.toArray();
  return tasks.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

export async function addTask(task: Omit<Task, 'id'>): Promise<Task> {
  await ensureMigration();
  const newTask: Task = {
    ...task,
    id: generateId()
  };

  await db.tasks.add(newTask);
  await queueSync('create', 'task', newTask.id, newTask);

  return newTask;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task> {
  await ensureMigration();
  await db.tasks.update(id, updates);

  const updated = await db.tasks.get(id);
  if (!updated) throw new Error('Task not found');

  await queueSync('update', 'task', id, updates);

  return updated;
}

export async function deleteTask(id: string): Promise<void> {
  await ensureMigration();
  await db.tasks.delete(id);
  await queueSync('delete', 'task', id);
}

// ============================================
// SYNC QUEUE MANAGEMENT
// ============================================

export async function getSyncQueueSize(): Promise<number> {
  return await db.syncQueue.count();
}

export async function clearSyncQueue(): Promise<void> {
  await db.syncQueue.clear();
}

// Export for use in sync service
export { db };
