// Currency conversion service
// Fetches exchange rates and converts prices

const EXCHANGE_RATE_API = 'https://api.exchangerate-api.com/v4/latest/USD';

interface ExchangeRates {
  base: string;
  rates: Record<string, number>;
  date: string;
}

// Cache exchange rates (refresh every 24 hours)
let cachedRates: ExchangeRates | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch current exchange rates from USD to other currencies
 */
export async function getExchangeRates(): Promise<ExchangeRates> {
  const now = Date.now();

  // Return cached rates if still valid
  if (cachedRates && (now - lastFetchTime) < CACHE_DURATION) {
    console.log('Using cached exchange rates');
    return cachedRates;
  }

  try {
    console.log('Fetching fresh exchange rates...');
    const response = await fetch(EXCHANGE_RATE_API);

    if (!response.ok) {
      throw new Error(`Exchange rate API error: ${response.statusText}`);
    }

    const data = await response.json();

    cachedRates = data;
    lastFetchTime = now;

    console.log('✓ Exchange rates updated successfully');
    return data;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);

    // Return default rates if fetch fails
    if (cachedRates) {
      console.warn('⚠ Using cached exchange rates due to error');
      return cachedRates;
    }

    // Fallback to approximate rates
    console.warn('⚠ Using fallback exchange rates');
    return {
      base: 'USD',
      rates: {
        KES: 150, // Approximate USD to KES rate
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        ZAR: 18.5,
        TZS: 2500,
        UGX: 3700,
        RWF: 1300,
        ETB: 56
      },
      date: new Date().toISOString()
    };
  }
}

/**
 * Convert amount from USD to target currency
 */
export async function convertCurrency(
  amountUSD: number,
  targetCurrency: string = 'KES'
): Promise<number> {
  try {
    const rates = await getExchangeRates();
    const rate = rates.rates[targetCurrency];

    if (!rate) {
      console.warn(`Exchange rate for ${targetCurrency} not found, returning USD amount`);
      return amountUSD;
    }

    return Math.round(amountUSD * rate);
  } catch (error) {
    console.error('Error converting currency:', error);
    return amountUSD;
  }
}

/**
 * Convert amount from one currency to another
 */
export async function convertBetweenCurrencies(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  try {
    // If same currency, no conversion needed
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await getExchangeRates();

    console.log('Converting', amount, 'from', fromCurrency, 'to', toCurrency);
    console.log('Available rates:', rates.rates);

    // Get rates for both currencies (all rates are relative to USD)
    // USD has a rate of 1 in the base currency
    const fromRate = fromCurrency === 'USD' ? 1 : rates.rates[fromCurrency];
    const toRate = toCurrency === 'USD' ? 1 : rates.rates[toCurrency];

    if (!fromRate || !toRate) {
      console.warn(`Exchange rate not found for ${fromCurrency} or ${toCurrency}`);
      console.warn('fromRate:', fromRate, 'toRate:', toRate);
      return amount;
    }

    // Convert: amount in fromCurrency -> USD -> toCurrency
    const amountInUSD = amount / fromRate;
    const amountInTargetCurrency = amountInUSD * toRate;

    console.log('Conversion result:', amountInTargetCurrency.toFixed(2));

    return parseFloat(amountInTargetCurrency.toFixed(2));
  } catch (error) {
    console.error('Error converting between currencies:', error);
    return amount;
  }
}

/**
 * Get the preferred currency from settings
 */
export function getPreferredCurrency(): string {
  try {
    const savedSettings = localStorage.getItem('farmSettings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      return settings.currency || 'KES';
    }
  } catch (error) {
    console.error('Error reading currency preference:', error);
  }
  return 'KES'; // Default to Kenyan Shilling
}

/**
 * Get the base currency (the currency in which amounts are stored in the database)
 * This is stored separately so we know what currency to convert FROM
 */
export function getBaseCurrency(): string {
  try {
    const baseCurrency = localStorage.getItem('baseCurrency');
    if (baseCurrency) {
      return baseCurrency;
    }
  } catch (error) {
    console.error('Error reading base currency:', error);
  }
  return 'KES'; // Default to Kenyan Shilling
}

/**
 * Set the base currency (should be called when user first sets their currency)
 */
export function setBaseCurrency(currency: string): void {
  try {
    localStorage.setItem('baseCurrency', currency);
  } catch (error) {
    console.error('Error setting base currency:', error);
  }
}

/**
 * Format price with currency symbol
 */
export function formatPrice(amount: number, currency: string = 'KES'): string {
  const symbols: Record<string, string> = {
    KES: 'KES',
    USD: '$',
    EUR: '€',
    GBP: '£',
    TZS: 'TZS',
    UGX: 'UGX',
    RWF: 'RWF',
    ETB: 'ETB'
  };

  const symbol = symbols[currency] || currency;
  const formattedAmount = amount.toLocaleString();

  return `${symbol} ${formattedAmount}`;
}

/**
 * Get currency unit name for display
 */
export function getCurrencyUnit(currency: string = 'KES'): string {
  const units: Record<string, string> = {
    KES: 'KES/ton',
    USD: 'USD/ton',
    EUR: 'EUR/ton',
    GBP: 'GBP/ton',
    TZS: 'TZS/ton',
    UGX: 'UGX/ton',
    RWF: 'RWF/ton',
    ETB: 'ETB/ton'
  };

  return units[currency] || `${currency}/ton`;
}
