/**
 * Shared constants for AgroAfrica
 * Centralizes magic numbers, configuration values, and common options
 */

// API Configuration
export const API = {
  REFETCH_INTERVAL: 5000, // 5 seconds for cross-app sync
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second initial delay
} as const;

// Validation Limits
export const LIMITS = {
  MAX_FIELD_NAME_LENGTH: 100,
  MAX_CROP_TYPE_LENGTH: 50,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_TASK_TITLE_LENGTH: 200,
  MAX_TASK_DESCRIPTION_LENGTH: 1000,
  MAX_AREA: 100000,
  MAX_AMOUNT: 1000000000,
  MAX_QUANTITY: 1000000,
  MAX_UNIT_LENGTH: 20,
  MIN_LOCATION_SEARCH: 3,
} as const;

// Field Status Options
export const FIELD_STATUSES = ['planned', 'planted', 'growing', 'harvested', 'fallow'] as const;
export type FieldStatus = typeof FIELD_STATUSES[number];

// Task Priority Options
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

// Task Status Options
export const TASK_STATUSES = ['pending', 'in_progress', 'completed'] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

// Storage Quality Options
export const STORAGE_QUALITIES = ['excellent', 'good', 'fair', 'poor'] as const;
export type StorageQuality = typeof STORAGE_QUALITIES[number];

// Currencies (with display names)
export const CURRENCIES = [
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br' },
] as const;

export type CurrencyCode = typeof CURRENCIES[number]['code'];

// Farm Size Units
export const FARM_SIZE_UNITS = ['acres', 'hectares'] as const;
export type FarmSizeUnit = typeof FARM_SIZE_UNITS[number];

// Date Formats
export const DATE_FORMATS = [
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (UK/Kenya)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
] as const;

// Supported Languages
export const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ' },
] as const;

export type LanguageCode = typeof LANGUAGES[number]['code'];

// Common Expense Categories
export const EXPENSE_CATEGORIES = [
  'Seeds',
  'Fertilizers',
  'Pesticides',
  'Equipment',
  'Labor',
  'Fuel',
  'Irrigation',
  'Transport',
  'Storage',
  'Other',
] as const;

// Common Income Sources
export const INCOME_SOURCES = [
  'Crop Sale',
  'Livestock Sale',
  'Produce Sale',
  'Contract Farming',
  'Subsidy',
  'Other',
] as const;

// Common Inventory Categories
export const INVENTORY_CATEGORIES = [
  'Seeds',
  'Fertilizers',
  'Pesticides',
  'Tools',
  'Equipment',
  'Fuel',
  'Packaging',
  'Other',
] as const;

// Common Crop Types (Africa-focused)
export const CROP_TYPES = [
  'Maize',
  'Wheat',
  'Rice',
  'Sorghum',
  'Millet',
  'Beans',
  'Groundnuts',
  'Cassava',
  'Sweet Potatoes',
  'Irish Potatoes',
  'Tomatoes',
  'Onions',
  'Cabbage',
  'Kale (Sukuma Wiki)',
  'Spinach',
  'Carrots',
  'Green Peppers',
  'Bananas',
  'Mangoes',
  'Avocados',
  'Coffee',
  'Tea',
  'Sugarcane',
  'Cotton',
  'Sisal',
  'Sunflower',
  'Other',
] as const;

// Default Coordinates (Nairobi, Kenya)
export const DEFAULT_LOCATION = {
  latitude: -1.2864,
  longitude: 36.8172,
  name: 'Nairobi, Kenya',
} as const;

// Voice TTS Settings
export const VOICE_SETTINGS = {
  DEFAULT_RATE: 0.9,
  DEFAULT_PITCH: 1.0,
  SLOW_RATE: 0.7,
  FAST_RATE: 1.2,
} as const;

// UI Breakpoints (in pixels)
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;

// Virtualization Settings
export const VIRTUALIZATION = {
  LIST_ITEM_HEIGHT: 72,
  GRID_ITEM_HEIGHT: 200,
  OVERSCAN: 5,
  MIN_ITEMS_FOR_VIRTUALIZATION: 20,
} as const;

// Cache TTL (in milliseconds)
export const CACHE_TTL = {
  WEATHER: 60 * 60 * 1000, // 1 hour
  MARKET_PRICES: 24 * 60 * 60 * 1000, // 24 hours
  EXCHANGE_RATES: 6 * 60 * 60 * 1000, // 6 hours
} as const;

// Toast/Notification Durations (in milliseconds)
export const TOAST_DURATION = {
  SHORT: 2000,
  DEFAULT: 3000,
  LONG: 5000,
} as const;
