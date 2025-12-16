import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '../store/uiStore';
import { getWeatherData } from '../services/weather';
import { getMarketData } from '../services/marketData';
import { checkWeatherAndNotify, startWeatherNotificationService, getNotificationPermission } from '../services/notifications';
import type { WeatherData, MarketPrice } from '../types';

interface FarmSettings {
  latitude?: number;
  longitude?: number;
  farmLocation?: string;
}

function loadFarmSettings(): FarmSettings {
  const savedSettings = localStorage.getItem('farmSettings');
  if (savedSettings) {
    try {
      return JSON.parse(savedSettings);
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Hook for weather data management
 */
export function useWeatherData() {
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { setFarmLocation } = useUIStore();

  const loadWeather = useCallback(async (lat?: number, lon?: number) => {
    try {
      setIsLoading(true);
      const weather = await getWeatherData(lat, lon);
      setWeatherData(weather);
      // Save to localStorage for AI context
      localStorage.setItem('weatherData', JSON.stringify(weather));

      // Check weather conditions and send notifications if enabled
      if (getNotificationPermission() === 'granted') {
        await checkWeatherAndNotify(weather);
        startWeatherNotificationService();
      }
    } catch (error) {
      console.error('Error loading weather:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const settings = loadFarmSettings();
    setFarmLocation(settings.farmLocation || 'Nairobi, Kenya');
    loadWeather(settings.latitude, settings.longitude);
  }, [loadWeather, setFarmLocation]);

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsSaved = async (event: Event) => {
      const customEvent = event as CustomEvent<{ latitude: number; longitude: number }>;
      const { latitude, longitude } = customEvent.detail;
      const settings = loadFarmSettings();
      setFarmLocation(settings.farmLocation || 'Nairobi, Kenya');
      await loadWeather(latitude, longitude);
    };

    window.addEventListener('settingsSaved', handleSettingsSaved);
    return () => window.removeEventListener('settingsSaved', handleSettingsSaved);
  }, [loadWeather, setFarmLocation]);

  const refresh = useCallback(async () => {
    const settings = loadFarmSettings();
    await loadWeather(settings.latitude, settings.longitude);
  }, [loadWeather]);

  return { weatherData, isLoading, refresh };
}

/**
 * Hook for market prices data management
 */
export function useMarketData() {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadMarket = useCallback(async () => {
    try {
      setIsLoading(true);
      const markets = await getMarketData();
      setMarketPrices(markets);
    } catch (error) {
      console.error('Error loading market data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  const refresh = useCallback(async () => {
    await loadMarket();
  }, [loadMarket]);

  return { marketPrices, isLoading, refresh };
}
