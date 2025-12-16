import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Field, Expense, Income, Task, InventoryItem, StorageBin } from '../types';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// Helper function to convert camelCase to snake_case
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

// ============================================
// QUERY HOOKS (Read Operations)
// ============================================

// Refetch interval for cross-app sync (30 seconds - optimized for battery life)
// Realtime subscriptions in App.tsx handle immediate updates
const REFETCH_INTERVAL = 30000;

export function useFields(userId: string | undefined) {
  return useQuery({
    queryKey: ['fields', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('fields')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as Field[];
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: false, // Don't waste battery when tab not focused
  });
}

export function useExpenses(userId: string | undefined) {
  return useQuery({
    queryKey: ['expenses', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as Expense[];
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useIncome(userId: string | undefined) {
  return useQuery({
    queryKey: ['income', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as Income[];
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useTasks(userId: string | undefined) {
  return useQuery({
    queryKey: ['tasks', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return toCamelCase(data) as Task[];
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useInventory(userId: string | undefined) {
  return useQuery({
    queryKey: ['inventory', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as InventoryItem[];
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

export function useStorageBins(userId: string | undefined) {
  return useQuery({
    queryKey: ['storage_bins', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('storage_bins')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as StorageBin[];
    },
    enabled: !!userId,
    refetchInterval: REFETCH_INTERVAL,
    refetchIntervalInBackground: true,
  });
}

// ============================================
// MUTATION HOOKS (Write Operations with Optimistic Updates)
// ============================================

// FIELDS
export function useCreateField(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (field: Omit<Field, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('fields')
        .insert({ ...toSnakeCase(field), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async (newField) => {
      await queryClient.cancelQueries({ queryKey: ['fields', userId] });
      const previousFields = queryClient.getQueryData(['fields', userId]);

      queryClient.setQueryData(['fields', userId], (old: Field[] = []) => [
        { ...newField, id: 'temp-' + Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Field,
        ...old
      ]);

      return { previousFields };
    },
    onError: (_err, _newField, context) => {
      if (context?.previousFields) {
        queryClient.setQueryData(['fields', userId], context.previousFields);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', userId] });
    },
  });
}

export function useUpdateField(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Field> }) => {
      const { data, error } = await supabase
        .from('fields')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['fields', userId] });
      const previousFields = queryClient.getQueryData(['fields', userId]);

      queryClient.setQueryData(['fields', userId], (old: Field[] = []) =>
        old.map(field => field.id === id ? { ...field, ...updates } : field)
      );

      return { previousFields };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousFields) {
        queryClient.setQueryData(['fields', userId], context.previousFields);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', userId] });
    },
  });
}

export function useDeleteField(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase
        .from('fields')
        .delete()
        .eq('id', fieldId)
        .eq('user_id', userId);
      if (error) throw error;
      return fieldId;
    },
    onMutate: async (fieldId) => {
      await queryClient.cancelQueries({ queryKey: ['fields', userId] });
      const previousFields = queryClient.getQueryData(['fields', userId]);

      queryClient.setQueryData(['fields', userId], (old: Field[] = []) =>
        old.filter(field => field.id !== fieldId)
      );

      return { previousFields };
    },
    onError: (_err, _fieldId, context) => {
      if (context?.previousFields) {
        queryClient.setQueryData(['fields', userId], context.previousFields);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['fields', userId] });
    },
  });
}

// EXPENSES
export function useCreateExpense(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<Expense, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...toSnakeCase(expense), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', userId] });
      const previousExpenses = queryClient.getQueryData(['expenses', userId]);

      queryClient.setQueryData(['expenses', userId], (old: Expense[] = []) => [
        { ...newExpense, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Expense,
        ...old
      ]);

      return { previousExpenses };
    },
    onError: (_err, _newExpense, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses', userId], context.previousExpenses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    },
  });
}

export function useDeleteExpense(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expenseId: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId)
        .eq('user_id', userId);
      if (error) throw error;
      return expenseId;
    },
    onMutate: async (expenseId) => {
      await queryClient.cancelQueries({ queryKey: ['expenses', userId] });
      const previousExpenses = queryClient.getQueryData(['expenses', userId]);

      queryClient.setQueryData(['expenses', userId], (old: Expense[] = []) =>
        old.filter(expense => expense.id !== expenseId)
      );

      return { previousExpenses };
    },
    onError: (_err, _expenseId, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses', userId], context.previousExpenses);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
    },
  });
}

// INCOME
export function useCreateIncome(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (income: Omit<Income, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('income')
        .insert({ ...toSnakeCase(income), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async (newIncome) => {
      await queryClient.cancelQueries({ queryKey: ['income', userId] });
      const previousIncome = queryClient.getQueryData(['income', userId]);

      queryClient.setQueryData(['income', userId], (old: Income[] = []) => [
        { ...newIncome, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Income,
        ...old
      ]);

      return { previousIncome };
    },
    onError: (_err, _newIncome, context) => {
      if (context?.previousIncome) {
        queryClient.setQueryData(['income', userId], context.previousIncome);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['income', userId] });
    },
  });
}

export function useDeleteIncome(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (incomeId: string) => {
      const { error } = await supabase
        .from('income')
        .delete()
        .eq('id', incomeId)
        .eq('user_id', userId);
      if (error) throw error;
      return incomeId;
    },
    onMutate: async (incomeId) => {
      await queryClient.cancelQueries({ queryKey: ['income', userId] });
      const previousIncome = queryClient.getQueryData(['income', userId]);

      queryClient.setQueryData(['income', userId], (old: Income[] = []) =>
        old.filter(income => income.id !== incomeId)
      );

      return { previousIncome };
    },
    onError: (_err, _incomeId, context) => {
      if (context?.previousIncome) {
        queryClient.setQueryData(['income', userId], context.previousIncome);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['income', userId] });
    },
  });
}

// TASKS
export function useCreateTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (task: Omit<Task, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ ...toSnakeCase(task), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async (newTask) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', userId] });
      const previousTasks = queryClient.getQueryData(['tasks', userId]);

      queryClient.setQueryData(['tasks', userId], (old: Task[] = []) => [
        { ...newTask, id: 'temp-' + Date.now(), created_at: new Date().toISOString() } as Task,
        ...old
      ]);

      return { previousTasks };
    },
    onError: (_err, _newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', userId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    },
  });
}

export function useUpdateTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', userId] });
      const previousTasks = queryClient.getQueryData(['tasks', userId]);

      queryClient.setQueryData(['tasks', userId], (old: Task[] = []) =>
        old.map(task => task.id === id ? { ...task, ...updates } : task)
      );

      return { previousTasks };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', userId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    },
  });
}

export function useDeleteTask(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', userId);
      if (error) throw error;
      return taskId;
    },
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ['tasks', userId] });
      const previousTasks = queryClient.getQueryData(['tasks', userId]);

      queryClient.setQueryData(['tasks', userId], (old: Task[] = []) =>
        old.filter(task => task.id !== taskId)
      );

      return { previousTasks };
    },
    onError: (_err, _taskId, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks', userId], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', userId] });
    },
  });
}

// INVENTORY
export function useCreateInventoryItem(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('inventory')
        .insert({ ...toSnakeCase(item), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async (newItem) => {
      await queryClient.cancelQueries({ queryKey: ['inventory', userId] });
      const previousInventory = queryClient.getQueryData(['inventory', userId]);

      queryClient.setQueryData(['inventory', userId], (old: InventoryItem[] = []) => [
        { ...newItem, id: 'temp-' + Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as InventoryItem,
        ...old
      ]);

      return { previousInventory };
    },
    onError: (_err, _newItem, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(['inventory', userId], context.previousInventory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

export function useUpdateInventoryItem(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      const { data, error } = await supabase
        .from('inventory')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['inventory', userId] });
      const previousInventory = queryClient.getQueryData(['inventory', userId]);

      queryClient.setQueryData(['inventory', userId], (old: InventoryItem[] = []) =>
        old.map(item => item.id === id ? { ...item, ...updates } : item)
      );

      return { previousInventory };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(['inventory', userId], context.previousInventory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

export function useDeleteInventoryItem(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', itemId)
        .eq('user_id', userId);
      if (error) throw error;
      return itemId;
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['inventory', userId] });
      const previousInventory = queryClient.getQueryData(['inventory', userId]);

      queryClient.setQueryData(['inventory', userId], (old: InventoryItem[] = []) =>
        old.filter(item => item.id !== itemId)
      );

      return { previousInventory };
    },
    onError: (_err, _itemId, context) => {
      if (context?.previousInventory) {
        queryClient.setQueryData(['inventory', userId], context.previousInventory);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory', userId] });
    },
  });
}

// STORAGE BINS
export function useCreateStorageBin(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bin: Omit<StorageBin, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('storage_bins')
        .insert({ ...toSnakeCase(bin), user_id: userId })
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async (newBin) => {
      await queryClient.cancelQueries({ queryKey: ['storage_bins', userId] });
      const previousBins = queryClient.getQueryData(['storage_bins', userId]);

      queryClient.setQueryData(['storage_bins', userId], (old: StorageBin[] = []) => [
        { ...newBin, id: 'temp-' + Date.now(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as StorageBin,
        ...old
      ]);

      return { previousBins };
    },
    onError: (_err, _newBin, context) => {
      if (context?.previousBins) {
        queryClient.setQueryData(['storage_bins', userId], context.previousBins);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_bins', userId] });
    },
  });
}

export function useUpdateStorageBin(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<StorageBin> }) => {
      const { data, error } = await supabase
        .from('storage_bins')
        .update(toSnakeCase(updates))
        .eq('id', id)
        .eq('user_id', userId)
        .select()
        .single();
      if (error) throw error;
      return toCamelCase(data);
    },
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['storage_bins', userId] });
      const previousBins = queryClient.getQueryData(['storage_bins', userId]);

      queryClient.setQueryData(['storage_bins', userId], (old: StorageBin[] = []) =>
        old.map(bin => bin.id === id ? { ...bin, ...updates } : bin)
      );

      return { previousBins };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousBins) {
        queryClient.setQueryData(['storage_bins', userId], context.previousBins);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_bins', userId] });
    },
  });
}

export function useDeleteStorageBin(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (binId: string) => {
      const { error } = await supabase
        .from('storage_bins')
        .delete()
        .eq('id', binId)
        .eq('user_id', userId);
      if (error) throw error;
      return binId;
    },
    onMutate: async (binId) => {
      await queryClient.cancelQueries({ queryKey: ['storage_bins', userId] });
      const previousBins = queryClient.getQueryData(['storage_bins', userId]);

      queryClient.setQueryData(['storage_bins', userId], (old: StorageBin[] = []) =>
        old.filter(bin => bin.id !== binId)
      );

      return { previousBins };
    },
    onError: (_err, _binId, context) => {
      if (context?.previousBins) {
        queryClient.setQueryData(['storage_bins', userId], context.previousBins);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['storage_bins', userId] });
    },
  });
}
