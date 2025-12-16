import type { MarketPrice } from '../types';
import { convertCurrency, getPreferredCurrency, getCurrencyUnit } from './currency';
import { db } from './db';

// Cache duration: 24 hours for market data (commodity prices change slowly)
const MARKET_CACHE_DURATION = 24 * 60 * 60 * 1000;

// Helper function to get cached market data
async function getCachedMarketData(): Promise<MarketPrice[] | null> {
  try {
    const cached = await db.marketCache.toArray();
    if (cached.length === 0) return null;

    // Get the most recent cache entry
    const latest = cached.sort((a, b) => b.timestamp - a.timestamp)[0];
    const age = Date.now() - latest.timestamp;
    const isFresh = age < MARKET_CACHE_DURATION;

    if (isFresh) {
      console.log(`✓ Using fresh cached market data (${Math.round(age / 1000 / 60 / 60)} hours old)`);
      return latest.data as MarketPrice[];
    }

    console.log(`Cache exists but stale (${Math.round(age / 1000 / 60 / 60)} hours old)`);
    return null;
  } catch (error) {
    console.error('Error reading market cache:', error);
    return null;
  }
}

// Helper function to save market data to cache
async function cacheMarketData(data: MarketPrice[]): Promise<void> {
  try {
    // Clear old cache entries
    await db.marketCache.clear();

    // Add new cache entry
    await db.marketCache.add({
      data,
      timestamp: Date.now()
    });

    console.log('✓ Market data cached successfully');
  } catch (error) {
    console.error('Error caching market data:', error);
  }
}

// Helper function to get stale cache as fallback
async function getStaleMarketCache(): Promise<MarketPrice[] | null> {
  try {
    const cached = await db.marketCache.toArray();
    if (cached.length > 0) {
      const latest = cached.sort((a, b) => b.timestamp - a.timestamp)[0];
      const age = Date.now() - latest.timestamp;
      console.log(`⚠ Using stale cached market data (${Math.round(age / 1000 / 60 / 60)} hours old)`);
      return latest.data as MarketPrice[];
    }
  } catch (error) {
    console.error('Error reading stale market cache:', error);
  }
  return null;
}

// Generate mock data as fallback (for offline/error scenarios)
function getMockMarketData(): MarketPrice[] {
  const now = Date.now();
  const seed = Math.floor(now / (1000 * 60 * 60));

  const basePrices = [
    { name: 'Maize', base: 245, volatility: 0.02 },
    { name: 'Rice', base: 480, volatility: 0.02 },
    { name: 'Wheat', base: 310, volatility: 0.015 },
    { name: 'Sorghum', base: 280, volatility: 0.025 },
    { name: 'Cassava', base: 180, volatility: 0.03 },
    { name: 'Soybeans', base: 520, volatility: 0.025 },
    { name: 'Groundnuts', base: 1100, volatility: 0.03 },
    { name: 'Coffee', base: 4200, volatility: 0.03 },
    { name: 'Cocoa', base: 2800, volatility: 0.035 },
    { name: 'Cotton', base: 1650, volatility: 0.025 },
    { name: 'Tea', base: 2400, volatility: 0.025 },
    { name: 'Sugar', base: 420, volatility: 0.02 },
    { name: 'Bananas', base: 850, volatility: 0.03 },
    { name: 'Sunflower Oil', base: 1200, volatility: 0.03 }
  ];

  return basePrices.map((commodity, index) => {
    const variation = Math.sin(seed + index) * commodity.volatility;
    const currentPrice = Math.round(commodity.base * (1 + variation));
    const change = Math.round((variation * 100) * 10) / 10;

    const history = [];
    for (let i = 4; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const histVariation = Math.sin(seed + index + i) * commodity.volatility;
      history.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: Math.round(commodity.base * (1 + histVariation))
      });
    }

    return {
      commodity: commodity.name,
      price: currentPrice,
      change,
      unit: 'USD/ton',
      history
    };
  });
}

/**
 * Convert market prices to user's preferred currency
 */
async function convertMarketPrices(prices: MarketPrice[]): Promise<MarketPrice[]> {
  const preferredCurrency = getPreferredCurrency();

  // If already in USD or currency is USD, skip conversion
  if (preferredCurrency === 'USD') {
    return prices;
  }

  console.log(`Converting prices to ${preferredCurrency}...`);

  try {
    // Convert each price
    const convertedPrices = await Promise.all(
      prices.map(async (item) => {
        const convertedPrice = await convertCurrency(item.price, preferredCurrency);
        const convertedHistory = await Promise.all(
          item.history.map(async (h) => ({
            date: h.date,
            price: await convertCurrency(h.price, preferredCurrency)
          }))
        );

        return {
          ...item,
          price: convertedPrice,
          unit: getCurrencyUnit(preferredCurrency),
          history: convertedHistory
        };
      })
    );

    console.log(`✓ Prices converted to ${preferredCurrency}`);
    return convertedPrices;
  } catch (error) {
    console.error('Error converting prices:', error);
    return prices; // Return original prices if conversion fails
  }
}

export async function getMarketData(): Promise<MarketPrice[]> {
  try {
    // Check cache first
    const cachedData = await getCachedMarketData();
    if (cachedData) {
      return cachedData;
    }

    console.log('Fetching market data...');

    // Fetch from our serverless API (handles World Bank + fallbacks server-side)
    const response = await fetch('/api/market');

    if (!response.ok) {
      throw new Error(`Market API error: ${response.statusText}`);
    }

    const marketData: MarketPrice[] = await response.json();

    console.log('✓ Market data fetched successfully from API');

    // Convert prices to user's preferred currency
    const convertedData = await convertMarketPrices(marketData);

    // Cache the fetched and converted data
    await cacheMarketData(convertedData);

    return convertedData;
  } catch (error) {
    console.error('Error fetching market data:', error);

    // Try to use stale cache if available
    const staleCache = await getStaleMarketCache();
    if (staleCache) {
      return staleCache;
    }

    // Return mock data as final fallback
    console.warn('⚠ Falling back to mock market data due to error');
    const mockData = getMockMarketData();
    return await convertMarketPrices(mockData);
  }
}

// Refresh market data (can be called periodically)
export async function refreshMarketData(): Promise<MarketPrice[]> {
  return getMarketData();
}
