import { motion } from 'framer-motion';
import { Cloud, CloudRain, Sun, Wind, Droplets, AlertCircle, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { WeatherData } from '../types';

interface WeatherWidgetProps {
  weather: WeatherData;
}

export default function WeatherWidget({ weather }: WeatherWidgetProps) {
  const { t } = useTranslation();
  const getWeatherIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="text-yellow-500" size={32} />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="text-blue-500" size={32} />;
      default:
        return <Cloud className="text-gray-500" size={32} />;
    }
  };

  const getForecastIcon = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'sunny':
      case 'clear':
        return <Sun className="text-yellow-500" size={20} />;
      case 'rainy':
      case 'rain':
        return <CloudRain className="text-blue-500" size={20} />;
      default:
        return <Cloud className="text-gray-500" size={20} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-md p-6"
    >
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('weather.title', 'Weather')}</h2>

      {/* Current Weather */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">{t('weather.current', 'Current Weather')}</p>
            <p className="text-4xl font-bold text-gray-900">{weather.current.temp}°C</p>
            <p className="text-sm text-gray-700 mt-1">{weather.current.condition}</p>
          </div>
          {getWeatherIcon(weather.current.condition)}
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center gap-2">
            <Droplets className="text-blue-600" size={18} />
            <div>
              <p className="text-xs text-gray-600">{t('weather.humidity', 'Humidity')}</p>
              <p className="text-sm font-semibold text-gray-900">{weather.current.humidity}%</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wind className="text-blue-600" size={18} />
            <div>
              <p className="text-xs text-gray-600">{t('weather.windSpeed', 'Wind Speed')}</p>
              <p className="text-sm font-semibold text-gray-900">{weather.current.windSpeed} km/h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Spray Window Alert */}
      <div className={`rounded-lg p-4 mb-4 ${weather.sprayWindow.isIdeal ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
        <div className="flex items-start gap-3">
          {weather.sprayWindow.isIdeal ? (
            <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
          ) : (
            <AlertCircle className="text-orange-600 flex-shrink-0 mt-0.5" size={20} />
          )}
          <div>
            <p className={`text-sm font-semibold ${weather.sprayWindow.isIdeal ? 'text-green-900' : 'text-orange-900'}`}>
              {weather.sprayWindow.isIdeal ? t('weather.idealSpray', 'Ideal Spray Window') : t('weather.notIdealSpray', 'Not Ideal for Spraying')}
            </p>
            <p className={`text-xs mt-1 ${weather.sprayWindow.isIdeal ? 'text-green-700' : 'text-orange-700'}`}>
              {weather.sprayWindow.reason}
            </p>
          </div>
        </div>
      </div>

      {/* 5-Day Forecast */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">{t('weather.forecast', '5-Day Forecast')}</p>
        <div className="grid grid-cols-5 gap-2">
          {weather.forecast.map((day, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-gray-50 rounded-lg p-3 text-center hover:bg-gray-100 transition-colors"
            >
              <p className="text-xs font-medium text-gray-600 mb-2">{day.day}</p>
              <div className="flex justify-center mb-2">
                {getForecastIcon(day.condition)}
              </div>
              <p className="text-sm font-semibold text-gray-900">{day.high}°</p>
              <p className="text-xs text-gray-600">{day.low}°</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
