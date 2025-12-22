import { motion } from 'framer-motion';
import { Cloud, CloudRain, Sun, Wind, Droplets, AlertCircle, CheckCircle, MapPin, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import type { WeatherData, WeatherAlert } from '../types';
import ReadButton from './ReadButton';
import TalkingButton from './TalkingButton';
import WeatherAlerts from './WeatherAlerts';
import { getWeatherDataExtended } from '../services/weather';
import { useRecordActivity } from '../hooks/useStreak';
import { useAwardMicroReward } from '../hooks/useMicroWins';

interface WeatherProps {
  weather: WeatherData;
  onRefresh?: () => void;
  location?: string;
  userId?: string;
}

export default function Weather({ weather, onRefresh, location = 'Nairobi, Kenya', userId }: WeatherProps) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const recordActivity = useRecordActivity();
  const awardMicroReward = useAwardMicroReward();
  const hasRecordedActivity = useRef(false);

  // Record weather check activity on mount (only once per session)
  useEffect(() => {
    if (userId && !hasRecordedActivity.current) {
      hasRecordedActivity.current = true;
      recordActivity.mutate({
        userId,
        activityType: 'weather_check',
        activityName: 'Checked Weather',
        activityNameSw: 'Kuangalia Hali ya Hewa',
      });
      // Award micro-reward for checking weather
      awardMicroReward.mutate({
        userId,
        actionType: 'weather_check',
      });
    }
  }, [userId]);

  // Load alerts on mount and when weather changes
  useEffect(() => {
    async function loadAlerts() {
      try {
        const savedSettings = localStorage.getItem('farmSettings');
        let lat, lon;
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            lat = settings.latitude;
            lon = settings.longitude;
          } catch (error) {
            console.error('Error parsing settings:', error);
          }
        }
        const extendedData = await getWeatherDataExtended(lat, lon);
        setAlerts(extendedData.alerts);
      } catch (error) {
        console.error('Error loading weather alerts:', error);
      }
    }
    loadAlerts();
  }, [weather]);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      // Reload alerts after refresh
      try {
        const savedSettings = localStorage.getItem('farmSettings');
        let lat, lon;
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            lat = settings.latitude;
            lon = settings.longitude;
          } catch (error) {
            console.error('Error parsing settings:', error);
          }
        }
        const extendedData = await getWeatherDataExtended(lat, lon);
        setAlerts(extendedData.alerts);
      } catch (error) {
        console.error('Error loading weather alerts:', error);
      }
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="text-yellow-500" size={48} />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="text-blue-500" size={48} />;
      default:
        return <Cloud className="text-gray-500" size={48} />;
    }
  };

  const getForecastIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="text-yellow-500" size={24} />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="text-blue-500" size={24} />;
      default:
        return <Cloud className="text-gray-500" size={24} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('weather.title', 'Weather')}</h1>
          <div className="flex items-center gap-2 mt-1 text-gray-600">
            <MapPin size={16} />
            <p className="text-sm">{location}</p>
          </div>
        </div>
        <TalkingButton
          voiceLabel="Refresh Weather. Click to update weather data."
          onClick={handleRefresh}
          className={`flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isRefreshing}
        >
          <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
        </TalkingButton>
      </div>

      {/* Current Weather Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 md:p-8 text-white"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <p className="text-blue-100 text-sm md:text-base">Current Weather</p>
              <ReadButton
                text={`Current weather: ${weather.current.temp} degrees celsius, ${weather.current.condition}. Humidity ${weather.current.humidity}%, Wind speed ${weather.current.windSpeed} kilometers per hour.`}
                size="sm"
                variant="icon"
                className="text-white hover:text-blue-100"
              />
            </div>
            <p className="text-5xl md:text-6xl font-bold mb-2">{weather.current.temp}°C</p>
            <p className="text-lg md:text-xl text-blue-100">{weather.current.condition}</p>
          </div>
          <div className="flex-shrink-0 ml-4">
            {getWeatherIcon(weather.current.condition)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-blue-400">
          <div className="flex items-center gap-3">
            <Droplets size={24} />
            <div>
              <p className="text-sm text-blue-100">{t('weather.humidity', 'Humidity')}</p>
              <p className="text-xl font-semibold">{weather.current.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Wind size={24} />
            <div>
              <p className="text-sm text-blue-100">{t('weather.windSpeed', 'Wind Speed')}</p>
              <p className="text-xl font-semibold">{weather.current.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <WeatherAlerts alerts={alerts} />
        </motion.div>
      )}

      {/* Spray Window Alert */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`rounded-xl shadow-md p-6 ${
          weather.sprayWindow.isIdeal
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-orange-50 border-2 border-orange-200'
        }`}
      >
        <div className="flex items-start gap-4">
          {weather.sprayWindow.isIdeal ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-1" size={28} />
          ) : (
            <AlertCircle className="text-orange-600 flex-shrink-0 mt-1" size={28} />
          )}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className={`text-lg font-semibold ${
                weather.sprayWindow.isIdeal ? 'text-green-900' : 'text-orange-900'
              }`}>
                {weather.sprayWindow.isIdeal
                  ? t('weather.idealSpray', 'Ideal Spray Window')
                  : t('weather.notIdealSpray', 'Not Ideal for Spraying')
                }
              </h3>
              <ReadButton
                text={`Spray window alert: ${weather.sprayWindow.isIdeal ? 'Ideal conditions for spraying' : 'Not ideal for spraying'}. ${weather.sprayWindow.reason}`}
                size="sm"
              />
            </div>
            <p className={`text-sm md:text-base ${
              weather.sprayWindow.isIdeal ? 'text-green-700' : 'text-orange-700'
            }`}>
              {weather.sprayWindow.reason}
            </p>
          </div>
        </div>
      </motion.div>

      {/* 5-Day Forecast */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{t('weather.forecast', '5-Day Forecast')}</h2>
          <ReadButton
            text={`5 day forecast: ${weather.forecast.map(day => `${day.day}, high ${day.high} degrees, low ${day.low} degrees, ${day.condition}`).join('. ')}`}
            size="sm"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
          {weather.forecast.map((day, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + index * 0.05 }}
              className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 text-center hover:shadow-md transition-shadow"
            >
              <p className="text-sm font-semibold text-gray-700 mb-3">{day.day}</p>
              <div className="flex justify-center mb-3">
                {getForecastIcon(day.condition)}
              </div>
              <p className="text-sm text-gray-600 mb-2">{day.condition}</p>
              <div className="flex justify-center items-center gap-2">
                <p className="text-lg font-bold text-gray-900">{day.high}°</p>
                <p className="text-sm text-gray-500">{day.low}°</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Farming Tips Based on Weather */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Weather-Based Farming Tips</h2>
        <div className="space-y-3">
          {weather.current.temp > 30 && (
            <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
              <Sun className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-700">High temperature today. Ensure crops are well-watered, especially during midday.</p>
            </div>
          )}
          {weather.forecast.some(day => day.condition.toLowerCase().includes('rain')) && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
              <CloudRain className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-700">Rain expected in the forecast. Good time to reduce irrigation and prepare drainage systems.</p>
            </div>
          )}
          {weather.current.windSpeed > 20 && (
            <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
              <Wind className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-700">High wind speeds. Avoid spraying and check for damage to crops and structures.</p>
            </div>
          )}
          {weather.current.humidity > 80 && (
            <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
              <Droplets className="text-purple-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-sm text-gray-700">High humidity levels. Monitor crops for fungal diseases and ensure good air circulation.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
