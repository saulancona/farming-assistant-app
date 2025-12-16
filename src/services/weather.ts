import type { WeatherData, WeatherAlert, WeatherDataExtended } from '../types';
import { db } from './db';

// Default location (can be customized based on user's farm location)
const DEFAULT_LAT = -1.2864; // Nairobi, Kenya
const DEFAULT_LON = 36.8172;

// Cache duration: 1 hour for weather data
const WEATHER_CACHE_DURATION = 60 * 60 * 1000;

// Helper function to get cached weather data
async function getCachedWeather(location: string): Promise<WeatherData | null> {
  try {
    const cached = await db.weatherCache.where('location').equals(location).first();
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    const isFresh = age < WEATHER_CACHE_DURATION;

    if (isFresh) {
      console.log(`✓ Using fresh cached weather data (${Math.round(age / 1000 / 60)} minutes old)`);
      return cached.data as WeatherData;
    }

    console.log(`Cache exists but stale (${Math.round(age / 1000 / 60)} minutes old)`);
    return null;
  } catch (error) {
    console.error('Error reading weather cache:', error);
    return null;
  }
}

// Helper function to save weather data to cache
async function cacheWeatherData(location: string, data: WeatherData): Promise<void> {
  try {
    // Clear old cache for this location
    await db.weatherCache.where('location').equals(location).delete();

    // Add new cache entry
    await db.weatherCache.add({
      location,
      data,
      timestamp: Date.now()
    });

    console.log('✓ Weather data cached successfully');
  } catch (error) {
    console.error('Error caching weather data:', error);
  }
}

// Helper function to get stale cache as fallback
async function getStaleCache(location: string): Promise<WeatherData | null> {
  try {
    const cached = await db.weatherCache.where('location').equals(location).first();
    if (cached) {
      const age = Date.now() - cached.timestamp;
      console.log(`⚠ Using stale cached weather data (${Math.round(age / 1000 / 60)} minutes old)`);
      return cached.data as WeatherData;
    }
  } catch (error) {
    console.error('Error reading stale cache:', error);
  }
  return null;
}

export async function getWeatherData(lat?: number, lon?: number): Promise<WeatherData> {
  const latitude = lat || DEFAULT_LAT;
  const longitude = lon || DEFAULT_LON;
  const locationKey = `${latitude.toFixed(2)},${longitude.toFixed(2)}`;

  // Check cache first
  const cachedData = await getCachedWeather(locationKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    // Fetch from our serverless API (API key is server-side only)
    const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.statusText}`);
    }

    const weatherData: WeatherData = await response.json();

    console.log('Weather data fetched successfully from API');

    // Cache the fetched data
    await cacheWeatherData(locationKey, weatherData);

    return weatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);

    // Try to use stale cache if available
    const staleCache = await getStaleCache(locationKey);
    if (staleCache) {
      return staleCache;
    }

    // Return mock data as final fallback
    console.log('Using mock weather data as fallback');
    return getMockWeatherData();
  }
}

// Mock data fallback
function getMockWeatherData(): WeatherData {
  return {
    current: {
      temp: 28,
      condition: 'Sunny',
      humidity: 65,
      windSpeed: 12,
      icon: 'sunny'
    },
    forecast: [
      { day: 'Mon', high: 30, low: 18, condition: 'Sunny', icon: 'sunny' },
      { day: 'Tue', high: 29, low: 19, condition: 'Cloudy', icon: 'cloudy' },
      { day: 'Wed', high: 27, low: 17, condition: 'Rainy', icon: 'rainy' },
      { day: 'Thu', high: 28, low: 18, condition: 'Cloudy', icon: 'cloudy' },
      { day: 'Fri', high: 31, low: 20, condition: 'Sunny', icon: 'sunny' }
    ],
    sprayWindow: {
      isIdeal: true,
      reason: 'Low wind speed and no rain expected for next 48 hours'
    }
  };
}

// Generate weather alerts based on conditions
function generateWeatherAlerts(weatherData: WeatherData): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];
  const now = new Date().toISOString();

  // Frost alert - temperatures below 4°C
  if (weatherData.current.temp < 4 || weatherData.forecast.some(d => d.low < 4)) {
    const frostDay = weatherData.forecast.find(d => d.low < 4);
    alerts.push({
      id: `frost-${Date.now()}`,
      type: 'frost',
      severity: weatherData.current.temp < 0 ? 'critical' : 'high',
      title: 'Frost Warning',
      description: frostDay
        ? `Expected frost on ${frostDay.day} with temperatures as low as ${frostDay.low}°C`
        : `Current temperature is ${weatherData.current.temp}°C - frost risk`,
      recommendations: [
        'Cover sensitive crops with frost cloth or plastic sheeting',
        'Water plants in the late afternoon to help retain heat',
        'Harvest frost-sensitive crops immediately',
        'Move potted plants indoors or to sheltered areas'
      ],
      startTime: now,
      affectedCrops: ['tomatoes', 'peppers', 'beans', 'maize', 'bananas'],
      isActive: true
    });
  }

  // Heat wave alert - temperatures above 35°C
  if (weatherData.current.temp > 35 || weatherData.forecast.some(d => d.high > 35)) {
    alerts.push({
      id: `heat-${Date.now()}`,
      type: 'heat_wave',
      severity: weatherData.current.temp > 40 ? 'critical' : 'high',
      title: 'Heat Wave Alert',
      description: `High temperatures expected. Current: ${weatherData.current.temp}°C`,
      recommendations: [
        'Increase irrigation frequency - water early morning or late evening',
        'Apply mulch to retain soil moisture',
        'Provide shade for sensitive crops if possible',
        'Monitor crops for signs of heat stress',
        'Avoid working in fields during peak heat (11am-3pm)'
      ],
      startTime: now,
      affectedCrops: ['lettuce', 'spinach', 'cabbage', 'kale', 'potatoes'],
      isActive: true
    });
  }

  // Storm alert - rain with high wind
  const hasStorm = weatherData.forecast.some(d =>
    d.condition.toLowerCase().includes('storm') ||
    d.condition.toLowerCase().includes('thunder')
  );
  if (hasStorm || weatherData.current.windSpeed > 40) {
    alerts.push({
      id: `storm-${Date.now()}`,
      type: 'storm',
      severity: weatherData.current.windSpeed > 60 ? 'critical' : 'high',
      title: 'Storm Warning',
      description: 'Severe weather with strong winds and heavy rain expected',
      recommendations: [
        'Secure loose equipment and structures',
        'Stake tall crops like maize and sunflowers',
        'Clear drainage channels to prevent flooding',
        'Harvest any mature crops that could be damaged',
        'Stay indoors during the storm'
      ],
      startTime: now,
      affectedCrops: ['maize', 'sunflowers', 'bananas', 'tomatoes'],
      isActive: true
    });
  }

  // High wind alert
  if (weatherData.current.windSpeed > 25 && weatherData.current.windSpeed <= 40) {
    alerts.push({
      id: `wind-${Date.now()}`,
      type: 'wind',
      severity: 'medium',
      title: 'High Wind Advisory',
      description: `Wind speed: ${weatherData.current.windSpeed} km/h`,
      recommendations: [
        'Avoid spraying - chemicals will drift',
        'Secure greenhouse covers and shade cloth',
        'Check supports for climbing crops',
        'Delay transplanting seedlings'
      ],
      startTime: now,
      isActive: true
    });
  }

  // Drought conditions - no rain and high temp for extended period
  const noRainDays = weatherData.forecast.filter(d =>
    !d.condition.toLowerCase().includes('rain')
  ).length;
  if (noRainDays >= 4 && weatherData.current.humidity < 40) {
    alerts.push({
      id: `drought-${Date.now()}`,
      type: 'drought',
      severity: weatherData.current.humidity < 30 ? 'high' : 'medium',
      title: 'Dry Conditions Alert',
      description: `No rain expected for ${noRainDays} days. Humidity: ${weatherData.current.humidity}%`,
      recommendations: [
        'Implement water conservation practices',
        'Consider drip irrigation for efficiency',
        'Apply organic mulch to reduce evaporation',
        'Prioritize watering for high-value crops',
        'Check soil moisture before irrigating'
      ],
      startTime: now,
      affectedCrops: ['rice', 'vegetables', 'young seedlings'],
      isActive: true
    });
  }

  // Flood risk - heavy rain expected
  const heavyRainDays = weatherData.forecast.filter(d =>
    d.condition.toLowerCase().includes('rain') ||
    d.condition.toLowerCase().includes('storm')
  ).length;
  if (heavyRainDays >= 3) {
    alerts.push({
      id: `flood-${Date.now()}`,
      type: 'flood',
      severity: heavyRainDays >= 4 ? 'high' : 'medium',
      title: 'Flood Risk Advisory',
      description: `Rain expected for ${heavyRainDays} consecutive days`,
      recommendations: [
        'Clear all drainage channels and ditches',
        'Create trenches around vulnerable crops',
        'Avoid working on waterlogged soils',
        'Move equipment to higher ground',
        'Monitor low-lying fields closely'
      ],
      startTime: now,
      affectedCrops: ['root vegetables', 'beans', 'groundnuts'],
      isActive: true
    });
  }

  // High humidity - fungal disease risk
  if (weatherData.current.humidity > 85) {
    alerts.push({
      id: `humidity-${Date.now()}`,
      type: 'drought', // Using drought type for display purposes
      severity: 'medium',
      title: 'High Humidity - Disease Risk',
      description: `Humidity at ${weatherData.current.humidity}% - increased risk of fungal diseases`,
      recommendations: [
        'Monitor crops for early blight, powdery mildew, and rust',
        'Ensure good air circulation between plants',
        'Apply preventive fungicides if needed',
        'Avoid overhead irrigation',
        'Remove any infected plant material immediately'
      ],
      startTime: now,
      affectedCrops: ['tomatoes', 'potatoes', 'roses', 'grapes', 'cucumbers'],
      isActive: true
    });
  }

  return alerts;
}

// Get extended weather data with alerts
export async function getWeatherDataExtended(lat?: number, lon?: number): Promise<WeatherDataExtended> {
  const baseWeatherData = await getWeatherData(lat, lon);
  const alerts = generateWeatherAlerts(baseWeatherData);

  return {
    ...baseWeatherData,
    alerts
  };
}
