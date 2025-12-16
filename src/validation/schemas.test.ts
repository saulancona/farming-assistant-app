import { describe, it, expect } from 'vitest';
import {
  fieldSchema,
  expenseSchema,
  incomeSchema,
  taskSchema,
  inventoryItemSchema,
  storageBinSchema,
  validateData,
  getErrorMessages,
  getFirstError,
} from './schemas';

// Helper to generate valid UUIDs
const validUUID = '550e8400-e29b-41d4-a716-446655440000';

// Helper to get date strings
const getDateString = (daysFromNow: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
};

describe('fieldSchema', () => {
  const validField = () => ({
    name: 'North Field',
    crop_type: 'Maize',
    area: 5.5,
    planting_date: getDateString(-30), // 30 days ago
    expected_harvest: getDateString(60), // 60 days from now
    status: 'growing' as const,
    user_id: validUUID,
  });

  describe('valid inputs', () => {
    it('should accept valid field data', () => {
      const result = fieldSchema.safeParse(validField());
      expect(result.success).toBe(true);
    });

    it('should accept all valid status values', () => {
      const statuses = ['planned', 'planted', 'growing', 'harvested', 'fallow'] as const;
      statuses.forEach((status) => {
        const result = fieldSchema.safeParse({ ...validField(), status });
        expect(result.success).toBe(true);
      });
    });

    it('should trim whitespace from name and crop_type', () => {
      const result = fieldSchema.safeParse({
        ...validField(),
        name: '  North Field  ',
        crop_type: '  Maize  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('North Field');
        expect(result.data.crop_type).toBe('Maize');
      }
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty name', () => {
      const result = fieldSchema.safeParse({ ...validField(), name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const result = fieldSchema.safeParse({ ...validField(), name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject empty crop_type', () => {
      const result = fieldSchema.safeParse({ ...validField(), crop_type: '' });
      expect(result.success).toBe(false);
    });

    it('should reject negative area', () => {
      const result = fieldSchema.safeParse({ ...validField(), area: -5 });
      expect(result.success).toBe(false);
    });

    it('should reject zero area', () => {
      const result = fieldSchema.safeParse({ ...validField(), area: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject area over 100000', () => {
      const result = fieldSchema.safeParse({ ...validField(), area: 100001 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid planting date', () => {
      const result = fieldSchema.safeParse({ ...validField(), planting_date: 'not-a-date' });
      expect(result.success).toBe(false);
    });

    it('should reject planting date more than 1 year ago', () => {
      const result = fieldSchema.safeParse({
        ...validField(),
        planting_date: getDateString(-400),
      });
      expect(result.success).toBe(false);
    });

    it('should reject planting date in the future', () => {
      const result = fieldSchema.safeParse({
        ...validField(),
        planting_date: getDateString(10),
        expected_harvest: getDateString(100),
      });
      expect(result.success).toBe(false);
    });

    it('should reject harvest date in the past', () => {
      const result = fieldSchema.safeParse({
        ...validField(),
        expected_harvest: getDateString(-10),
      });
      expect(result.success).toBe(false);
    });

    it('should reject harvest date more than 1 year in future', () => {
      const result = fieldSchema.safeParse({
        ...validField(),
        expected_harvest: getDateString(400),
      });
      expect(result.success).toBe(false);
    });

    it('should reject harvest date before planting date', () => {
      const result = fieldSchema.safeParse({
        ...validField(),
        planting_date: getDateString(-10),
        expected_harvest: getDateString(-20),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = fieldSchema.safeParse({ ...validField(), status: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid user_id', () => {
      const result = fieldSchema.safeParse({ ...validField(), user_id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });
  });
});

describe('expenseSchema', () => {
  const validExpense = () => ({
    category: 'Seeds',
    description: 'Maize seeds for North Field',
    amount: 5000,
    date: getDateString(-7), // 7 days ago
    field_id: validUUID,
    field_name: 'North Field',
    user_id: validUUID,
  });

  describe('valid inputs', () => {
    it('should accept valid expense data', () => {
      const result = expenseSchema.safeParse(validExpense());
      expect(result.success).toBe(true);
    });

    it('should accept expense without field_id', () => {
      const expense = validExpense();
      delete (expense as any).field_id;
      delete (expense as any).field_name;
      const result = expenseSchema.safeParse(expense);
      expect(result.success).toBe(true);
    });

    it('should accept null field_id', () => {
      const result = expenseSchema.safeParse({ ...validExpense(), field_id: null, field_name: null });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty category', () => {
      const result = expenseSchema.safeParse({ ...validExpense(), category: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty description', () => {
      const result = expenseSchema.safeParse({ ...validExpense(), description: '' });
      expect(result.success).toBe(false);
    });

    it('should reject description over 500 characters', () => {
      const result = expenseSchema.safeParse({ ...validExpense(), description: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = expenseSchema.safeParse({ ...validExpense(), amount: -100 });
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const result = expenseSchema.safeParse({ ...validExpense(), amount: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject amount over 1 billion', () => {
      const result = expenseSchema.safeParse({ ...validExpense(), amount: 1000000001 });
      expect(result.success).toBe(false);
    });

    it('should reject date more than 2 years ago', () => {
      const result = expenseSchema.safeParse({
        ...validExpense(),
        date: getDateString(-800),
      });
      expect(result.success).toBe(false);
    });

    it('should reject future date', () => {
      const result = expenseSchema.safeParse({
        ...validExpense(),
        date: getDateString(7),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('incomeSchema', () => {
  const validIncome = () => ({
    source: 'Crop Sale',
    description: 'Sold 50 bags of maize',
    amount: 150000,
    date: getDateString(-3),
    field_id: validUUID,
    field_name: 'North Field',
    user_id: validUUID,
  });

  describe('valid inputs', () => {
    it('should accept valid income data', () => {
      const result = incomeSchema.safeParse(validIncome());
      expect(result.success).toBe(true);
    });

    it('should accept income without field_id', () => {
      const result = incomeSchema.safeParse({
        ...validIncome(),
        field_id: null,
        field_name: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty source', () => {
      const result = incomeSchema.safeParse({ ...validIncome(), source: '' });
      expect(result.success).toBe(false);
    });

    it('should reject source over 50 characters', () => {
      const result = incomeSchema.safeParse({ ...validIncome(), source: 'a'.repeat(51) });
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const result = incomeSchema.safeParse({ ...validIncome(), amount: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const result = incomeSchema.safeParse({ ...validIncome(), date: 'invalid' });
      expect(result.success).toBe(false);
    });
  });
});

describe('taskSchema', () => {
  const validTask = () => ({
    title: 'Apply fertilizer',
    description: 'Apply NPK fertilizer to maize field',
    due_date: getDateString(7),
    priority: 'high' as const,
    status: 'pending' as const,
    field_id: validUUID,
    field_name: 'North Field',
    user_id: validUUID,
  });

  describe('valid inputs', () => {
    it('should accept valid task data', () => {
      const result = taskSchema.safeParse(validTask());
      expect(result.success).toBe(true);
    });

    it('should accept all priority values', () => {
      const priorities = ['low', 'medium', 'high'] as const;
      priorities.forEach((priority) => {
        const result = taskSchema.safeParse({ ...validTask(), priority });
        expect(result.success).toBe(true);
      });
    });

    it('should accept all status values', () => {
      const statuses = ['pending', 'in_progress', 'completed'] as const;
      statuses.forEach((status) => {
        const result = taskSchema.safeParse({ ...validTask(), status });
        expect(result.success).toBe(true);
      });
    });

    it('should accept task with past due date', () => {
      const result = taskSchema.safeParse({
        ...validTask(),
        due_date: getDateString(-7),
      });
      expect(result.success).toBe(true);
    });

    it('should accept completed_at field', () => {
      const result = taskSchema.safeParse({
        ...validTask(),
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty title', () => {
      const result = taskSchema.safeParse({ ...validTask(), title: '' });
      expect(result.success).toBe(false);
    });

    it('should reject title over 200 characters', () => {
      const result = taskSchema.safeParse({ ...validTask(), title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('should reject description over 1000 characters', () => {
      const result = taskSchema.safeParse({ ...validTask(), description: 'a'.repeat(1001) });
      expect(result.success).toBe(false);
    });

    it('should reject due date more than 1 year in future', () => {
      const result = taskSchema.safeParse({
        ...validTask(),
        due_date: getDateString(400),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid priority', () => {
      const result = taskSchema.safeParse({ ...validTask(), priority: 'urgent' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const result = taskSchema.safeParse({ ...validTask(), status: 'done' });
      expect(result.success).toBe(false);
    });
  });
});

describe('inventoryItemSchema', () => {
  const validInventory = () => ({
    name: 'NPK Fertilizer',
    category: 'Fertilizers',
    quantity: 50,
    unit: 'kg',
    min_quantity: 10,
    location: 'Storage Shed A',
    notes: 'Keep dry',
    user_id: validUUID,
  });

  describe('valid inputs', () => {
    it('should accept valid inventory data', () => {
      const result = inventoryItemSchema.safeParse(validInventory());
      expect(result.success).toBe(true);
    });

    it('should accept zero quantity', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), quantity: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept optional fields as null', () => {
      const result = inventoryItemSchema.safeParse({
        ...validInventory(),
        min_quantity: null,
        location: null,
        notes: null,
      });
      expect(result.success).toBe(true);
    });

    it('should accept without optional fields', () => {
      const inventory = validInventory();
      delete (inventory as any).min_quantity;
      delete (inventory as any).location;
      delete (inventory as any).notes;
      const result = inventoryItemSchema.safeParse(inventory);
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty name', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), name: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('should reject empty category', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), category: '' });
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), quantity: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject quantity over 1 million', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), quantity: 1000001 });
      expect(result.success).toBe(false);
    });

    it('should reject empty unit', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), unit: '' });
      expect(result.success).toBe(false);
    });

    it('should reject unit over 20 characters', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), unit: 'a'.repeat(21) });
      expect(result.success).toBe(false);
    });

    it('should reject negative min_quantity', () => {
      const result = inventoryItemSchema.safeParse({ ...validInventory(), min_quantity: -5 });
      expect(result.success).toBe(false);
    });
  });
});

describe('storageBinSchema', () => {
  const validStorageBin = () => ({
    name: 'Bin 1',
    crop_type: 'Maize',
    capacity: 1000,
    current_amount: 500,
    unit: 'kg',
    storage_date: getDateString(-30),
    quality: 'good' as const,
    notes: 'Stored after drying',
    user_id: validUUID,
  });

  describe('valid inputs', () => {
    it('should accept valid storage bin data', () => {
      const result = storageBinSchema.safeParse(validStorageBin());
      expect(result.success).toBe(true);
    });

    it('should accept all quality values', () => {
      const qualities = ['excellent', 'good', 'fair', 'poor'] as const;
      qualities.forEach((quality) => {
        const result = storageBinSchema.safeParse({ ...validStorageBin(), quality });
        expect(result.success).toBe(true);
      });
    });

    it('should accept current_amount equal to capacity', () => {
      const result = storageBinSchema.safeParse({
        ...validStorageBin(),
        capacity: 1000,
        current_amount: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('should accept zero current_amount', () => {
      const result = storageBinSchema.safeParse({ ...validStorageBin(), current_amount: 0 });
      expect(result.success).toBe(true);
    });

    it('should accept null notes', () => {
      const result = storageBinSchema.safeParse({ ...validStorageBin(), notes: null });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid inputs', () => {
    it('should reject empty name', () => {
      const result = storageBinSchema.safeParse({ ...validStorageBin(), name: '' });
      expect(result.success).toBe(false);
    });

    it('should reject empty crop_type', () => {
      const result = storageBinSchema.safeParse({ ...validStorageBin(), crop_type: '' });
      expect(result.success).toBe(false);
    });

    it('should reject negative capacity', () => {
      const result = storageBinSchema.safeParse({ ...validStorageBin(), capacity: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject zero capacity', () => {
      const result = storageBinSchema.safeParse({ ...validStorageBin(), capacity: 0 });
      expect(result.success).toBe(false);
    });

    it('should reject current_amount exceeding capacity', () => {
      const result = storageBinSchema.safeParse({
        ...validStorageBin(),
        capacity: 1000,
        current_amount: 1001,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorPaths = result.error.issues.map((i) => i.path.join('.'));
        expect(errorPaths).toContain('current_amount');
      }
    });

    it('should reject storage date more than 1 year ago', () => {
      const result = storageBinSchema.safeParse({
        ...validStorageBin(),
        storage_date: getDateString(-400),
      });
      expect(result.success).toBe(false);
    });

    it('should reject future storage date', () => {
      const result = storageBinSchema.safeParse({
        ...validStorageBin(),
        storage_date: getDateString(7),
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid quality', () => {
      const result = storageBinSchema.safeParse({ ...validStorageBin(), quality: 'bad' });
      expect(result.success).toBe(false);
    });
  });
});

describe('validateData helper', () => {
  it('should return success with data for valid input', () => {
    const validTask = {
      title: 'Test Task',
      description: 'Test description',
      due_date: getDateString(7),
      priority: 'medium' as const,
      status: 'pending' as const,
      user_id: validUUID,
    };

    const result = validateData(taskSchema, validTask);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Test Task');
    }
  });

  it('should return errors object for invalid input', () => {
    const invalidTask = {
      title: '',
      description: '',
      due_date: 'invalid',
      priority: 'invalid',
      status: 'invalid',
      user_id: 'not-a-uuid',
    };

    const result = validateData(taskSchema, invalidTask);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors).toBeDefined();
      expect(result.message).toBeDefined();
      expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    }
  });
});

describe('getErrorMessages helper', () => {
  it('should flatten error object into array', () => {
    const errors = {
      title: ['Title is required'],
      description: ['Description is required', 'Description too short'],
    };

    const messages = getErrorMessages(errors);
    expect(messages).toHaveLength(3);
    expect(messages).toContain('Title is required');
    expect(messages).toContain('Description is required');
    expect(messages).toContain('Description too short');
  });

  it('should return empty array for empty errors', () => {
    const messages = getErrorMessages({});
    expect(messages).toHaveLength(0);
  });
});

describe('getFirstError helper', () => {
  it('should return first error message', () => {
    const errors = {
      title: ['Title is required'],
      description: ['Description is required'],
    };

    const message = getFirstError(errors);
    expect(message).toBe('Title is required');
  });

  it('should return default message for empty errors', () => {
    const message = getFirstError({});
    expect(message).toBe('Validation failed');
  });
});
