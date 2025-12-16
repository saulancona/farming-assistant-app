import type { VercelRequest, VercelResponse } from '@vercel/node';

// Server-side only API key for Alpha Vantage (optional)
const MARKET_DATA_API_KEY = process.env.MARKET_DATA_API_KEY;

// World Bank commodity codes
const WORLD_BANK_COMMODITIES: Record<string, string> = {
  maize: 'PMAIZMT',
  wheat: 'PWHEAMT',
  rice: 'PRICENPQ',
  sorghum: 'PSORGUS',
  coffee: 'PCOFFOTM',
  cocoa: 'PCOCO',
  tea: 'PTEAKENA',
  cotton: 'PCOTTIND',
  sugar: 'PSUGAUSA',
  groundnuts: 'PGNUTS',
  soybeans: 'PSOYBMT',
  sunflower: 'PSUNO',
  bananas: 'PBANSOP'
};

const COMMODITY_NAMES: Record<string, string> = {
  maize: 'Maize',
  wheat: 'Wheat',
  rice: 'Rice',
  sorghum: 'Sorghum',
  coffee: 'Coffee',
  cocoa: 'Cocoa',
  tea: 'Tea',
  cotton: 'Cotton',
  sugar: 'Sugar',
  groundnuts: 'Groundnuts',
  soybeans: 'Soybeans',
  sunflower: 'Sunflower Oil',
  bananas: 'Bananas'
};

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr);
  const month = date.toLocaleDateString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
}

async function fetchWorldBankData() {
  const baseUrl = 'https://api.worldbank.org/v2/sources/2/series';

  const commodityPromises = Object.entries(WORLD_BANK_COMMODITIES).map(async ([key, code]) => {
    try {
      const url = `${baseUrl}/${code}/data?format=json&date=2020:2025`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch ${key}`);
      }

      const data = await response.json();
      const priceData = data[1];

      if (!priceData || priceData.length === 0) {
        return null;
      }

      const sortedData = priceData
        .filter((item: any) => item.value !== null && item.value !== undefined)
        .sort((a: any, b: any) => {
          const dateA = new Date(a.date || '2000-01-01').getTime();
          const dateB = new Date(b.date || '2000-01-01').getTime();
          return dateB - dateA;
        });

      if (sortedData.length === 0) {
        return null;
      }

      const recentPrices = sortedData.slice(0, 5).reverse();
      const history = recentPrices.map((item: any) => ({
        date: formatDateShort(item.date),
        price: Math.round(parseFloat(item.value) * 100) / 100
      }));

      const oldestPrice = history[0]?.price || 0;
      const newestPrice = history[history.length - 1]?.price || 0;
      const change = oldestPrice > 0 ? ((newestPrice - oldestPrice) / oldestPrice) * 100 : 0;

      return {
        commodity: COMMODITY_NAMES[key] || key,
        price: Math.round(newestPrice),
        change: Math.round(change * 10) / 10,
        unit: 'USD/ton',
        history
      };
    } catch (error) {
      return null;
    }
  });

  const results = await Promise.all(commodityPromises);
  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

// Generate mock data as fallback
function getMockMarketData() {
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

    // Generate simple history
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try World Bank data first (free, no API key needed)
    let marketData = await fetchWorldBankData();

    if (!marketData || marketData.length === 0) {
      // Fall back to mock data
      marketData = getMockMarketData();
    }

    // Set cache headers (24 hours for market data)
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate');

    return res.status(200).json(marketData);
  } catch (error: any) {
    console.error('Market API error:', error);

    // Return mock data on error
    const mockData = getMockMarketData();
    return res.status(200).json(mockData);
  }
}
