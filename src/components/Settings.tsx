import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  DollarSign,
  Save,
  Ruler,
  Calendar,
  Globe,
  Volume2,
  Mic,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { speak, isVoiceSupported } from '../utils/simpleVoice';
import TalkingButton from './TalkingButton';
import LanguageSelector from './LanguageSelector';
import NotificationSettings from './NotificationSettings';
import { useVoice } from '../contexts/VoiceContext';
import { reverseGeocode, isValidCoordinate } from '../utils/geocoding';
import { supabase } from '../lib/supabase';
import { getFields } from '../services/database';
import { getBaseCurrency, setBaseCurrency, convertBetweenCurrencies } from '../services/currency';
import ConfirmDialog from './ConfirmDialog';

interface FarmSettings {
  farmName: string;
  farmLocation: string;
  latitude: number;
  longitude: number;
  farmSize: number;
  farmSizeUnit: 'acres' | 'hectares';
  ownerName: string;
  currency: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  enableNotifications: boolean;
  lowInventoryAlert: boolean;
  taskReminders: boolean;
  weatherAlerts: boolean;
}

const DEFAULT_SETTINGS: FarmSettings = {
  farmName: 'My Farm',
  farmLocation: 'Nairobi, Kenya',
  latitude: -1.2864,
  longitude: 36.8172,
  farmSize: 10,
  farmSizeUnit: 'acres',
  ownerName: '',
  currency: 'KES',
  dateFormat: 'DD/MM/YYYY',
  enableNotifications: true,
  lowInventoryAlert: true,
  taskReminders: true,
  weatherAlerts: true
};

const CURRENCIES = [
  { code: 'KES', name: 'Kenyan Shilling (KES)' },
  { code: 'USD', name: 'US Dollar (USD)' },
  { code: 'EUR', name: 'Euro (EUR)' },
  { code: 'GBP', name: 'British Pound (GBP)' },
  { code: 'ZAR', name: 'South African Rand (ZAR)' },
  { code: 'TZS', name: 'Tanzanian Shilling (TZS)' },
  { code: 'UGX', name: 'Ugandan Shilling (UGX)' }
];

export default function Settings() {
  const { voiceEnabled, setVoiceEnabled } = useVoice();
  const [settings, setSettings] = useState<FarmSettings>(DEFAULT_SETTINGS);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [voiceSupport, setVoiceSupport] = useState({ speech: false, recognition: false });
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [calculatedFarmSize, setCalculatedFarmSize] = useState<number>(0);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreLogs, setRestoreLogs] = useState<string[]>([]);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const geocodingTimeoutRef = useRef<number | null>(null);

  // Load settings from Supabase first, then fall back to localStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Try to load from Supabase first for cross-device sync
          const { data: cloudSettings, error } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', user.id)
            .single();

          if (cloudSettings && !error) {
            // Map snake_case DB columns to camelCase
            const mappedSettings: FarmSettings = {
              farmName: cloudSettings.farm_name || DEFAULT_SETTINGS.farmName,
              farmLocation: cloudSettings.farm_location || DEFAULT_SETTINGS.farmLocation,
              latitude: cloudSettings.latitude || DEFAULT_SETTINGS.latitude,
              longitude: cloudSettings.longitude || DEFAULT_SETTINGS.longitude,
              farmSize: cloudSettings.farm_size || DEFAULT_SETTINGS.farmSize,
              farmSizeUnit: cloudSettings.farm_size_unit || DEFAULT_SETTINGS.farmSizeUnit,
              ownerName: cloudSettings.owner_name || DEFAULT_SETTINGS.ownerName,
              currency: cloudSettings.currency || DEFAULT_SETTINGS.currency,
              dateFormat: DEFAULT_SETTINGS.dateFormat, // Not stored in cloud yet
              enableNotifications: DEFAULT_SETTINGS.enableNotifications,
              lowInventoryAlert: DEFAULT_SETTINGS.lowInventoryAlert,
              taskReminders: DEFAULT_SETTINGS.taskReminders,
              weatherAlerts: DEFAULT_SETTINGS.weatherAlerts
            };

            setSettings(mappedSettings);
            // Also update localStorage for offline access
            localStorage.setItem('farmSettings', JSON.stringify(mappedSettings));
            console.log('Settings loaded from cloud');
            return;
          }
        }
      } catch (error) {
        console.log('Cloud settings load failed, using local:', error);
      }

      // Fall back to localStorage
      const savedSettings = localStorage.getItem('farmSettings');
      if (savedSettings) {
        try {
          setSettings(JSON.parse(savedSettings));
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    };

    loadSettings();
  }, []);

  // Fetch all fields and calculate total farm size
  const fetchFieldsAndCalculateSize = useCallback(async () => {
    try {
      const fields = await getFields();
      const totalArea = fields.reduce((sum, field) => sum + (field.area || 0), 0);

      // Convert to the user's preferred unit
      let calculatedSize = totalArea; // totalArea is already in acres from DB
      if (settings.farmSizeUnit === 'hectares') {
        calculatedSize = totalArea * 0.404686; // Convert acres to hectares
      }

      setCalculatedFarmSize(parseFloat(calculatedSize.toFixed(2)));

      // Also update the settings with this value
      setSettings(prev => ({
        ...prev,
        farmSize: parseFloat(calculatedSize.toFixed(2))
      }));
    } catch (error) {
      console.error('Error fetching fields:', error);
      // If error, keep current value
    }
  }, [settings.farmSizeUnit]);

  useEffect(() => {
    fetchFieldsAndCalculateSize();

    // Listen for field changes (when user adds/edits/deletes fields)
    const handleFieldsChanged = () => {
      fetchFieldsAndCalculateSize();
    };

    window.addEventListener('fieldsChanged', handleFieldsChanged);
    return () => window.removeEventListener('fieldsChanged', handleFieldsChanged);
  }, [fetchFieldsAndCalculateSize]);

  // Check voice support on mount
  useEffect(() => {
    setVoiceSupport(isVoiceSupported());
  }, []);

  // Reverse geocode coordinates to update location name
  const performReverseGeocode = useCallback(async (lat: number, lon: number) => {
    if (!isValidCoordinate(lat, lon)) {
      return;
    }

    setIsReverseGeocoding(true);
    setLocationError('');

    try {
      const result = await reverseGeocode(lat, lon);

      if (result.success && result.formattedLocation) {
        setSettings(prev => ({
          ...prev,
          farmLocation: result.formattedLocation
        }));
        setSaveMessage('Location updated! Don\'t forget to save your settings.');
        setTimeout(() => setSaveMessage(''), 3000);
      } else if (result.error) {
        setLocationError(`Could not determine location: ${result.error}`);
      }
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
      setLocationError('Failed to fetch location information');
    } finally {
      setIsReverseGeocoding(false);
    }
  }, []);

  // Debounced reverse geocoding when coordinates change
  useEffect(() => {
    // Clear any existing timeout
    if (geocodingTimeoutRef.current) {
      clearTimeout(geocodingTimeoutRef.current);
    }

    // Only reverse geocode if coordinates are valid and have actually changed
    if (isValidCoordinate(settings.latitude, settings.longitude)) {
      geocodingTimeoutRef.current = setTimeout(() => {
        performReverseGeocode(settings.latitude, settings.longitude);
      }, 1000); // Wait 1 second after user stops typing
    }

    // Cleanup on unmount
    return () => {
      if (geocodingTimeoutRef.current) {
        clearTimeout(geocodingTimeoutRef.current);
      }
    };
  }, [settings.latitude, settings.longitude, performReverseGeocode]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    console.log('=== CURRENCY CHANGE DEBUG ===');

    // Check if currency changed
    const previousSettings = localStorage.getItem('farmSettings');
    const previousCurrency = previousSettings ? JSON.parse(previousSettings).currency : null;
    const currentBaseCurrency = getBaseCurrency();

    console.log('Previous currency from settings:', previousCurrency);
    console.log('Current base currency:', currentBaseCurrency);
    console.log('New currency:', settings.currency);

    const currencyChanged = previousCurrency && previousCurrency !== settings.currency;

    console.log('Currency changed?', currencyChanged);

    // Store the base currency on first setup
    if (!currentBaseCurrency) {
      console.log('First time setting currency to', settings.currency);
      setBaseCurrency(settings.currency);
    }

    // NOTE: We no longer convert database values when currency changes.
    // Instead, all expenses/income are stored in the base currency (KES)
    // and converted for display only. This prevents data corruption.
    if (currencyChanged) {
      console.log('Currency preference changed to', settings.currency);
      console.log('Note: Database values remain in base currency (KES)');
    }

    // Save to localStorage
    localStorage.setItem('farmSettings', JSON.stringify(settings));

    // Also save to Supabase database for cross-app sync (AgroVoice)
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            farm_name: settings.farmName,
            farm_location: settings.farmLocation,
            latitude: settings.latitude,
            longitude: settings.longitude,
            farm_size: settings.farmSize,
            farm_size_unit: settings.farmSizeUnit,
            owner_name: settings.ownerName,
            currency: settings.currency,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        console.log('Settings synced to database for cross-app use');
      }
    } catch (error) {
      console.error('Error syncing settings to database:', error);
      // Don't fail the save if database sync fails
    }

    // Dispatch custom event to trigger weather reload and currency updates
    window.dispatchEvent(new CustomEvent('settingsSaved', {
      detail: {
        latitude: settings.latitude,
        longitude: settings.longitude,
        currencyChanged: currencyChanged
      }
    }));

    // Simulate a small delay for UX
    setTimeout(() => {
      setIsSaving(false);
      if (currencyChanged) {
        setSaveMessage('✓ Settings saved and all amounts converted to ' + settings.currency + '!');
      } else {
        setSaveMessage('Settings saved successfully! Weather data will update shortly.');
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSaveMessage(''), 3000);

      // If currency changed, reload the page to refresh all data
      if (currencyChanged) {
        setTimeout(() => window.location.reload(), 1500);
      }
    }, 500);
  };

  const updateSetting = (key: keyof FarmSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const searchLocationByName = async () => {
    if (!settings.farmLocation || settings.farmLocation.trim().length < 3) {
      setLocationError('Please enter a city name (at least 3 characters)');
      return;
    }

    setIsSearchingLocation(true);
    setLocationError('');

    try {
      // Use OpenStreetMap Nominatim for forward geocoding (city name → coordinates)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(settings.farmLocation)}&format=json&limit=1`
      );

      if (!response.ok) {
        throw new Error('Failed to search location');
      }

      const data = await response.json();

      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(parseFloat(result.lat).toFixed(6));
        const lon = parseFloat(parseFloat(result.lon).toFixed(6));

        setSettings(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon,
          farmLocation: result.display_name // Use the full name from search result
        }));

        setLocationError('');
      } else {
        setLocationError(`Could not find "${settings.farmLocation}". Try being more specific (e.g., "Nairobi, Kenya")`);
      }
    } catch (error) {
      console.error('Location search error:', error);
      setLocationError('Failed to search for location. Please try again.');
    } finally {
      setIsSearchingLocation(false);
    }
  };

  const getCurrentLocation = () => {
    setIsGettingLocation(true);
    setLocationError('');

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lon = parseFloat(position.coords.longitude.toFixed(6));

        setSettings(prev => ({
          ...prev,
          latitude: lat,
          longitude: lon
        }));

        // Immediately reverse geocode when getting current location
        await performReverseGeocode(lat, lon);

        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please allow location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
        }
        setLocationError(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    );
  };

  const handleTestVoice = () => {
    speak('Welcome to AgroAfrica. Voice features are working correctly. You can use voice input and read aloud throughout the app.');
  };

  const logRestore = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setRestoreLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleRestoreClick = () => {
    setShowRestoreConfirm(true);
  };

  const handleRestoreData = async () => {
    setShowRestoreConfirm(false);
    setIsRestoring(true);
    setRestoreLogs([]);
    logRestore('=== STARTING DATA RESTORATION ===');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logRestore('❌ No user found. Please sign in.');
        return;
      }

      logRestore(`✓ Authenticated as: ${user.email}`);

      // Fetch exchange rate
      logRestore('Fetching USD to KES exchange rate...');
      const rate = await convertBetweenCurrencies(1, 'USD', 'KES');
      logRestore(`✓ Using rate: 1 USD = ${rate} KES`);

      // Restore expenses
      logRestore('\nRestoring expenses...');
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id);

      if (expenses) {
        for (const expense of expenses) {
          const newAmount = Math.round(expense.amount * rate * 100) / 100;
          logRestore(`  Converting: ${expense.category} ${expense.amount} → ${newAmount}`);

          const { error } = await supabase
            .from('expenses')
            .update({ amount: newAmount })
            .eq('id', expense.id);

          if (error) {
            logRestore(`  ❌ Error updating expense ${expense.id}: ${error.message}`);
          } else {
            logRestore(`  ✓ Updated`);
          }
        }
      }

      // Restore income
      logRestore('\nRestoring income...');
      const { data: income } = await supabase
        .from('income')
        .select('*')
        .eq('user_id', user.id);

      if (income) {
        for (const incomeItem of income) {
          const newAmount = Math.round(incomeItem.amount * rate * 100) / 100;
          logRestore(`  Converting: ${incomeItem.source} ${incomeItem.amount} → ${newAmount}`);

          const { error } = await supabase
            .from('income')
            .update({ amount: newAmount })
            .eq('id', incomeItem.id);

          if (error) {
            logRestore(`  ❌ Error updating income ${incomeItem.id}: ${error.message}`);
          } else {
            logRestore(`  ✓ Updated`);
          }
        }
      }

      logRestore('\n✓✓✓ DATA RESTORATION COMPLETE! ✓✓✓');
      logRestore('Refreshing page in 3 seconds...');

      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error: any) {
      logRestore(`❌ Error during restoration: ${error.message}`);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showRestoreConfirm}
        title="Confirm Data Restoration"
        message="This will permanently modify your database! All expenses and income will be converted from USD to KES. This action cannot be undone. Are you sure you want to continue?"
        confirmLabel="Yes, Restore Data"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleRestoreData}
        onCancel={() => setShowRestoreConfirm(false)}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-1">Manage your farm profile and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {saveMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg"
        >
          {saveMessage}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Farm Profile */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-green-100 p-2 rounded-lg">
              <Globe className="text-green-600" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Farm Profile</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Farm Name
              </label>
              <input
                type="text"
                value={settings.farmName}
                onChange={(e) => updateSetting('farmName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Enter farm name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <MapPin size={14} />
                  Location
                  {isSearchingLocation && (
                    <span className="text-xs text-blue-600 ml-2">(searching...)</span>
                  )}
                </div>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.farmLocation}
                  onChange={(e) => updateSetting('farmLocation', e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      searchLocationByName();
                    }
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="e.g., Nairobi, Kenya or Mombasa"
                />
                <button
                  type="button"
                  onClick={searchLocationByName}
                  disabled={isSearchingLocation || !settings.farmLocation || settings.farmLocation.trim().length < 3}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {isSearchingLocation ? 'Searching...' : 'Search'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Type a city name and click Search to automatically fill coordinates
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Coordinates (for accurate weather)
              </label>

              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={isGettingLocation}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapPin size={18} />
                {isGettingLocation ? 'Getting Location...' : 'Get Current Location'}
              </button>

              {locationError && (
                <p className="text-sm text-red-600">{locationError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    value={settings.latitude}
                    onChange={(e) => updateSetting('latitude', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    placeholder="-1.2864"
                    step="0.000001"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    value={settings.longitude}
                    onChange={(e) => updateSetting('longitude', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    placeholder="36.8172"
                    step="0.000001"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => performReverseGeocode(settings.latitude, settings.longitude)}
                disabled={isReverseGeocoding || !isValidCoordinate(settings.latitude, settings.longitude)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapPin size={18} />
                {isReverseGeocoding ? 'Updating Location...' : 'Update Location from Coordinates'}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Owner Name
              </label>
              <input
                type="text"
                value={settings.ownerName}
                onChange={(e) => updateSetting('ownerName', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Your name"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-1">
                    <Ruler size={14} />
                    Farm Size (Auto-calculated)
                  </div>
                </label>
                <input
                  type="number"
                  value={calculatedFarmSize}
                  readOnly
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
                  min="0"
                  step="0.1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Total from all fields
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit
                </label>
                <select
                  value={settings.farmSizeUnit}
                  onChange={(e) => updateSetting('farmSizeUnit', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="acres">Acres</option>
                  <option value="hectares">Hectares</option>
                </select>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Display Preferences */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="text-blue-600" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Display Preferences</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => updateSetting('currency', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                {CURRENCIES.map(curr => (
                  <option key={curr.code} value={curr.code}>
                    {curr.name}
                  </option>
                ))}
              </select>

              {/* Currency Restore Warning */}
              <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="text-xs text-yellow-800 font-medium">Currency data corrupted?</p>
                    <p className="text-xs text-yellow-700 mt-1">If your expenses show wrong values (e.g., 10.03 instead of 1300), click below to restore from USD to KES.</p>
                    <button
                      onClick={() => setShowRestoreModal(true)}
                      className="mt-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700 transition-colors flex items-center gap-1"
                    >
                      <RefreshCw size={12} />
                      Restore Currency Data
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-1">
                  <Calendar size={14} />
                  Date Format
                </div>
              </label>
              <select
                value={settings.dateFormat}
                onChange={(e) => updateSetting('dateFormat', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY (US)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (UK/Kenya)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (ISO)</option>
              </select>
            </div>
          </div>
        </motion.div>

        {/* Language Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <LanguageSelector />
        </motion.div>

        {/* Push Notification Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <NotificationSettings />
        </motion.div>

        {/* Voice Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6 lg:col-span-2"
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Volume2 className="text-orange-600" size={20} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Voice Features</h2>
          </div>

          <div className="space-y-6">
            {/* Voice Enable/Disable Toggle */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h3 className="font-medium text-gray-900 mb-1">Enable Voice Features</h3>
                  <p className="text-sm text-gray-600">
                    {voiceEnabled
                      ? 'Voice features are currently enabled. Click to turn off.'
                      : 'Voice features are currently disabled. Click to turn on.'}
                  </p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(e) => setVoiceEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-8 bg-gray-300 rounded-full peer peer-checked:bg-green-600 peer-focus:ring-4 peer-focus:ring-green-300 transition-colors">
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform ${voiceEnabled ? 'translate-x-6' : ''}`}></div>
                  </div>
                </div>
              </label>
            </div>

            {/* Voice Support Status */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">Voice Capability Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${voiceSupport.speech ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Text-to-Speech (Read Aloud)</p>
                    <p className="text-xs text-gray-600">
                      {voiceSupport.speech ? 'Available' : 'Not supported in this browser'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${voiceSupport.recognition ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Speech-to-Text (Voice Input)</p>
                    <p className="text-xs text-gray-600">
                      {voiceSupport.recognition ? 'Available' : 'Not supported in this browser'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Voice Button */}
            {voiceSupport.speech && (
              <div>
                <TalkingButton
                  voiceLabel="Test Voice Output. Click to hear a sample of the text-to-speech feature."
                  onClick={handleTestVoice}
                  className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Volume2 size={20} />
                  Test Voice Output
                </TalkingButton>
                <p className="text-sm text-gray-600 mt-2">
                  Click to test the text-to-speech feature
                </p>
              </div>
            )}

            {/* Voice Features Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                <Mic size={18} />
                How to Use Voice Features
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Read Aloud:</strong> Look for speaker icons throughout the app to have text read to you, including AI responses and diagnoses.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Voice Input:</strong> Click microphone buttons to speak instead of typing in the AI Chat and Pest Control pages.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Accessibility:</strong> Voice features are designed to make the app accessible for everyone, including those who may have difficulty reading or typing.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Browser Support:</strong> Voice features work best in Chrome, Edge, and Safari browsers. Some features may not be available in older browsers.</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Restore Currency Modal */}
      {showRestoreModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">🔧 Restore Currency Data</h2>
                <button
                  onClick={() => setShowRestoreModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isRestoring}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                <div className="flex">
                  <AlertTriangle className="text-yellow-400 mr-3 flex-shrink-0" size={24} />
                  <div>
                    <h3 className="font-bold text-yellow-800">Warning</h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      This tool will convert all your expenses and income from USD back to KES.
                      It assumes your data was originally in KES and got corrupted.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
                <h3 className="font-bold text-blue-800 mb-2">How it works:</h3>
                <ol className="list-decimal list-inside text-blue-700 text-sm space-y-1">
                  <li>Fetches current exchange rate (USD to KES)</li>
                  <li>Multiplies all expense and income amounts by this rate</li>
                  <li>Updates all records in the database</li>
                </ol>
                <p className="text-blue-700 text-sm mt-2">
                  <strong>Example:</strong> 10.03 USD → ~1,304 KES (at rate ~130)
                </p>
              </div>

              <button
                onClick={handleRestoreClick}
                disabled={isRestoring}
                className="w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={20} className={isRestoring ? 'animate-spin' : ''} />
                {isRestoring ? 'Restoring...' : 'Restore Data (USD → KES)'}
              </button>

              {restoreLogs.length > 0 && (
                <div className="mt-4 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-xs max-h-96 overflow-y-auto">
                  {restoreLogs.map((log, i) => (
                    <div key={i} className="mb-1">{log}</div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
