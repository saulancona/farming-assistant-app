import { useState, useEffect } from 'react';
import { Bell, Check, X, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  getNotificationPermission,
  requestNotificationPermission,
  showNotification,
  startWeatherNotificationService,
  stopWeatherNotificationService,
} from '../services/notifications';

export default function NotificationSettings() {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isRequesting, setIsRequesting] = useState(false);
  const [weatherAlertsEnabled, setWeatherAlertsEnabled] = useState(true);
  const [taskRemindersEnabled, setTaskRemindersEnabled] = useState(true);
  const [marketAlertsEnabled, setMarketAlertsEnabled] = useState(false);

  useEffect(() => {
    // Check current permission status
    setPermission(getNotificationPermission());

    // Load saved preferences
    setWeatherAlertsEnabled(localStorage.getItem('agroafrica_weather_alerts') !== 'false');
    setTaskRemindersEnabled(localStorage.getItem('agroafrica_task_reminders') !== 'false');
    setMarketAlertsEnabled(localStorage.getItem('agroafrica_market_alerts') === 'true');

    // Start weather notification service if enabled
    if (
      localStorage.getItem('agroafrica_notifications_enabled') === 'true' &&
      getNotificationPermission() === 'granted'
    ) {
      startWeatherNotificationService();
    }

    return () => {
      stopWeatherNotificationService();
    };
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    const result = await requestNotificationPermission();
    setPermission(result);
    setIsRequesting(false);

    if (result === 'granted') {
      startWeatherNotificationService();
      // Show a test notification
      await showNotification({
        title: '✅ Notifications Enabled',
        body: 'You will now receive important alerts about weather, tasks, and market prices.',
        tag: 'welcome-notification',
      });
    }
  };

  const handleToggleWeatherAlerts = (enabled: boolean) => {
    setWeatherAlertsEnabled(enabled);
    localStorage.setItem('agroafrica_weather_alerts', enabled.toString());
  };

  const handleToggleTaskReminders = (enabled: boolean) => {
    setTaskRemindersEnabled(enabled);
    localStorage.setItem('agroafrica_task_reminders', enabled.toString());
  };

  const handleToggleMarketAlerts = (enabled: boolean) => {
    setMarketAlertsEnabled(enabled);
    localStorage.setItem('agroafrica_market_alerts', enabled.toString());
  };

  const handleTestNotification = async () => {
    await showNotification({
      title: '🧪 Test Notification',
      body: 'This is a test notification from AgroAfrica. Your notifications are working correctly!',
      tag: 'test-notification',
    });
  };

  if (permission === 'unsupported') {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="text-yellow-600" size={24} />
          <div>
            <h3 className="font-medium text-yellow-900">
              {t('notifications.notSupported', 'Notifications Not Supported')}
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              {t(
                'notifications.notSupportedDesc',
                'Your browser does not support push notifications. Try using Chrome or Edge for the best experience.'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Permission Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="text-green-600" size={24} />
          <h2 className="text-xl font-semibold text-gray-900">
            {t('notifications.title', 'Push Notifications')}
          </h2>
        </div>

        {permission === 'granted' ? (
          <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg mb-4">
            <Check className="text-green-600" size={20} />
            <div>
              <p className="font-medium text-green-900">
                {t('notifications.enabled', 'Notifications Enabled')}
              </p>
              <p className="text-sm text-green-700">
                {t(
                  'notifications.enabledDesc',
                  'You will receive important alerts even when the app is closed.'
                )}
              </p>
            </div>
          </div>
        ) : permission === 'denied' ? (
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg mb-4">
            <X className="text-red-600" size={20} />
            <div>
              <p className="font-medium text-red-900">
                {t('notifications.blocked', 'Notifications Blocked')}
              </p>
              <p className="text-sm text-red-700">
                {t(
                  'notifications.blockedDesc',
                  'Notifications are blocked. Please enable them in your browser settings to receive weather alerts.'
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-gray-600 mb-4">
              {t(
                'notifications.description',
                'Enable push notifications to receive critical alerts about weather conditions, task reminders, and market price changes.'
              )}
            </p>
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <Bell size={20} />
              {isRequesting
                ? t('notifications.enabling', 'Enabling...')
                : t('notifications.enable', 'Enable Notifications')}
            </button>
          </div>
        )}

        {permission === 'granted' && (
          <button
            onClick={handleTestNotification}
            className="text-sm text-green-600 hover:text-green-700 underline"
          >
            {t('notifications.test', 'Send Test Notification')}
          </button>
        )}
      </div>

      {/* Notification Types */}
      {permission === 'granted' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">
            {t('notifications.types', 'Notification Types')}
          </h3>

          <div className="space-y-4">
            {/* Weather Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌦️</span>
                <div>
                  <p className="font-medium text-gray-900">
                    {t('notifications.weatherAlerts', 'Weather Alerts')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t(
                      'notifications.weatherAlertsDesc',
                      'Frost, storms, heat waves, and spray windows'
                    )}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={weatherAlertsEnabled}
                  onChange={(e) => handleToggleWeatherAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Task Reminders */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <p className="font-medium text-gray-900">
                    {t('notifications.taskReminders', 'Task Reminders')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('notifications.taskRemindersDesc', 'Upcoming and overdue tasks')}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={taskRemindersEnabled}
                  onChange={(e) => handleToggleTaskReminders(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>

            {/* Market Alerts */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📈</span>
                <div>
                  <p className="font-medium text-gray-900">
                    {t('notifications.marketAlerts', 'Market Price Alerts')}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t('notifications.marketAlertsDesc', 'Significant price changes')}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={marketAlertsEnabled}
                  onChange={(e) => handleToggleMarketAlerts(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Alert Examples */}
      {permission === 'granted' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">
            {t('notifications.examples', 'Example Alerts You Will Receive:')}
          </h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 🥶 Frost warning when temperature drops below 2°C</li>
            <li>• 🌡️ Heat wave alert above 35°C</li>
            <li>• 💨 High wind warning above 40 km/h</li>
            <li>• ✅ Ideal spray window conditions</li>
            <li>• ⛈️ Incoming storm alerts</li>
          </ul>
        </div>
      )}
    </div>
  );
}
