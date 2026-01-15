import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wheat,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Calendar,
  MapPin,
  ChevronRight,
  X,
  Calculator,
  BarChart3,
  Award,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useHarvests,
  useHarvestAnalytics,
  useRecordHarvest,
  useRecordSale,
  useUpdateHarvestCosts,
  getCropTypeInfo,
  getQualityGradeInfo,
  getSeasonInfo,
  formatCurrency,
  formatQuantity,
  type Harvest,
} from '../../hooks/useHarvests';
import { useFields } from '../../hooks/useSupabaseData';

interface HarvestTrackerProps {
  userId: string | undefined;
  userFields?: Array<{ id: string; name: string; cropType?: string }>;
}

export default function HarvestTracker({ userId, userFields }: HarvestTrackerProps) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const [activeTab, setActiveTab] = useState<'overview' | 'harvests' | 'analytics'>('overview');
  const [showAddHarvest, setShowAddHarvest] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { data: harvests, isLoading } = useHarvests(userId, { year: selectedYear, limit: 50 });
  const { data: analytics } = useHarvestAnalytics(userId, { year: selectedYear });
  // Use userFields prop if provided, otherwise fetch from hook
  const { data: fieldsFromHook } = useFields(userId);
  const fields = userFields || fieldsFromHook || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wheat className="w-6 h-6 text-amber-600" />
            {isSwahili ? 'Ufuatiliaji wa Mavuno' : 'Harvest Tracker'}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isSwahili ? 'Fuatilia mavuno, mauzo, na faida yako' : 'Track your harvests, sales, and profits'}
          </p>
        </div>
        <button
          onClick={() => setShowAddHarvest(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isSwahili ? 'Ongeza Mavuno' : 'Add Harvest'}
        </button>
      </div>

      {/* Year Selector */}
      <div className="flex items-center gap-2">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {[2024, 2025, 2026].map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { key: 'overview', label: isSwahili ? 'Muhtasari' : 'Overview', icon: BarChart3 },
          { key: 'harvests', label: isSwahili ? 'Mavuno' : 'Harvests', icon: Package },
          { key: 'analytics', label: isSwahili ? 'Uchambuzi' : 'Analytics', icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors ${
              activeTab === key
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <OverviewTab analytics={analytics} harvests={harvests || []} isSwahili={isSwahili} />
          </motion.div>
        )}

        {activeTab === 'harvests' && (
          <motion.div
            key="harvests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <HarvestsTab harvests={harvests || []} isSwahili={isSwahili} />
          </motion.div>
        )}

        {activeTab === 'analytics' && (
          <motion.div
            key="analytics"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <AnalyticsTab analytics={analytics} isSwahili={isSwahili} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Harvest Modal */}
      <AddHarvestModal
        isOpen={showAddHarvest}
        onClose={() => setShowAddHarvest(false)}
        userId={userId}
        fields={fields}
        isSwahili={isSwahili}
      />
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  analytics,
  harvests,
  isSwahili,
}: {
  analytics: ReturnType<typeof useHarvestAnalytics>['data'];
  harvests: Harvest[];
  isSwahili: boolean;
}) {
  const summary = analytics?.summary;

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Package className="w-5 h-5 text-blue-600" />}
          label={isSwahili ? 'Jumla ya Mavuno' : 'Total Harvests'}
          value={summary?.totalHarvests?.toString() || '0'}
          color="blue"
        />
        <StatCard
          icon={<Wheat className="w-5 h-5 text-amber-600" />}
          label={isSwahili ? 'Jumla (kg)' : 'Total Quantity'}
          value={formatQuantity(summary?.totalQuantity || 0, 'kg')}
          color="amber"
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5 text-green-600" />}
          label={isSwahili ? 'Mapato' : 'Revenue'}
          value={formatCurrency(summary?.totalRevenue || 0)}
          color="green"
        />
        <StatCard
          icon={summary?.totalProfit && summary.totalProfit >= 0 ? (
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          ) : (
            <TrendingDown className="w-5 h-5 text-red-600" />
          )}
          label={isSwahili ? 'Faida' : 'Profit'}
          value={formatCurrency(summary?.totalProfit || 0)}
          color={summary?.totalProfit && summary.totalProfit >= 0 ? 'emerald' : 'red'}
        />
      </div>

      {/* Best Performing Crop */}
      {analytics?.bestCrop && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-800/50 rounded-full flex items-center justify-center">
              <Award className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {isSwahili ? 'Zao Bora Zaidi' : 'Best Performing Crop'}
              </p>
              <p className="font-bold text-lg text-gray-900 dark:text-white flex items-center gap-2">
                <span>{getCropTypeInfo(analytics.bestCrop.crop).icon}</span>
                {getCropTypeInfo(analytics.bestCrop.crop).name}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {formatCurrency(analytics.bestCrop.profit)} {isSwahili ? 'faida' : 'profit'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Harvests */}
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          {isSwahili ? 'Mavuno ya Hivi Karibuni' : 'Recent Harvests'}
        </h3>
        {harvests.length > 0 ? (
          <div className="space-y-2">
            {harvests.slice(0, 5).map((harvest) => (
              <HarvestCard key={harvest.id} harvest={harvest} isSwahili={isSwahili} compact />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Wheat className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{isSwahili ? 'Hakuna mavuno yaliyorekodiwa' : 'No harvests recorded yet'}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Harvests Tab Component
function HarvestsTab({
  harvests,
  isSwahili,
}: {
  harvests: Harvest[];
  isSwahili: boolean;
}) {
  const [selectedHarvest, setSelectedHarvest] = useState<Harvest | null>(null);

  return (
    <div className="space-y-3">
      {harvests.length > 0 ? (
        harvests.map((harvest) => (
          <HarvestCard
            key={harvest.id}
            harvest={harvest}
            isSwahili={isSwahili}
            onClick={() => setSelectedHarvest(harvest)}
          />
        ))
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <Package className="w-16 h-16 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">{isSwahili ? 'Hakuna mavuno' : 'No harvests'}</p>
          <p className="text-sm">{isSwahili ? 'Anza kurekodi mavuno yako' : 'Start recording your harvests'}</p>
        </div>
      )}

      {/* Harvest Details Modal */}
      {selectedHarvest && (
        <HarvestDetailsModal
          harvest={selectedHarvest}
          isSwahili={isSwahili}
          onClose={() => setSelectedHarvest(null)}
        />
      )}
    </div>
  );
}

// Analytics Tab Component
function AnalyticsTab({
  analytics,
  isSwahili,
}: {
  analytics: ReturnType<typeof useHarvestAnalytics>['data'];
  isSwahili: boolean;
}) {
  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-500">
        <BarChart3 className="w-16 h-16 mx-auto mb-3 opacity-50" />
        <p>{isSwahili ? 'Hakuna data ya kutosha' : 'Not enough data for analytics'}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profit Margin */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
          {isSwahili ? 'Uchambuzi wa Faida' : 'Profit Analysis'}
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSwahili ? 'Kiwango cha Faida' : 'Profit Margin'}
            </p>
            <p className="text-3xl font-bold text-green-600">
              {analytics.summary.profitMargin}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSwahili ? 'Mavuno kwa Ekari' : 'Yield per Acre'}
            </p>
            <p className="text-xl font-semibold text-gray-900 dark:text-white">
              {analytics.summary.avgYieldPerAcre} kg
            </p>
          </div>
        </div>
      </div>

      {/* By Crop */}
      {analytics.byCrop && analytics.byCrop.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {isSwahili ? 'Kwa Zao' : 'By Crop'}
          </h3>
          <div className="space-y-3">
            {analytics.byCrop.map((crop) => {
              const cropInfo = getCropTypeInfo(crop.crop);
              const profitPercent = crop.totalRevenue > 0
                ? (crop.profit / crop.totalRevenue) * 100
                : 0;

              return (
                <div key={crop.crop} className="flex items-center gap-3">
                  <span className="text-2xl">{cropInfo.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {cropInfo.name}
                      </span>
                      <span className={`text-sm font-semibold ${
                        crop.profit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(crop.profit)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{crop.harvests} harvests</span>
                      <span>•</span>
                      <span>{formatQuantity(crop.totalQuantity, 'kg')}</span>
                      <span>•</span>
                      <span>{profitPercent.toFixed(0)}% margin</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* By Season */}
      {analytics.bySeason && analytics.bySeason.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            {isSwahili ? 'Kwa Msimu' : 'By Season'}
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {analytics.bySeason.map((season) => {
              const seasonInfo = getSeasonInfo(season.season);
              return (
                <div key={season.season} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{seasonInfo.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white text-sm">
                      {seasonInfo.name}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(season.profit)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {season.harvests} {isSwahili ? 'mavuno' : 'harvests'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className={`bg-${color}-50 dark:bg-${color}-900/20 rounded-xl p-3`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-600 dark:text-gray-400">{label}</span>
      </div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

// Harvest Card Component
function HarvestCard({
  harvest,
  isSwahili,
  compact = false,
  onClick,
}: {
  harvest: Harvest;
  isSwahili: boolean;
  compact?: boolean;
  onClick?: () => void;
}) {
  const cropInfo = getCropTypeInfo(harvest.cropType);
  const qualityInfo = getQualityGradeInfo(harvest.qualityGrade);
  const cropName = isSwahili ? cropInfo.nameSw : cropInfo.name;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${
        compact ? 'p-3' : 'p-4'
      } ${onClick ? 'cursor-pointer hover:border-green-300 dark:hover:border-green-700' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xl">
          {cropInfo.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-white">
              {cropName}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full bg-${qualityInfo.color}-100 dark:bg-${qualityInfo.color}-900/30 text-${qualityInfo.color}-700 dark:text-${qualityInfo.color}-400`}>
              {qualityInfo.name}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Calendar className="w-3 h-3" />
            <span>{new Date(harvest.harvestDate).toLocaleDateString()}</span>
            {harvest.fieldName && (
              <>
                <span>•</span>
                <MapPin className="w-3 h-3" />
                <span className="truncate">{harvest.fieldName}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatQuantity(harvest.quantity, harvest.unit)}
          </p>
          {harvest.profit !== 0 && (
            <p className={`text-sm font-medium ${
              harvest.profit >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(harvest.profit)}
            </p>
          )}
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-gray-400" />}
      </div>
    </motion.div>
  );
}

// Add Harvest Modal
function AddHarvestModal({
  isOpen,
  onClose,
  userId,
  fields,
  isSwahili,
}: {
  isOpen: boolean;
  onClose: () => void;
  userId: string | undefined;
  fields: Array<{ id: string; name: string; cropType?: string }>;
  isSwahili: boolean;
}) {
  const [formData, setFormData] = useState({
    cropType: 'maize',
    quantity: '',
    unit: 'kg',
    fieldId: '',
    harvestDate: new Date().toISOString().split('T')[0],
    areaPlanted: '',
    qualityGrade: 'A',
    season: '',
    notes: '',
  });

  const { mutate: recordHarvest, isPending } = useRecordHarvest();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !formData.quantity) return;

    recordHarvest({
      userId,
      cropType: formData.cropType,
      quantity: Number(formData.quantity),
      unit: formData.unit,
      fieldId: formData.fieldId || undefined,
      harvestDate: formData.harvestDate,
      areaPlanted: formData.areaPlanted ? Number(formData.areaPlanted) : undefined,
      qualityGrade: formData.qualityGrade,
      season: formData.season || undefined,
      notes: formData.notes || undefined,
    }, {
      onSuccess: () => {
        onClose();
        setFormData({
          cropType: 'maize',
          quantity: '',
          unit: 'kg',
          fieldId: '',
          harvestDate: new Date().toISOString().split('T')[0],
          areaPlanted: '',
          qualityGrade: 'A',
          season: '',
          notes: '',
        });
      },
    });
  };

  if (!isOpen) return null;

  const crops = ['maize', 'beans', 'tomato', 'cabbage', 'potato', 'rice', 'wheat', 'onion', 'kale', 'carrot'];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {isSwahili ? 'Rekodi Mavuno' : 'Record Harvest'}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Crop Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Aina ya Zao' : 'Crop Type'}
            </label>
            <select
              value={formData.cropType}
              onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              {crops.map((crop) => {
                const info = getCropTypeInfo(crop);
                return (
                  <option key={crop} value={crop}>
                    {info.icon} {info.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isSwahili ? 'Kiasi' : 'Quantity'}
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isSwahili ? 'Kipimo' : 'Unit'}
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="kg">Kilograms (kg)</option>
                <option value="bags">Bags (90kg)</option>
                <option value="tonnes">Tonnes</option>
                <option value="crates">Crates</option>
              </select>
            </div>
          </div>

          {/* Field Selection */}
          {fields.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isSwahili ? 'Shamba' : 'Field'} ({isSwahili ? 'Hiari' : 'Optional'})
              </label>
              <select
                value={formData.fieldId}
                onChange={(e) => setFormData({ ...formData, fieldId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">{isSwahili ? 'Chagua shamba' : 'Select field'}</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>{field.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Harvest Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Tarehe ya Mavuno' : 'Harvest Date'}
            </label>
            <input
              type="date"
              value={formData.harvestDate}
              onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {/* Area Planted */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Eneo Lililopandwa (ekari)' : 'Area Planted (acres)'} ({isSwahili ? 'Hiari' : 'Optional'})
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.areaPlanted}
              onChange={(e) => setFormData({ ...formData, areaPlanted: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.0"
            />
          </div>

          {/* Quality Grade */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Daraja la Ubora' : 'Quality Grade'}
            </label>
            <div className="flex gap-2">
              {['A', 'B', 'C'].map((grade) => {
                const info = getQualityGradeInfo(grade);
                return (
                  <button
                    key={grade}
                    type="button"
                    onClick={() => setFormData({ ...formData, qualityGrade: grade })}
                    className={`flex-1 py-2 px-3 rounded-lg border ${
                      formData.qualityGrade === grade
                        ? `border-${info.color}-500 bg-${info.color}-50 dark:bg-${info.color}-900/20 text-${info.color}-700 dark:text-${info.color}-400`
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {info.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Season */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Msimu' : 'Season'} ({isSwahili ? 'Hiari' : 'Optional'})
            </label>
            <select
              value={formData.season}
              onChange={(e) => setFormData({ ...formData, season: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">{isSwahili ? 'Chagua msimu' : 'Select season'}</option>
              <option value="long_rains">Long Rains (Masika)</option>
              <option value="short_rains">Short Rains (Vuli)</option>
              <option value="irrigated">Irrigated</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Maelezo' : 'Notes'} ({isSwahili ? 'Hiari' : 'Optional'})
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
              placeholder={isSwahili ? 'Maelezo ya ziada...' : 'Additional notes...'}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending || !formData.quantity}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Wheat className="w-5 h-5" />
            )}
            {isSwahili ? 'Hifadhi Mavuno' : 'Save Harvest'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

// Harvest Details Modal
function HarvestDetailsModal({
  harvest,
  isSwahili,
  onClose,
}: {
  harvest: Harvest;
  isSwahili: boolean;
  onClose: () => void;
}) {
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showCostForm, setShowCostForm] = useState(false);
  const [saleData, setSaleData] = useState({
    quantity: '',
    amount: '',
    buyerName: '',
  });
  const [costData, setCostData] = useState({
    seedCost: harvest.seedCost.toString(),
    fertilizerCost: harvest.fertilizerCost.toString(),
    pesticideCost: harvest.pesticideCost.toString(),
    laborCost: harvest.laborCost.toString(),
    transportCost: harvest.transportCost.toString(),
    otherCost: harvest.otherCost.toString(),
  });

  const { mutate: recordSale, isPending: isSelling } = useRecordSale();
  const { mutate: updateCosts, isPending: isUpdatingCosts } = useUpdateHarvestCosts();

  const cropInfo = getCropTypeInfo(harvest.cropType);
  const qualityInfo = getQualityGradeInfo(harvest.qualityGrade);
  const remainingQuantity = harvest.quantity - harvest.soldQuantity;

  const handleRecordSale = () => {
    if (!saleData.quantity || !saleData.amount) return;

    recordSale({
      harvestId: harvest.id,
      soldQuantity: Number(saleData.quantity),
      soldAmount: Number(saleData.amount),
      buyerName: saleData.buyerName || undefined,
    }, {
      onSuccess: () => {
        setShowSaleForm(false);
        setSaleData({ quantity: '', amount: '', buyerName: '' });
      },
    });
  };

  const handleUpdateCosts = () => {
    updateCosts({
      harvestId: harvest.id,
      costs: {
        seedCost: Number(costData.seedCost) || 0,
        fertilizerCost: Number(costData.fertilizerCost) || 0,
        pesticideCost: Number(costData.pesticideCost) || 0,
        laborCost: Number(costData.laborCost) || 0,
        transportCost: Number(costData.transportCost) || 0,
        otherCost: Number(costData.otherCost) || 0,
      },
    }, {
      onSuccess: () => setShowCostForm(false),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{cropInfo.icon}</span>
              <div>
                <h3 className="font-bold text-lg">{cropInfo.name}</h3>
                <p className="text-white/80 text-sm">
                  {new Date(harvest.harvestDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isSwahili ? 'Kiasi' : 'Quantity'}</p>
              <p className="font-bold text-gray-900 dark:text-white">{formatQuantity(harvest.quantity, harvest.unit)}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-600 dark:text-gray-400">{isSwahili ? 'Kuuzwa' : 'Sold'}</p>
              <p className="font-bold text-gray-900 dark:text-white">{formatQuantity(harvest.soldQuantity, harvest.unit)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${
              harvest.profit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'
            }`}>
              <p className="text-xs text-gray-600 dark:text-gray-400">{isSwahili ? 'Faida' : 'Profit'}</p>
              <p className={`font-bold ${harvest.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {formatCurrency(harvest.profit)}
              </p>
            </div>
          </div>

          {/* Quality & Field */}
          <div className="flex items-center gap-3 text-sm">
            <span className={`px-2 py-1 rounded-full bg-${qualityInfo.color}-100 dark:bg-${qualityInfo.color}-900/30 text-${qualityInfo.color}-700`}>
              {qualityInfo.name}
            </span>
            {harvest.fieldName && (
              <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                {harvest.fieldName}
              </span>
            )}
          </div>

          {/* Sales Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                {isSwahili ? 'Mauzo' : 'Sales'}
              </h4>
              {remainingQuantity > 0 && !showSaleForm && (
                <button
                  onClick={() => setShowSaleForm(true)}
                  className="text-sm text-green-600 hover:text-green-700"
                >
                  {isSwahili ? 'Rekodi Mauzo' : 'Record Sale'}
                </button>
              )}
            </div>

            {showSaleForm ? (
              <div className="space-y-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={saleData.quantity}
                    onChange={(e) => setSaleData({ ...saleData, quantity: e.target.value })}
                    placeholder={`Quantity (max ${remainingQuantity})`}
                    className="px-3 py-2 border rounded-lg text-sm"
                    max={remainingQuantity}
                  />
                  <input
                    type="number"
                    value={saleData.amount}
                    onChange={(e) => setSaleData({ ...saleData, amount: e.target.value })}
                    placeholder="Amount (KES)"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <input
                  type="text"
                  value={saleData.buyerName}
                  onChange={(e) => setSaleData({ ...saleData, buyerName: e.target.value })}
                  placeholder="Buyer name (optional)"
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowSaleForm(false)}
                    className="flex-1 py-2 border rounded-lg text-sm"
                  >
                    {isSwahili ? 'Ghairi' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleRecordSale}
                    disabled={isSelling}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm"
                  >
                    {isSelling ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isSwahili ? 'Hifadhi' : 'Save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>{isSwahili ? 'Jumla ya mauzo' : 'Total sales'}: {formatCurrency(harvest.soldAmount)}</p>
                <p>{isSwahili ? 'Kiasi kilichobaki' : 'Remaining'}: {formatQuantity(remainingQuantity, harvest.unit)}</p>
              </div>
            )}
          </div>

          {/* Costs Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-600" />
                {isSwahili ? 'Gharama' : 'Costs'}
              </h4>
              {!showCostForm && (
                <button
                  onClick={() => setShowCostForm(true)}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  {isSwahili ? 'Hariri' : 'Edit'}
                </button>
              )}
            </div>

            {showCostForm ? (
              <div className="space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                {[
                  { key: 'seedCost', label: isSwahili ? 'Mbegu' : 'Seeds' },
                  { key: 'fertilizerCost', label: isSwahili ? 'Mbolea' : 'Fertilizer' },
                  { key: 'pesticideCost', label: isSwahili ? 'Dawa' : 'Pesticide' },
                  { key: 'laborCost', label: isSwahili ? 'Kazi' : 'Labor' },
                  { key: 'transportCost', label: isSwahili ? 'Usafiri' : 'Transport' },
                  { key: 'otherCost', label: isSwahili ? 'Nyingine' : 'Other' },
                ].map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs w-20">{label}</span>
                    <input
                      type="number"
                      value={costData[key as keyof typeof costData]}
                      onChange={(e) => setCostData({ ...costData, [key]: e.target.value })}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                    />
                  </div>
                ))}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowCostForm(false)}
                    className="flex-1 py-2 border rounded-lg text-sm"
                  >
                    {isSwahili ? 'Ghairi' : 'Cancel'}
                  </button>
                  <button
                    onClick={handleUpdateCosts}
                    disabled={isUpdatingCosts}
                    className="flex-1 py-2 bg-amber-600 text-white rounded-lg text-sm"
                  >
                    {isUpdatingCosts ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : (isSwahili ? 'Hifadhi' : 'Save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <p>{isSwahili ? 'Jumla ya gharama' : 'Total costs'}: {formatCurrency(harvest.totalCost)}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {harvest.notes && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                {isSwahili ? 'Maelezo' : 'Notes'}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{harvest.notes}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
