import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle,
  Snowflake,
  Sun,
  CloudRain,
  Wind,
  Droplets,
  CloudLightning,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WeatherAlert } from '../types';

interface WeatherAlertsProps {
  alerts: WeatherAlert[];
  onDismiss?: (alertId: string) => void;
}

export default function WeatherAlerts({ alerts, onDismiss }: WeatherAlertsProps) {
  const { t } = useTranslation();
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  const toggleExpand = (alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set(prev).add(alertId));
    onDismiss?.(alertId);
  };

  const getAlertIcon = (type: WeatherAlert['type']) => {
    switch (type) {
      case 'frost':
        return <Snowflake className="w-6 h-6" />;
      case 'heat_wave':
        return <Sun className="w-6 h-6" />;
      case 'storm':
        return <CloudLightning className="w-6 h-6" />;
      case 'flood':
        return <CloudRain className="w-6 h-6" />;
      case 'wind':
        return <Wind className="w-6 h-6" />;
      case 'drought':
        return <Droplets className="w-6 h-6" />;
      case 'hail':
        return <CloudRain className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const getSeverityStyles = (severity: WeatherAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          icon: 'text-red-600',
          title: 'text-red-900',
          badge: 'bg-red-600 text-white'
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          icon: 'text-orange-600',
          title: 'text-orange-900',
          badge: 'bg-orange-600 text-white'
        };
      case 'medium':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          badge: 'bg-yellow-600 text-white'
        };
      case 'low':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          icon: 'text-blue-600',
          title: 'text-blue-900',
          badge: 'bg-blue-600 text-white'
        };
    }
  };

  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (visibleAlerts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-50 border-2 border-green-200 rounded-xl p-6"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-full">
            <AlertTriangle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-900">No Active Alerts</h3>
            <p className="text-sm text-green-700">Weather conditions are favorable for farming</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          {t('weather.alerts', 'Weather Alerts')}
        </h2>
        <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
          {visibleAlerts.length} Active
        </span>
      </div>

      <AnimatePresence>
        {visibleAlerts.map((alert) => {
          const styles = getSeverityStyles(alert.severity);
          const isExpanded = expandedAlerts.has(alert.id);

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`${styles.bg} border-2 ${styles.border} rounded-xl overflow-hidden`}
            >
              {/* Alert Header */}
              <div className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-full ${styles.bg} ${styles.icon}`}>
                    {getAlertIcon(alert.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-semibold ${styles.title}`}>
                        {alert.title}
                      </h3>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.badge}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{alert.description}</p>

                    {alert.affectedCrops && alert.affectedCrops.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {alert.affectedCrops.slice(0, 3).map(crop => (
                          <span
                            key={crop}
                            className="px-2 py-0.5 bg-white/50 text-xs rounded-full text-gray-700"
                          >
                            {crop}
                          </span>
                        ))}
                        {alert.affectedCrops.length > 3 && (
                          <span className="px-2 py-0.5 text-xs text-gray-500">
                            +{alert.affectedCrops.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleExpand(alert.id)}
                      className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-1.5 hover:bg-white/50 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Expanded Recommendations */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-current/10"
                  >
                    <div className="p-4 bg-white/30">
                      <h4 className="font-medium text-gray-900 mb-3">Recommended Actions:</h4>
                      <ul className="space-y-2">
                        {alert.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-white rounded-full text-xs font-medium">
                              {index + 1}
                            </span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
