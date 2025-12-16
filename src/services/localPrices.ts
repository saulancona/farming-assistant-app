// Local price override service
// Allows farmers to input their own local market prices

import type { LocalPriceOverride } from '../types';

const LOCAL_PRICES_KEY = 'localMarketPrices';

/**
 * Get all local price overrides from localStorage
 */
export function getLocalPrices(): LocalPriceOverride[] {
  try {
    const stored = localStorage.getItem(LOCAL_PRICES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading local prices:', error);
  }
  return [];
}

/**
 * Save a local price override (create new or update existing)
 */
export function saveLocalPrice(override: Omit<LocalPriceOverride, 'updatedAt' | 'id'> & { id?: string }): void {
  try {
    const existingPrices = getLocalPrices();

    // If ID is provided, update existing price; otherwise create new
    if (override.id) {
      // Update existing price
      const index = existingPrices.findIndex(p => p.id === override.id);
      if (index !== -1) {
        existingPrices[index] = {
          ...override,
          id: override.id,
          updatedAt: new Date().toISOString()
        };
      }
    } else {
      // Create new price with generated ID
      const newOverride: LocalPriceOverride = {
        ...override,
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        updatedAt: new Date().toISOString()
      };
      existingPrices.push(newOverride);
    }

    localStorage.setItem(LOCAL_PRICES_KEY, JSON.stringify(existingPrices));
    console.log(`✓ Local price saved for ${override.commodity}`);
  } catch (error) {
    console.error('Error saving local price:', error);
    throw error;
  }
}

/**
 * Get local price for a specific commodity (first one found - for backwards compatibility)
 */
export function getLocalPrice(commodity: string): LocalPriceOverride | null {
  const localPrices = getLocalPrices();
  return localPrices.find(p => p.commodity === commodity) || null;
}

/**
 * Get ALL local prices for a specific commodity
 */
export function getLocalPricesForCommodity(commodity: string): LocalPriceOverride[] {
  const localPrices = getLocalPrices();
  return localPrices.filter(p => p.commodity === commodity);
}

/**
 * Get local price by ID
 */
export function getLocalPriceById(id: string): LocalPriceOverride | null {
  const localPrices = getLocalPrices();
  return localPrices.find(p => p.id === id) || null;
}

/**
 * Delete local price override by ID
 */
export function deleteLocalPrice(id: string): void {
  try {
    const existingPrices = getLocalPrices();
    const filteredPrices = existingPrices.filter(p => p.id !== id);

    localStorage.setItem(LOCAL_PRICES_KEY, JSON.stringify(filteredPrices));
    console.log(`✓ Local price deleted`);
  } catch (error) {
    console.error('Error deleting local price:', error);
    throw error;
  }
}

/**
 * Check if a commodity has a local price override
 */
export function hasLocalPrice(commodity: string): boolean {
  return getLocalPrice(commodity) !== null;
}

/**
 * Get the effective price (local if available, otherwise international)
 */
export function getEffectivePrice(commodity: string, internationalPrice: number): number {
  const localPrice = getLocalPrice(commodity);
  return localPrice ? localPrice.price : internationalPrice;
}

/**
 * Format the last updated time in a human-readable way
 */
export function formatLastUpdated(updatedAt: string): string {
  try {
    const date = new Date(updatedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    return 'Unknown';
  }
}
