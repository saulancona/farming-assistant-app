// Migration utility to move data from localStorage to IndexedDB
import { db } from './db';
import type { Field, Expense, Task } from '../types';

export async function migrateLocalStorageToIndexedDB() {
  try {
    // Check if migration has already been done
    const migrationKey = 'agroafrica_migrated_to_indexed_db';
    if (localStorage.getItem(migrationKey) === 'true') {
      console.log('✓ Data already migrated to IndexedDB');
      return;
    }

    console.log('Starting migration from localStorage to IndexedDB...');

    // Migrate fields
    const fieldsData = localStorage.getItem('agroafrica_fields');
    if (fieldsData) {
      const fields: Field[] = JSON.parse(fieldsData);
      await db.fields.bulkAdd(fields);
      console.log(`✓ Migrated ${fields.length} fields`);
    }

    // Migrate expenses
    const expensesData = localStorage.getItem('agroafrica_expenses');
    if (expensesData) {
      const expenses: Expense[] = JSON.parse(expensesData);
      await db.expenses.bulkAdd(expenses);
      console.log(`✓ Migrated ${expenses.length} expenses`);
    }

    // Migrate tasks
    const tasksData = localStorage.getItem('agroafrica_tasks');
    if (tasksData) {
      const tasks: Task[] = JSON.parse(tasksData);
      await db.tasks.bulkAdd(tasks);
      console.log(`✓ Migrated ${tasks.length} tasks`);
    }

    // Mark migration as complete
    localStorage.setItem(migrationKey, 'true');
    console.log('✓ Migration completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}
