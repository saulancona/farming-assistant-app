import { z } from 'zod';

// ============================================
// FIELD VALIDATION
// ============================================

export const fieldSchema = z.object({
  name: z.string()
    .min(1, 'Field name is required')
    .max(100, 'Field name must be less than 100 characters')
    .trim(),

  crop_type: z.string()
    .min(1, 'Crop type is required')
    .max(50, 'Crop type must be less than 50 characters')
    .trim(),

  area: z.number()
    .positive('Area must be a positive number')
    .max(100000, 'Area seems unreasonably large. Please check the value.')
    .finite('Area must be a valid number'),

  planting_date: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid planting date')
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return parsed >= oneYearAgo && parsed <= now;
    }, 'Planting date must be within the last year'),

  expected_harvest: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid harvest date')
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      return parsed >= now && parsed <= oneYearFromNow;
    }, 'Expected harvest must be between now and one year from now'),

  status: z.enum(['planned', 'planted', 'growing', 'harvested', 'fallow']),

  user_id: z.string().uuid('Invalid user ID'),
}).refine((data) => {
  const planting = new Date(data.planting_date);
  const harvest = new Date(data.expected_harvest);
  return harvest > planting;
}, {
  message: 'Expected harvest date must be after planting date',
  path: ['expected_harvest']
});

export type FieldInput = z.infer<typeof fieldSchema>;

// ============================================
// EXPENSE VALIDATION
// ============================================

export const expenseSchema = z.object({
  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .trim(),

  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim(),

  amount: z.number()
    .positive('Amount must be a positive number')
    .max(1000000000, 'Amount seems unreasonably large')
    .finite('Amount must be a valid number')
    .refine((val) => Number.isFinite(val) && val > 0, 'Amount must be greater than 0'),

  date: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid date')
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);
      return parsed >= twoYearsAgo && parsed <= now;
    }, 'Date must be within the last 2 years and not in the future'),

  field_id: z.string().uuid('Invalid field ID').optional().nullable(),
  field_name: z.string().max(100).optional().nullable(),
  user_id: z.string().uuid('Invalid user ID'),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

// ============================================
// INCOME VALIDATION
// ============================================

export const incomeSchema = z.object({
  source: z.string()
    .min(1, 'Source is required')
    .max(50, 'Source must be less than 50 characters')
    .trim(),

  description: z.string()
    .min(1, 'Description is required')
    .max(500, 'Description must be less than 500 characters')
    .trim(),

  amount: z.number()
    .positive('Amount must be a positive number')
    .max(1000000000, 'Amount seems unreasonably large')
    .finite('Amount must be a valid number'),

  date: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid date')
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(now.getFullYear() - 2);
      return parsed >= twoYearsAgo && parsed <= now;
    }, 'Date must be within the last 2 years and not in the future'),

  field_id: z.string().uuid('Invalid field ID').optional().nullable(),
  field_name: z.string().max(100).optional().nullable(),
  user_id: z.string().uuid('Invalid user ID'),
});

export type IncomeInput = z.infer<typeof incomeSchema>;

// ============================================
// TASK VALIDATION
// ============================================

export const taskSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),

  description: z.string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters')
    .trim(),

  due_date: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid due date')
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(now.getFullYear() + 1);
      return parsed <= oneYearFromNow;
    }, 'Due date must be within the next year'),

  priority: z.enum(['low', 'medium', 'high']),

  status: z.enum(['pending', 'in_progress', 'completed']),

  field_id: z.string().uuid('Invalid field ID').optional().nullable(),
  field_name: z.string().max(100).optional().nullable(),
  user_id: z.string().uuid('Invalid user ID'),
  completed_at: z.string().optional().nullable(),
});

export type TaskInput = z.infer<typeof taskSchema>;

// ============================================
// INVENTORY VALIDATION
// ============================================

export const inventoryItemSchema = z.object({
  name: z.string()
    .min(1, 'Item name is required')
    .max(100, 'Item name must be less than 100 characters')
    .trim(),

  category: z.string()
    .min(1, 'Category is required')
    .max(50, 'Category must be less than 50 characters')
    .trim(),

  quantity: z.number()
    .nonnegative('Quantity cannot be negative')
    .max(1000000, 'Quantity seems unreasonably large')
    .finite('Quantity must be a valid number'),

  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be less than 20 characters')
    .trim(),

  min_quantity: z.number()
    .nonnegative('Minimum quantity cannot be negative')
    .max(1000000, 'Minimum quantity seems unreasonably large')
    .finite('Minimum quantity must be a valid number')
    .optional()
    .nullable(),

  location: z.string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional()
    .nullable(),

  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  user_id: z.string().uuid('Invalid user ID'),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

// ============================================
// STORAGE BIN VALIDATION
// ============================================

export const storageBinSchema = z.object({
  name: z.string()
    .min(1, 'Bin name is required')
    .max(100, 'Bin name must be less than 100 characters')
    .trim(),

  crop_type: z.string()
    .min(1, 'Crop type is required')
    .max(50, 'Crop type must be less than 50 characters')
    .trim(),

  capacity: z.number()
    .positive('Capacity must be a positive number')
    .max(1000000, 'Capacity seems unreasonably large')
    .finite('Capacity must be a valid number'),

  current_amount: z.number()
    .nonnegative('Current amount cannot be negative')
    .max(1000000, 'Current amount seems unreasonably large')
    .finite('Current amount must be a valid number'),

  unit: z.string()
    .min(1, 'Unit is required')
    .max(20, 'Unit must be less than 20 characters')
    .trim(),

  storage_date: z.string()
    .refine((date) => {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime());
    }, 'Invalid storage date')
    .refine((date) => {
      const parsed = new Date(date);
      const now = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      return parsed >= oneYearAgo && parsed <= now;
    }, 'Storage date must be within the last year'),

  quality: z.enum(['excellent', 'good', 'fair', 'poor']),

  notes: z.string()
    .max(500, 'Notes must be less than 500 characters')
    .trim()
    .optional()
    .nullable(),

  user_id: z.string().uuid('Invalid user ID'),
}).refine((data) => {
  return data.current_amount <= data.capacity;
}, {
  message: 'Current amount cannot exceed capacity',
  path: ['current_amount']
});

export type StorageBinInput = z.infer<typeof storageBinSchema>;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validates data and returns formatted error messages
 */
export function validateData<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: true;
  data: T
} | {
  success: false;
  errors: Record<string, string[]>;
  message: string;
} {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string[]> = {};
  result.error.issues.forEach((err: any) => {
    const path = err.path.join('.');
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(err.message);
  });

  // Create a user-friendly summary message
  const firstError = result.error.issues[0];
  const message = firstError.message;

  return { success: false, errors, message };
}

/**
 * Gets all error messages as a flat array
 */
export function getErrorMessages(errors: Record<string, string[]>): string[] {
  return Object.values(errors).flat();
}

/**
 * Gets the first error message
 */
export function getFirstError(errors: Record<string, string[]>): string {
  const messages = getErrorMessages(errors);
  return messages[0] || 'Validation failed';
}
