// MarketWidget Component - Updated with multiple prices support and permissions
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Sparkles, Loader, Calendar, MapPin, Edit2, X, Plus } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { MarketPrice, LocalPriceOverride } from '../types';
import { sendMessageToGemini } from '../services/gemini';
import {
  getLocalPrices,
  getLocalPricesForCommodity,
  getLocalPriceById,
  saveLocalPrice,
  deleteLocalPrice,
  formatLastUpdated
} from '../services/localPrices';
import ConfirmDialog from './ConfirmDialog';

interface MarketWidgetProps {
  prices: MarketPrice[];
}

type TimePeriod = '7days' | '30days' | 'all';

// Color scheme for different commodities
const COMMODITY_COLORS: Record<string, string> = {
  // Cereals
  'Maize': '#16a34a', // Green
  'Rice': '#3b82f6', // Blue
  'Wheat': '#f59e0b', // Amber
  'Sorghum': '#84cc16', // Lime
  'Millet': '#a3e635', // Light lime

  // Root crops
  'Cassava': '#78350f', // Brown
  'Yams': '#92400e', // Dark brown
  'Sweet Potatoes': '#fb923c', // Orange

  // Legumes
  'Soybeans': '#ef4444', // Red
  'Groundnuts': '#dc2626', // Dark red
  'Cowpeas': '#b91c1c', // Crimson

  // Cash crops
  'Coffee': '#8b5cf6', // Purple
  'Cocoa': '#6b21a8', // Dark purple
  'Cotton': '#e0e7ff', // Light indigo
  'Tea': '#059669', // Emerald
  'Sugar': '#fbbf24', // Yellow

  // Fruits
  'Bananas': '#fde047', // Bright yellow
  'Plantains': '#facc15', // Yellow

  // Oilseeds
  'Sunflower Oil': '#eab308', // Golden
  'Sesame': '#ca8a04' // Dark golden
};

export default function MarketWidget({ prices }: MarketWidgetProps) {
  const { t } = useTranslation();
  const [aiInsights, setAiInsights] = useState<string[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30days');
  const [selectedCommodities, setSelectedCommodities] = useState<string[]>(
    prices.map(p => p.commodity)
  );
  // @ts-ignore - localPrices is used via setLocalPrices
  const [localPrices, setLocalPrices] = useState<LocalPriceOverride[]>([]);
  const [showLocalPriceModal, setShowLocalPriceModal] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingCommodity, setEditingCommodity] = useState<string | null>(null);
  const [showLocalPrices, setShowLocalPrices] = useState(false);

  // Form state for local price entry
  const [localPriceForm, setLocalPriceForm] = useState({
    price: '',
    marketName: '',
    userName: '',
    notes: ''
  });

  // Track current user name in localStorage for permission checks
  const [currentUserName, setCurrentUserName] = useState<string>(() => {
    return localStorage.getItem('currentUserName') || '';
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; priceId: string | null }>({ show: false, priceId: null });

  // Generate AI market insights when prices change
  useEffect(() => {
    if (prices.length === 0) return;

    async function generateInsights() {
      setIsLoadingInsights(true);
      try {
        // Build market summary for AI
        const marketSummary = prices.map(p =>
          `${p.commodity}: ${p.price} ${p.unit} (${p.change > 0 ? '+' : ''}${p.change}%)`
        ).join(', ');

        const prompt = `Based on these current commodity prices: ${marketSummary}.
        Provide exactly 3 actionable market insights for African farmers (one sentence each).
        Focus on: 1) Which crop shows best selling opportunity, 2) Market trend analysis, 3) Timing recommendation.
        Format as simple sentences, no bullet points or numbers.`;

        const response = await sendMessageToGemini(prompt, [], {});

        // Parse response into individual insights
        const insights = response
          .split('\n')
          .filter(line => line.trim().length > 10)
          .slice(0, 3);

        setAiInsights(insights);
      } catch (error) {
        console.error('Error generating market insights:', error);
        // Fallback to basic insights
        setAiInsights([
          'Check prices regularly to identify the best time to sell your harvest',
          'Compare market trends to decide which crops to plant next season',
          'Consider storage options when prices are low to sell later at better rates'
        ]);
      } finally {
        setIsLoadingInsights(false);
      }
    }

    generateInsights();
  }, [prices]);

  // Update selected commodities when prices change
  useEffect(() => {
    setSelectedCommodities(prices.map(p => p.commodity));
  }, [prices]);

  // Load local prices on mount and migrate old data
  useEffect(() => {
    // Migrate old prices that don't have IDs
    const prices = getLocalPrices();
    let needsMigration = false;

    const migratedPrices = prices.map(price => {
      if (!price.id) {
        needsMigration = true;
        return {
          ...price,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        };
      }
      return price;
    });

    if (needsMigration) {
      localStorage.setItem('localMarketPrices', JSON.stringify(migratedPrices));
      console.log('✓ Migrated old local prices to include IDs');
    }

    setLocalPrices(migratedPrices);
  }, []);

  // Handler to open local price modal
  const openLocalPriceModal = (commodity: string, priceId?: string) => {
    setEditingCommodity(commodity);
    setEditingPriceId(priceId || null);

    console.log('Opening modal:', {
      commodity,
      priceId,
      currentUserName,
      isEditing: !!priceId
    });

    // Pre-fill form if editing existing local price
    if (priceId) {
      const existing = getLocalPriceById(priceId);
      if (existing) {
        console.log('Editing existing price:', existing);
        setLocalPriceForm({
          price: existing.price.toString(),
          marketName: existing.marketName,
          userName: existing.userName || '',
          notes: existing.notes || ''
        });
      }
    } else {
      // Adding new price - use currentUserName, clear other fields
      console.log('Adding new price with currentUserName:', currentUserName);
      setLocalPriceForm({
        price: '',
        marketName: '',
        userName: currentUserName, // Use stored currentUserName
        notes: ''
      });
    }

    setShowLocalPriceModal(true);
  };

  // Handler to save local price
  const handleSaveLocalPrice = () => {
    if (!editingCommodity || !localPriceForm.price || !localPriceForm.marketName || !localPriceForm.userName) {
      toast.error('Please fill in price, market name, and your name');
      return;
    }

    try {
      // Get currency unit from the corresponding international price
      const internationalPrice = prices.find(p => p.commodity === editingCommodity);
      const unit = internationalPrice?.unit || 'KES/ton';

      // Build the price data
      const priceData = {
        commodity: editingCommodity,
        price: parseFloat(localPriceForm.price),
        unit,
        marketName: localPriceForm.marketName,
        userName: localPriceForm.userName,
        notes: localPriceForm.notes,
        ...(editingPriceId && { id: editingPriceId }) // Include ID only when editing
      };

      saveLocalPrice(priceData);

      // Save currentUserName to localStorage ONLY when creating new price (not editing)
      if (!editingPriceId) {
        console.log('Setting currentUserName:', localPriceForm.userName);
        localStorage.setItem('currentUserName', localPriceForm.userName);
        setCurrentUserName(localPriceForm.userName);
      }

      // Reload local prices
      setLocalPrices(getLocalPrices());

      // Close modal and reset state
      setShowLocalPriceModal(false);
      setEditingCommodity(null);
      setEditingPriceId(null);
      // Keep userName for next entry, clear other fields
      setLocalPriceForm({
        price: '',
        marketName: '',
        userName: localPriceForm.userName,
        notes: ''
      });
    } catch (error) {
      toast.error('Error saving local price');
      console.error(error);
    }
  };

  // Handler to delete local price
  const handleDeleteLocalPrice = (id: string) => {
    setDeleteConfirm({ show: true, priceId: id });
  };

  // Confirm deletion of local price
  const confirmDeleteLocalPrice = () => {
    if (deleteConfirm.priceId) {
      deleteLocalPrice(deleteConfirm.priceId);
      setLocalPrices(getLocalPrices());
      setShowLocalPriceModal(false);
      setEditingPriceId(null);
      setEditingCommodity(null);
    }
    setDeleteConfirm({ show: false, priceId: null });
  };

  // Process chart data for multi-commodity comparison
  const getChartData = () => {
    if (prices.length === 0) return [];

    // Get all unique dates from all commodities
    const allDates = new Set<string>();
    prices.forEach(price => {
      price.history.forEach(h => allDates.add(h.date));
    });

    // Sort dates chronologically
    const sortedDates = Array.from(allDates).sort((a, b) => {
      const dateA = new Date(a);
      const dateB = new Date(b);
      return dateA.getTime() - dateB.getTime();
    });

    // Filter by time period
    let filteredDates = sortedDates;
    if (timePeriod === '7days') {
      filteredDates = sortedDates.slice(-7);
    } else if (timePeriod === '30days') {
      filteredDates = sortedDates.slice(-30);
    }

    // Build chart data with all commodities
    return filteredDates.map(date => {
      const dataPoint: any = { date };

      prices.forEach(price => {
        if (selectedCommodities.includes(price.commodity)) {
          const historyItem = price.history.find(h => h.date === date);
          if (historyItem) {
            dataPoint[price.commodity] = historyItem.price;
          }
        }
      });

      return dataPoint;
    });
  };

  const chartData = getChartData();

  return (
    <>
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title={t('market.deletePrice', 'Remove Local Price')}
        message={t('market.deletePriceConfirm', 'Are you sure you want to remove this local price? This action cannot be undone.')}
        confirmLabel={t('common.delete', 'Remove')}
        cancelLabel={t('common.cancel', 'Cancel')}
        variant="danger"
        onConfirm={confirmDeleteLocalPrice}
        onCancel={() => setDeleteConfirm({ show: false, priceId: null })}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-md p-6"
      >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('market.priceComparison', 'Market Prices')}</h2>

        {/* Toggle between International and Local Prices */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLocalPrices(false)}
            className={`px-3 py-1.5 text-sm font-medium rounded-l-lg transition-colors ${
              !showLocalPrices
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t('market.international', 'International')}
          </button>
          <button
            onClick={() => setShowLocalPrices(true)}
            className={`px-3 py-1.5 text-sm font-medium rounded-r-lg transition-colors flex items-center gap-1 ${
              showLocalPrices
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <MapPin size={14} />
            {t('market.local', 'Local')}
          </button>
        </div>
      </div>

      {/* Price Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {prices.map((item, index) => {
          // Get ALL local prices for this commodity
          const commodityLocalPrices = getLocalPricesForCommodity(item.commodity);

          // Show International Price Card
          if (!showLocalPrices) {
            return (
              <motion.div
                key={item.commodity}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow relative"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-600">{item.commodity}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {item.price >= 1000 ? item.price.toLocaleString() : item.price.toFixed(2)}
                      <span className="text-sm text-gray-600 font-normal ml-1">/{item.unit}</span>
                    </p>
                  </div>

                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${
                    item.change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {item.change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    <span className="text-xs font-semibold">{Math.abs(item.change)}%</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    {item.change >= 0 ? 'Up' : 'Down'} from last week
                  </p>

                  {/* Add Local Price Button */}
                  <button
                    onClick={() => openLocalPriceModal(item.commodity)}
                    className="ml-auto flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    <Plus size={12} />
                    <span>Add Local</span>
                  </button>
                </div>
              </motion.div>
            );
          }

          // Show Local Price Cards (multiple cards per commodity)
          return (
            <div key={item.commodity} className="space-y-2">
              {/* Commodity Header */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-800">{item.commodity}</h3>
                <button
                  onClick={() => openLocalPriceModal(item.commodity)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-primary-600 hover:bg-primary-700 font-medium rounded-lg shadow-sm transition-colors"
                >
                  <Plus size={16} />
                  <span>Add Local</span>
                </button>
              </div>

              {/* Show all local price cards for this commodity */}
              {commodityLocalPrices.length > 0 ? (
                commodityLocalPrices.map((localPrice, lpIndex) => (
                  <motion.div
                    key={localPrice.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 + lpIndex * 0.05 }}
                    className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-3 hover:shadow-md transition-shadow relative border border-green-200"
                  >
                    {/* Local Price Badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 bg-green-600 text-white px-2 py-0.5 rounded-full text-xs">
                      <MapPin size={10} />
                      Local
                    </div>

                    <div className="mb-2">
                      <p className="text-2xl font-bold text-gray-900">
                        {localPrice.price >= 1000 ? localPrice.price.toLocaleString() : localPrice.price.toFixed(2)}
                        <span className="text-sm text-gray-600 font-normal ml-1">/{localPrice.unit}</span>
                      </p>

                      <div className="text-xs text-green-700 mt-1 space-y-0.5">
                        <p className="flex items-center gap-1">
                          <MapPin size={10} />
                          {localPrice.marketName}
                        </p>
                        <p className="text-green-600 ml-3">
                          By {localPrice.userName} • {formatLastUpdated(localPrice.updatedAt)}
                        </p>
                      </div>
                    </div>

                    {/* Show notes if available */}
                    {localPrice.notes && (
                      <p className="text-xs text-gray-600 mb-2 italic border-t border-green-200 pt-2">
                        {localPrice.notes}
                      </p>
                    )}

                    {/* Edit button - only show if user matches */}
                    {(() => {
                      const canEdit = currentUserName && localPrice.userName === currentUserName;
                      console.log('Permission check:', {
                        currentUserName,
                        priceUserName: localPrice.userName,
                        canEdit,
                        priceId: localPrice.id
                      });
                      return canEdit ? (
                        <button
                          onClick={() => openLocalPriceModal(item.commodity, localPrice.id)}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      ) : null;
                    })()}
                  </motion.div>
                ))
              ) : (
                <div className="bg-gray-50 rounded-lg p-3 text-center text-xs text-gray-500 italic">
                  No local prices yet. Click "Add Local" to add one.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Price Chart */}
      {prices.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">{t('market.priceComparison', 'Price Trends Comparison')}</p>

            {/* Time Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-500" />
              <div className="flex bg-gray-100 rounded-lg p-1">
                {[
                  { value: '7days' as TimePeriod, label: '7D' },
                  { value: '30days' as TimePeriod, label: '30D' },
                  { value: 'all' as TimePeriod, label: 'All' }
                ].map(period => (
                  <button
                    key={period.value}
                    onClick={() => setTimePeriod(period.value)}
                    className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                      timePeriod === period.value
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Commodity Filter Checkboxes */}
          <div className="flex flex-wrap gap-2 mb-3">
            {prices.map(price => (
              <label
                key={price.commodity}
                className="flex items-center gap-2 text-xs cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedCommodities.includes(price.commodity)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCommodities([...selectedCommodities, price.commodity]);
                    } else {
                      setSelectedCommodities(selectedCommodities.filter(c => c !== price.commodity));
                    }
                  }}
                  className="rounded text-primary-600 focus:ring-primary-500"
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COMMODITY_COLORS[price.commodity] || '#6b7280' }}
                />
                <span className="text-gray-700 font-medium">{price.commodity}</span>
              </label>
            ))}
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  stroke="#6b7280"
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  stroke="#6b7280"
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => {
                    if (value >= 1000) {
                      return `${(value / 1000).toFixed(1)}k`;
                    }
                    return value.toFixed(0);
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    padding: '8px 12px'
                  }}
                  formatter={(value: number, name: string) => [
                    typeof value === 'number' ? value.toFixed(2) : value,
                    name
                  ]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  iconType="line"
                />
                {prices.map(price => (
                  selectedCommodities.includes(price.commodity) && (
                    <Line
                      key={price.commodity}
                      type="monotone"
                      dataKey={price.commodity}
                      stroke={COMMODITY_COLORS[price.commodity] || '#6b7280'}
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name={price.commodity}
                    />
                  )
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-gray-500 mt-2 italic">
            Click commodity names above to show/hide trends • Select time period to zoom
          </p>
        </div>
      )}

      {/* AI Market Insights */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="text-primary-600" size={18} />
          <p className="text-sm font-medium text-gray-700">{t('market.aiInsights', 'AI Market Insights')}</p>
        </div>

        {isLoadingInsights ? (
          <div className="flex items-center justify-center py-8">
            <Loader className="animate-spin text-primary-600" size={24} />
            <p className="ml-3 text-sm text-gray-600">{t('market.analyzingTrends', 'Analyzing market trends...')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {aiInsights.map((insight, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-2 text-sm"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 flex-shrink-0"></div>
                <p className="text-gray-600">{insight}</p>
              </motion.div>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3 italic">
          {t('market.poweredBy', 'Powered by AI')} • {t('market.basedOnData', 'Based on current market data')}
        </p>
      </div>

      {/* Local Price Modal */}
      <AnimatePresence>
        {showLocalPriceModal && editingCommodity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLocalPriceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingPriceId
                    ? <span>Edit Local Price</span>
                    : <span>Add Local Price</span>}
                </h3>
                <button
                  onClick={() => setShowLocalPriceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('market.commodity', 'Commodity')}
                  </label>
                  <input
                    type="text"
                    value={editingCommodity}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('market.priceLabel', 'Price')} *
                  </label>
                  <input
                    type="number"
                    value={localPriceForm.price}
                    onChange={(e) => setLocalPriceForm({ ...localPriceForm, price: e.target.value })}
                    placeholder="Enter price"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('market.marketName', 'Market Name')} *
                  </label>
                  <input
                    type="text"
                    value={localPriceForm.marketName}
                    onChange={(e) => setLocalPriceForm({ ...localPriceForm, marketName: e.target.value })}
                    placeholder="e.g., Nairobi Central Market"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    value={localPriceForm.userName}
                    onChange={(e) => setLocalPriceForm({ ...localPriceForm, userName: e.target.value })}
                    placeholder="e.g., John Mwangi"
                    disabled={!!editingPriceId}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${editingPriceId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  />
                  {editingPriceId && (
                    <p className="text-xs text-gray-500 mt-1">Owner name cannot be changed when editing</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('market.notesOptional', 'Notes (optional)')}
                  </label>
                  <textarea
                    value={localPriceForm.notes}
                    onChange={(e) => setLocalPriceForm({ ...localPriceForm, notes: e.target.value })}
                    placeholder="Additional information..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                {/* Delete button if editing existing price */}
                {editingPriceId && (
                  <button
                    onClick={() => handleDeleteLocalPrice(editingPriceId)}
                    className="w-full mb-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg border border-red-300"
                  >
                    {t('common.delete', 'Delete')}
                  </button>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => setShowLocalPriceModal(false)}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300"
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSaveLocalPrice}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg shadow-sm"
                  >
                    <span>Save</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </>
  );
}
