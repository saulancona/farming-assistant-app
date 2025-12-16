import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import * as db from '../services/database';
import type { Field, Expense, Income, Task, InventoryItem, StorageBin } from '../types';

/**
 * Custom hook for all farm CRUD operations
 * Centralizes database operations and cache invalidation
 */
export function useFarmOperations() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  // ============================================
  // FIELD OPERATIONS
  // ============================================

  const addField = async (field: Omit<Field, 'id'>) => {
    try {
      await db.addField(field);
      queryClient.invalidateQueries({ queryKey: ['fields', userId] });
      window.dispatchEvent(new Event('fieldsChanged'));
    } catch (error) {
      console.error('Error adding field:', error);
      toast.error('Failed to add field. Please try again.');
      throw error;
    }
  };

  const updateField = async (id: string, updates: Partial<Field>) => {
    try {
      await db.updateField(id, updates);
      queryClient.invalidateQueries({ queryKey: ['fields', userId] });
      window.dispatchEvent(new Event('fieldsChanged'));
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to update field. Please try again.');
      throw error;
    }
  };

  const deleteField = async (id: string) => {
    try {
      await db.deleteField(id);
      queryClient.invalidateQueries({ queryKey: ['fields', userId] });
      window.dispatchEvent(new Event('fieldsChanged'));
    } catch (error) {
      console.error('Error deleting field:', error);
      toast.error('Failed to delete field. Please try again.');
      throw error;
    }
  };

  // ============================================
  // EXPENSE OPERATIONS
  // ============================================

  const addExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      await db.addExpense(expense);
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense. Please try again.');
      throw error;
    }
  };

  const updateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      await db.updateExpense(id, updates);
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense. Please try again.');
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      await db.deleteExpense(id);
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense. Please try again.');
      throw error;
    }
  };

  // ============================================
  // INCOME OPERATIONS
  // ============================================

  const addIncome = async (incomeItem: Omit<Income, 'id'>) => {
    try {
      await db.addIncome(incomeItem);
      queryClient.invalidateQueries({ queryKey: ['income', userId] });
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income. Please try again.');
      throw error;
    }
  };

  const updateIncome = async (id: string, updates: Partial<Income>) => {
    try {
      await db.updateIncome(id, updates);
      queryClient.invalidateQueries({ queryKey: ['income', userId] });
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error('Failed to update income. Please try again.');
      throw error;
    }
  };

  const deleteIncome = async (id: string) => {
    try {
      await db.deleteIncome(id);
      queryClient.invalidateQueries({ queryKey: ['income', userId] });
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Failed to delete income. Please try again.');
      throw error;
    }
  };

  // ============================================
  // TASK OPERATIONS
  // ============================================

  const addTask = async (task: Omit<Task, 'id'>) => {
    try {
      await db.addTask(task);
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task. Please try again.');
      throw error;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await db.updateTask(id, updates);
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
      throw error;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await db.deleteTask(id);
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task. Please try again.');
      throw error;
    }
  };

  // ============================================
  // INVENTORY OPERATIONS
  // ============================================

  const addInventory = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      await db.addInventoryItem(item);
      queryClient.invalidateQueries({ queryKey: ['inventory', userId] });
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error('Failed to add inventory item. Please try again.');
      throw error;
    }
  };

  const updateInventory = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      await db.updateInventoryItem(id, updates);
      queryClient.invalidateQueries({ queryKey: ['inventory', userId] });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Failed to update inventory item. Please try again.');
      throw error;
    }
  };

  const deleteInventory = async (id: string) => {
    try {
      await db.deleteInventoryItem(id);
      queryClient.invalidateQueries({ queryKey: ['inventory', userId] });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast.error('Failed to delete inventory item. Please try again.');
      throw error;
    }
  };

  // ============================================
  // STORAGE BIN OPERATIONS
  // ============================================

  const addStorageBin = async (bin: Omit<StorageBin, 'id'>) => {
    try {
      await db.addStorageBin(bin);
      queryClient.invalidateQueries({ queryKey: ['storage_bins', userId] });
    } catch (error) {
      console.error('Error adding storage bin:', error);
      toast.error('Failed to add storage bin. Please try again.');
      throw error;
    }
  };

  const updateStorageBin = async (id: string, updates: Partial<StorageBin>) => {
    try {
      await db.updateStorageBin(id, updates);
      queryClient.invalidateQueries({ queryKey: ['storage_bins', userId] });
    } catch (error) {
      console.error('Error updating storage bin:', error);
      toast.error('Failed to update storage bin. Please try again.');
      throw error;
    }
  };

  const deleteStorageBin = async (id: string) => {
    try {
      await db.deleteStorageBin(id);
      queryClient.invalidateQueries({ queryKey: ['storage_bins', userId] });
    } catch (error) {
      console.error('Error deleting storage bin:', error);
      toast.error('Failed to delete storage bin. Please try again.');
      throw error;
    }
  };

  return {
    // Fields
    addField,
    updateField,
    deleteField,
    // Expenses
    addExpense,
    updateExpense,
    deleteExpense,
    // Income
    addIncome,
    updateIncome,
    deleteIncome,
    // Tasks
    addTask,
    updateTask,
    deleteTask,
    // Inventory
    addInventory,
    updateInventory,
    deleteInventory,
    // Storage Bins
    addStorageBin,
    updateStorageBin,
    deleteStorageBin,
  };
}
