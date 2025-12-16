import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bookmark, Bell, BellOff, Trash2, Search, X, Plus,
  Clock, Filter, Check, AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import type { SavedSearch, SavedSearchCriteria } from '../../types';
import { getCategoryById, getSubcategoryById, QUALITY_GRADES } from '../../constants/marketplaceCategories';

interface SavedSearchesProps {
  currentCriteria?: SavedSearchCriteria;
  onApplySearch: (criteria: SavedSearchCriteria) => void;
  onClose?: () => void;
  isInline?: boolean;
}

// Mock data - in production, this would come from the database
const mockSavedSearches: SavedSearch[] = [];

export function SavedSearches({
  currentCriteria,
  onApplySearch,
  onClose: _onClose,
  isInline = false
}: SavedSearchesProps) {
  // Suppress unused variable warning
  void _onClose;

  const { user } = useAuth();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(mockSavedSearches);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveFormData, setSaveFormData] = useState<{
    name: string;
    description: string;
    alertsEnabled: boolean;
    alertFrequency: 'instant' | 'daily' | 'weekly';
    alertMethod: 'in_app' | 'email' | 'sms' | 'whatsapp';
  }>({
    name: '',
    description: '',
    alertsEnabled: true,
    alertFrequency: 'daily',
    alertMethod: 'in_app'
  });

  useEffect(() => {
    if (user) {
      loadSavedSearches();
    }
  }, [user]);

  async function loadSavedSearches() {
    // In production, fetch from Supabase
    setIsLoading(true);
    try {
      // Simulating API call
      await new Promise(resolve => setTimeout(resolve, 300));
      // In production: const data = await db.getSavedSearches();
      // setSavedSearches(data);
    } catch (error) {
      console.error('Error loading saved searches:', error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleSaveSearch = async () => {
    if (!currentCriteria || !saveFormData.name.trim()) {
      toast.error('Please provide a name for your search');
      return;
    }

    const hasAnyCriteria = Object.values(currentCriteria).some(v =>
      v !== undefined && v !== '' && v !== false
    );

    if (!hasAnyCriteria) {
      toast.error('Please set at least one search filter before saving');
      return;
    }

    try {
      const newSearch: SavedSearch = {
        id: `search_${Date.now()}`,
        userId: user?.id || '',
        name: saveFormData.name,
        description: saveFormData.description,
        criteria: currentCriteria,
        alertsEnabled: saveFormData.alertsEnabled,
        alertFrequency: saveFormData.alertFrequency,
        alertMethod: saveFormData.alertMethod,
        newMatchesCount: 0,
        totalMatchesFound: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      // In production: await db.saveSavedSearch(newSearch);
      setSavedSearches(prev => [...prev, newSearch]);
      setShowSaveModal(false);
      setSaveFormData({
        name: '',
        description: '',
        alertsEnabled: true,
        alertFrequency: 'daily',
        alertMethod: 'in_app'
      });
      toast.success('Search saved successfully!');
    } catch (error) {
      console.error('Error saving search:', error);
      toast.error('Failed to save search');
    }
  };

  const handleDeleteSearch = async (id: string) => {
    try {
      // In production: await db.deleteSavedSearch(id);
      setSavedSearches(prev => prev.filter(s => s.id !== id));
      toast.success('Search deleted');
    } catch (error) {
      console.error('Error deleting search:', error);
      toast.error('Failed to delete search');
    }
  };

  const handleToggleAlerts = async (search: SavedSearch) => {
    try {
      const updatedSearch = {
        ...search,
        alertsEnabled: !search.alertsEnabled,
        updatedAt: new Date().toISOString()
      };
      // In production: await db.updateSavedSearch(search.id, { alertsEnabled: !search.alertsEnabled });
      setSavedSearches(prev => prev.map(s => s.id === search.id ? updatedSearch : s));
      toast.success(updatedSearch.alertsEnabled ? 'Alerts enabled' : 'Alerts disabled');
    } catch (error) {
      console.error('Error toggling alerts:', error);
      toast.error('Failed to update alerts');
    }
  };

  const formatCriteria = (criteria: SavedSearchCriteria): string => {
    const parts: string[] = [];

    if (criteria.query) parts.push(`"${criteria.query}"`);
    if (criteria.categoryId) {
      const cat = getCategoryById(criteria.categoryId);
      if (cat) parts.push(cat.name);
    }
    if (criteria.subcategoryId && criteria.categoryId) {
      const sub = getSubcategoryById(criteria.categoryId, criteria.subcategoryId);
      if (sub) parts.push(sub.name);
    }
    if (criteria.location) parts.push(`in ${criteria.location}`);
    if (criteria.priceMin || criteria.priceMax) {
      const min = criteria.priceMin ? `KES ${criteria.priceMin}` : '';
      const max = criteria.priceMax ? `KES ${criteria.priceMax}` : '';
      if (min && max) parts.push(`${min} - ${max}`);
      else if (min) parts.push(`from ${min}`);
      else if (max) parts.push(`up to ${max}`);
    }
    if (criteria.quality && QUALITY_GRADES[criteria.quality as keyof typeof QUALITY_GRADES]) {
      parts.push(QUALITY_GRADES[criteria.quality as keyof typeof QUALITY_GRADES].name);
    }
    if (criteria.deliveryOnly) parts.push('delivery available');
    if (criteria.verifiedOnly) parts.push('verified sellers');

    return parts.length > 0 ? parts.join(' | ') : 'All products';
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <AlertCircle className="mx-auto text-yellow-500 mb-2" size={24} />
        <p className="text-yellow-700">Sign in to save searches and get alerts</p>
      </div>
    );
  }

  const content = (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="text-green-600" size={20} />
          <h3 className="font-semibold text-gray-900">Saved Searches</h3>
          {savedSearches.length > 0 && (
            <span className="text-sm text-gray-500">({savedSearches.length})</span>
          )}
        </div>
        {currentCriteria && (
          <button
            onClick={() => setShowSaveModal(true)}
            className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-1"
          >
            <Plus size={14} />
            Save Current Search
          </button>
        )}
      </div>

      {/* Saved Searches List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </div>
      ) : savedSearches.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Search className="mx-auto text-gray-400 mb-3" size={32} />
          <p className="text-gray-600 mb-2">No saved searches yet</p>
          <p className="text-sm text-gray-500">
            Set your filters and click "Save Current Search" to get alerts for new matches
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedSearches.map((search) => (
            <motion.div
              key={search.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900">{search.name}</h4>
                    {search.newMatchesCount > 0 && (
                      <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                        {search.newMatchesCount} new
                      </span>
                    )}
                    {search.alertsEnabled ? (
                      <Bell size={14} className="text-green-500" />
                    ) : (
                      <BellOff size={14} className="text-gray-400" />
                    )}
                  </div>

                  {search.description && (
                    <p className="text-sm text-gray-500 mb-2">{search.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                    <Filter size={12} />
                    <span className="line-clamp-1">{formatCriteria(search.criteria)}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Created {format(new Date(search.createdAt), 'MMM d, yyyy')}
                    </span>
                    <span>{search.totalMatchesFound} total matches</span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onApplySearch(search.criteria)}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                    title="Apply this search"
                  >
                    <Search size={16} />
                  </button>
                  <button
                    onClick={() => handleToggleAlerts(search)}
                    className={`p-2 rounded-lg transition-colors ${
                      search.alertsEnabled
                        ? 'text-green-600 hover:bg-green-100'
                        : 'text-gray-400 hover:bg-gray-200'
                    }`}
                    title={search.alertsEnabled ? 'Disable alerts' : 'Enable alerts'}
                  >
                    {search.alertsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </button>
                  <button
                    onClick={() => handleDeleteSearch(search.id)}
                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                    title="Delete search"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Save Search Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Save Search</h3>
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Current Criteria Preview */}
                {currentCriteria && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 font-medium mb-1">Search Criteria:</p>
                    <p className="text-sm text-gray-700">{formatCriteria(currentCriteria)}</p>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Search Name *
                  </label>
                  <input
                    type="text"
                    value={saveFormData.name}
                    onChange={(e) => setSaveFormData({ ...saveFormData, name: e.target.value })}
                    placeholder="e.g., Premium Maize in Nairobi"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={saveFormData.description}
                    onChange={(e) => setSaveFormData({ ...saveFormData, description: e.target.value })}
                    placeholder="Add a note about this search..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                {/* Alerts Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Enable Alerts</p>
                    <p className="text-sm text-gray-500">Get notified when new matches are found</p>
                  </div>
                  <button
                    onClick={() => setSaveFormData({ ...saveFormData, alertsEnabled: !saveFormData.alertsEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      saveFormData.alertsEnabled ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        saveFormData.alertsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Alert Settings (if enabled) */}
                {saveFormData.alertsEnabled && (
                  <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-green-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={saveFormData.alertFrequency}
                        onChange={(e) => setSaveFormData({ ...saveFormData, alertFrequency: e.target.value as 'instant' | 'daily' | 'weekly' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      >
                        <option value="instant">Instant</option>
                        <option value="daily">Daily digest</option>
                        <option value="weekly">Weekly summary</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Method
                      </label>
                      <select
                        value={saveFormData.alertMethod}
                        onChange={(e) => setSaveFormData({ ...saveFormData, alertMethod: e.target.value as 'in_app' | 'email' | 'sms' | 'whatsapp' })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      >
                        <option value="in_app">In-app notification</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="whatsapp">WhatsApp</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSearch}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={16} />
                    Save Search
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );

  if (isInline) {
    return content;
  }

  return (
    <div className="bg-white rounded-xl shadow-md p-4">
      {content}
    </div>
  );
}

// Save Search Button Component (for use in filter bar)
interface SaveSearchButtonProps {
  criteria: SavedSearchCriteria;
  hasActiveFilters: boolean;
}

export function SaveSearchButton({ criteria, hasActiveFilters }: SaveSearchButtonProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);

  if (!user) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={!hasActiveFilters}
        className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors ${
          hasActiveFilters
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
        title={hasActiveFilters ? 'Save this search for alerts' : 'Set filters to save a search'}
      >
        <Bookmark size={14} />
        Save Search
      </button>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Save Search</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <SavedSearches
                  currentCriteria={criteria}
                  onApplySearch={() => {}}
                  onClose={() => setShowModal(false)}
                  isInline
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
