import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calculator,
  Plus,
  TrendingUp,
  PieChart,
  BarChart3,
  DollarSign,
  Calendar,
  MapPin,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Lightbulb,
  Target,
  Loader2,
  Tag,
  ShoppingCart,
  Sprout,
  Ruler,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  Link2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '../../store/uiStore';
import {
  useInputCosts,
  useInputCostSummary,
  useProfitProjection,
  useCostRecommendations,
  useAddInputCost,
  useUpdateInputCost,
  useDeleteInputCost,
  INPUT_COST_CATEGORIES,
  COMMON_UNITS,
  getCategoryInfo,
  formatCurrency,
} from '../../hooks/useInputCosts';
import type { InputCost, InputCostCategory, Field, Expense } from '../../types';
import { getFields } from '../../services/database';
import { useQuery } from '@tanstack/react-query';
import { useExpenses } from '../../hooks/useSupabaseData';
import { useAuth } from '../../contexts/AuthContext';

interface InputCostCalculatorProps {
  userId?: string;
  initialFieldId?: string;
}

export default function InputCostCalculator({ initialFieldId }: InputCostCalculatorProps) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const { setActiveTab: navigateToTab } = useUIStore();
  const { user } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<'costs' | 'summary' | 'projection' | 'tips'>('costs');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCost, setEditingCost] = useState<InputCost | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | undefined>(initialFieldId);
  const [categoryFilter, setCategoryFilter] = useState<InputCostCategory | ''>('');
  const [dateRange, setDateRange] = useState<'all' | '30d' | '90d' | '1y'>('all');

  // Calculate date filters
  const dateFilters = useMemo(() => {
    const now = new Date();
    switch (dateRange) {
      case '30d':
        return { startDate: new Date(now.setDate(now.getDate() - 30)).toISOString().split('T')[0] };
      case '90d':
        return { startDate: new Date(now.setDate(now.getDate() - 90)).toISOString().split('T')[0] };
      case '1y':
        return { startDate: new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0] };
      default:
        return {};
    }
  }, [dateRange]);

  // Queries
  const { data: fields } = useQuery({
    queryKey: ['fields'],
    queryFn: getFields,
  });

  const { data: costs, isLoading: costsLoading } = useInputCosts({
    fieldId: selectedFieldId,
    category: categoryFilter || undefined,
    ...dateFilters,
  });

  // Fetch manual expenses to show unified view
  const { data: expenses = [] } = useExpenses(user?.id);

  const { data: summary, isLoading: summaryLoading } = useInputCostSummary({
    fieldId: selectedFieldId,
    ...dateFilters,
  });

  const { data: projection } = useProfitProjection({
    fieldId: selectedFieldId,
  });

  const { data: recommendations } = useCostRecommendations(selectedFieldId);

  // Selected field info
  const selectedField = fields?.find(f => f.id === selectedFieldId);

  // Map expense categories to input cost categories
  const expenseCategoryToInputCost: Record<string, InputCostCategory> = {
    seeds: 'seed',
    fertilizer: 'fertilizer',
    pesticide: 'pesticide',
    labor: 'labor',
    fuel: 'transport',
    equipment: 'equipment',
    other: 'other',
  };

  // Convert manual expenses to input cost format for unified display
  // Only include expenses that are NOT already synced from input costs
  const manualExpensesAsInputCosts = useMemo(() => {
    return expenses
      .filter((e: Expense) => !e.sourceInputCostId && !e.description?.startsWith('[Input Cost]'))
      .filter((e: Expense) => {
        // Apply field filter
        if (selectedFieldId && e.fieldId !== selectedFieldId) return false;
        // Apply category filter
        if (categoryFilter) {
          const mappedCategory = expenseCategoryToInputCost[e.category];
          if (mappedCategory !== categoryFilter) return false;
        }
        // Apply date filter
        if (dateFilters.startDate && e.date < dateFilters.startDate) return false;
        return true;
      })
      .map((e: Expense) => ({
        id: `exp_${e.id}`,
        userId: user?.id || '',
        fieldId: e.fieldId,
        category: expenseCategoryToInputCost[e.category] || 'other',
        itemName: e.description,
        totalAmount: e.amount,
        purchaseDate: e.date,
        supplier: e.supplier,
        fieldName: e.fieldName,
        createdAt: e.date,
        // Mark as manual expense
        isManualExpense: true,
        originalExpenseId: e.id,
      }));
  }, [expenses, selectedFieldId, categoryFilter, dateFilters, user?.id]);

  // Combine input costs and manual expenses for unified view
  const unifiedCosts = useMemo(() => {
    const allCosts = [
      ...(costs || []).map(c => ({ ...c, isManualExpense: false })),
      ...manualExpensesAsInputCosts,
    ];
    // Sort by date descending
    return allCosts.sort((a, b) =>
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
  }, [costs, manualExpensesAsInputCosts]);

  // Calculate unified summary
  const unifiedSummary = useMemo(() => {
    const manualTotal = manualExpensesAsInputCosts.reduce((sum, e) => sum + e.totalAmount, 0);
    const inputCostTotal = summary?.totalCost || 0;
    return {
      ...summary,
      totalCost: inputCostTotal + manualTotal,
      manualExpensesTotal: manualTotal,
      inputCostsTotal: inputCostTotal,
      manualExpensesCount: manualExpensesAsInputCosts.length,
      inputCostsCount: costs?.length || 0,
    };
  }, [summary, manualExpensesAsInputCosts, costs]);

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {isSwahili ? 'Kikokotoo cha Gharama' : 'Input Cost Calculator'}
              </h1>
              <p className="text-emerald-100 text-sm">
                {isSwahili ? 'Fuatilia gharama na upate faida' : 'Track costs & maximize profit'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateToTab('expenses')}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              title={isSwahili ? 'Tazama gharama zote' : 'View all expenses'}
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">{isSwahili ? 'Gharama' : 'Expenses'}</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">{isSwahili ? 'Ongeza' : 'Add Cost'}</span>
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-100 text-xs mb-1">
              {isSwahili ? 'Jumla ya Gharama' : 'Total Costs'}
            </p>
            <p className="text-lg font-bold">
              {formatCurrency(unifiedSummary?.totalCost || 0)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-100 text-xs mb-1">
              {isSwahili ? 'Kwa Ekari' : 'Per Acre'}
            </p>
            <p className="text-lg font-bold">
              {formatCurrency(summary?.costPerAcre || 0)}
            </p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-emerald-100 text-xs mb-1">
              {isSwahili ? 'Vitu' : 'Items'}
            </p>
            <p className="text-lg font-bold">
              {unifiedCosts?.length || 0}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Unified View Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
              <Link2 className="text-blue-600 dark:text-blue-400 w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                {isSwahili ? 'Mtazamo wa Pamoja' : 'Unified View'}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">
                {isSwahili
                  ? `Inaonyesha ${unifiedSummary.inputCostsCount} gharama za pembejeo + ${unifiedSummary.manualExpensesCount} gharama za mwongozo`
                  : `Showing ${unifiedSummary.inputCostsCount} input costs + ${unifiedSummary.manualExpensesCount} manual expenses`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigateToTab('expenses')}
            className="text-xs text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 font-medium flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 rounded-lg"
          >
            <FileText className="w-3 h-3" />
            {isSwahili ? 'Tazama' : 'View'}
          </button>
        </div>
      </motion.div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <select
          value={selectedFieldId || ''}
          onChange={(e) => setSelectedFieldId(e.target.value || undefined)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">{isSwahili ? 'Mashamba Yote' : 'All Fields'}</option>
          {fields?.map((field) => (
            <option key={field.id} value={field.id}>{field.name}</option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as InputCostCategory | '')}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="">{isSwahili ? 'Aina Zote' : 'All Categories'}</option>
          {INPUT_COST_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.icon} {isSwahili ? cat.labelSw : cat.label}
            </option>
          ))}
        </select>

        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
          className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
        >
          <option value="all">{isSwahili ? 'Wakati Wote' : 'All Time'}</option>
          <option value="30d">{isSwahili ? 'Siku 30' : 'Last 30 Days'}</option>
          <option value="90d">{isSwahili ? 'Siku 90' : 'Last 90 Days'}</option>
          <option value="1y">{isSwahili ? 'Mwaka 1' : 'Last Year'}</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto">
        {[
          { id: 'costs', label: isSwahili ? 'Gharama' : 'Costs', icon: DollarSign },
          { id: 'summary', label: isSwahili ? 'Muhtasari' : 'Summary', icon: PieChart },
          { id: 'projection', label: isSwahili ? 'Matarajio' : 'Projection', icon: TrendingUp },
          { id: 'tips', label: isSwahili ? 'Vidokezo' : 'Tips', icon: Lightbulb },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-emerald-600 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'costs' && (
          <CostsTab
            costs={unifiedCosts}
            isLoading={costsLoading}
            isSwahili={isSwahili}
            onEdit={(cost) => setEditingCost(cost)}
            onAdd={() => setShowAddModal(true)}
            onNavigateToExpenses={() => navigateToTab('expenses')}
          />
        )}

        {activeTab === 'summary' && (
          <SummaryTab
            summary={unifiedSummary}
            isLoading={summaryLoading}
            isSwahili={isSwahili}
          />
        )}

        {activeTab === 'projection' && (
          <ProjectionTab
            projection={projection}
            selectedField={selectedField}
            summary={summary}
            isSwahili={isSwahili}
          />
        )}

        {activeTab === 'tips' && (
          <TipsTab
            recommendations={recommendations || []}
            isSwahili={isSwahili}
          />
        )}
      </AnimatePresence>

      {/* Add/Edit Modal */}
      {(showAddModal || editingCost) && (
        <AddEditCostModal
          cost={editingCost}
          fields={fields || []}
          isSwahili={isSwahili}
          onClose={() => {
            setShowAddModal(false);
            setEditingCost(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// COSTS TAB
// ============================================

// Extended type to include manual expenses converted to input cost format
interface UnifiedCostItem extends Partial<InputCost> {
  id: string;
  category: InputCostCategory;
  itemName: string;
  totalAmount: number;
  purchaseDate: string;
  fieldName?: string;
  isManualExpense?: boolean;
  originalExpenseId?: string;
}

interface CostsTabProps {
  costs: UnifiedCostItem[];
  isLoading: boolean;
  isSwahili: boolean;
  onEdit: (cost: InputCost) => void;
  onAdd: () => void;
  onNavigateToExpenses: () => void;
}

function CostsTab({ costs, isLoading, isSwahili, onEdit, onAdd, onNavigateToExpenses }: CostsTabProps) {
  const deleteMutation = useDeleteInputCost();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (costs.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <Calculator className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
          {isSwahili ? 'Hakuna gharama bado' : 'No costs recorded yet'}
        </h3>
        <p className="text-gray-500 text-sm mb-4">
          {isSwahili
            ? 'Anza kufuatilia gharama zako za kilimo'
            : 'Start tracking your farming input costs'}
        </p>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {isSwahili ? 'Ongeza Gharama' : 'Add First Cost'}
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {costs.map((cost) => {
        const catInfo = getCategoryInfo(cost.category);
        const isManual = cost.isManualExpense;
        return (
          <motion.div
            key={cost.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${isManual ? 'border-amber-200 dark:border-amber-800' : 'border-gray-100 dark:border-gray-700'}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${catInfo.color}20` }}
                >
                  {catInfo.icon}
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {cost.itemName}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs"
                      style={{ backgroundColor: `${catInfo.color}20`, color: catInfo.color }}
                    >
                      {isSwahili ? catInfo.labelSw : catInfo.label}
                    </span>
                    {isManual && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                        {isSwahili ? 'Gharama ya Mwongozo' : 'Manual Expense'}
                      </span>
                    )}
                    {cost.fieldName && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {cost.fieldName}
                      </span>
                    )}
                  </div>
                  {cost.quantity && cost.unit && (
                    <p className="text-xs text-gray-400 mt-1">
                      {cost.quantity} {cost.unit}
                      {cost.unitPrice && ` @ ${formatCurrency(cost.unitPrice)}`}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(cost.totalAmount)}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(cost.purchaseDate).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  {isManual ? (
                    <button
                      onClick={onNavigateToExpenses}
                      className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                      title={isSwahili ? 'Hariri katika Gharama' : 'Edit in Expenses'}
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => onEdit(cost as InputCost)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(isSwahili ? 'Una uhakika?' : 'Are you sure?')) {
                            deleteMutation.mutate(cost.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ============================================
// SUMMARY TAB
// ============================================

interface SummaryTabProps {
  summary?: {
    totalCost: number;
    costPerAcre?: number;
    byCategory?: { category: InputCostCategory; total: number; percentage: number; itemCount: number }[];
    byMonth?: { month: string; total: number }[];
    topExpenses?: { itemName: string; category: InputCostCategory; totalAmount: number }[];
    // Unified summary fields
    manualExpensesTotal?: number;
    inputCostsTotal?: number;
    manualExpensesCount?: number;
    inputCostsCount?: number;
  };
  isLoading: boolean;
  isSwahili: boolean;
}

function SummaryTab({ summary, isLoading, isSwahili }: SummaryTabProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!summary || summary.totalCost === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {isSwahili ? 'Hakuna data ya kuonyesha' : 'No data to display'}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Category Breakdown */}
      {/* Cost Breakdown by Category */}
      {summary.byCategory && summary.byCategory.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-500" />
            {isSwahili ? 'Mgawanyo wa Gharama' : 'Cost Breakdown'}
          </h3>
          <div className="space-y-3">
            {summary.byCategory.map((cat) => {
              const catInfo = getCategoryInfo(cat.category);
              return (
                <div key={cat.category}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span>{catInfo.icon}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isSwahili ? catInfo.labelSw : catInfo.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({cat.percentage.toFixed(1)}%)
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: catInfo.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Expenses */}
      {summary.topExpenses && summary.topExpenses.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-500" />
            {isSwahili ? 'Gharama Kuu' : 'Top Expenses'}
          </h3>
          <div className="space-y-2">
            {summary.topExpenses.slice(0, 5).map((expense, index) => {
              const catInfo = getCategoryInfo(expense.category);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm w-5">#{index + 1}</span>
                    <span>{catInfo.icon}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {expense.itemName}
                    </span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(expense.totalAmount)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {summary.byMonth && summary.byMonth.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" />
            {isSwahili ? 'Mwenendo wa Kila Mwezi' : 'Monthly Trend'}
          </h3>
          <div className="flex items-end gap-2 h-32">
            {summary.byMonth.slice(-6).map((month, index) => {
              const maxTotal = Math.max(...(summary.byMonth || []).map(m => m.total));
              const height = maxTotal > 0 ? (month.total / maxTotal) * 100 : 0;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-emerald-500 rounded-t-lg transition-all duration-300"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                  />
                  <span className="text-xs text-gray-500">
                    {month.month.split('-')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// PROJECTION TAB
// ============================================

interface ProjectionTabProps {
  projection?: {
    cropType: string;
    areaPlanted: number;
    totalInputCosts: number;
    costBreakdown?: { category: string; amount: number }[];
    estimatedYield: number;
    yieldUnit: string;
    marketPrice: number;
    estimatedRevenue: number;
    estimatedProfit: number;
    profitMargin: number;
    roi: number;
    breakEvenYield: number;
    riskLevel: 'low' | 'medium' | 'high';
    riskFactors: string[];
  };
  selectedField?: Field;
  summary?: {
    totalCost: number;
    costPerAcre: number;
    byCategory: { category: string; total: number; percentage: number; itemCount: number }[];
    byMonth: { month: string; total: number }[];
    topExpenses: { itemName: string; category: string; totalAmount: number }[];
  };
  isSwahili: boolean;
}

function ProjectionTab({ projection, selectedField, summary, isSwahili }: ProjectionTabProps) {
  const [customYield, setCustomYield] = useState<string>('');
  const [customPrice, setCustomPrice] = useState<string>('');
  const [targetMargin, setTargetMargin] = useState<string>('30');
  const [showBreakdown, setShowBreakdown] = useState(false);

  // Calculate suggested retail prices based on costs and desired margins
  const retailPricing = useMemo(() => {
    if (!projection || projection.totalInputCosts === 0 || projection.estimatedYield === 0) {
      return null;
    }

    const costPerUnit = projection.totalInputCosts / projection.estimatedYield;
    const margin = parseFloat(targetMargin) || 30;

    // Calculate prices at different margin levels
    const calculatePrice = (marginPercent: number) => {
      return costPerUnit / (1 - marginPercent / 100);
    };

    return {
      costPerUnit,
      suggestedRetail: calculatePrice(margin),
      breakEvenPrice: costPerUnit,
      lowMargin: calculatePrice(15),
      mediumMargin: calculatePrice(30),
      highMargin: calculatePrice(50),
      premiumMargin: calculatePrice(75),
    };
  }, [projection, targetMargin]);

  if (!projection) {
    return (
      <div className="text-center py-12">
        <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">
          {isSwahili
            ? 'Chagua shamba ili kuona matarajio'
            : 'Select a field to see profit projections'}
        </p>
      </div>
    );
  }

  // Get field status display
  const getStatusDisplay = (status: string) => {
    const statuses: Record<string, { en: string; sw: string; color: string }> = {
      planted: { en: 'Recently Planted', sw: 'Imepandwa Hivi Karibuni', color: 'bg-blue-100 text-blue-700' },
      growing: { en: 'Growing', sw: 'Inakua', color: 'bg-green-100 text-green-700' },
      ready: { en: 'Ready to Harvest', sw: 'Tayari Kuvuna', color: 'bg-amber-100 text-amber-700' },
      harvested: { en: 'Harvested', sw: 'Imevunwa', color: 'bg-gray-100 text-gray-700' },
    };
    return statuses[status] || statuses.growing;
  };

  const riskColors = {
    low: 'text-green-600 bg-green-100',
    medium: 'text-yellow-600 bg-yellow-100',
    high: 'text-red-600 bg-red-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      {/* Field Info Card */}
      {selectedField && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Sprout className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">
                  {selectedField.name}
                </h3>
                <p className="text-green-700 dark:text-green-400 font-medium">
                  {selectedField.cropType}
                </p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusDisplay(selectedField.status).color}`}>
              {isSwahili ? getStatusDisplay(selectedField.status).sw : getStatusDisplay(selectedField.status).en}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <Ruler className="w-3 h-3" />
                {isSwahili ? 'Ukubwa' : 'Size'}
              </div>
              <p className="font-bold text-gray-900 dark:text-white">
                {selectedField.area} {isSwahili ? 'ekari' : 'acres'}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <Calendar className="w-3 h-3" />
                {isSwahili ? 'Ilipandwa' : 'Planted'}
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">
                {new Date(selectedField.plantingDate).toLocaleDateString()}
              </p>
            </div>
            <div className="bg-white/60 dark:bg-gray-800/60 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 text-gray-500 text-xs mb-1">
                <Target className="w-3 h-3" />
                {isSwahili ? 'Mavuno' : 'Harvest'}
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-sm">
                {new Date(selectedField.expectedHarvest).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Profit Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          {isSwahili ? 'Matarajio ya Faida' : 'Profit Projection'}
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">
              {isSwahili ? 'Jumla ya Gharama' : 'Total Costs'}
            </p>
            <p className="text-lg font-bold text-red-600">
              -{formatCurrency(projection.totalInputCosts)}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">
              {isSwahili ? 'Mapato Yanayotarajiwa' : 'Expected Revenue'}
            </p>
            <p className="text-lg font-bold text-green-600">
              +{formatCurrency(projection.estimatedRevenue)}
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white">
          <p className="text-sm text-emerald-100 mb-1">
            {isSwahili ? 'Faida Inayotarajiwa' : 'Expected Profit'}
          </p>
          <p className="text-3xl font-bold">
            {formatCurrency(projection.estimatedProfit)}
          </p>
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span>ROI: {projection.roi.toFixed(1)}%</span>
            <span>Margin: {projection.profitMargin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* How This Was Calculated - Expandable Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900 dark:text-white">
              {isSwahili ? 'Jinsi Ilivyohesabiwa' : 'How This Was Calculated'}
            </span>
          </div>
          {showBreakdown ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        <AnimatePresence>
          {showBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-t border-gray-100 dark:border-gray-700"
            >
              <div className="p-4 space-y-4">
                {/* Inputs Used */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                    {isSwahili ? 'Vigezo Vilivyotumika' : 'Inputs Used'}
                  </h5>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500">{isSwahili ? 'Eneo' : 'Area'}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {projection.areaPlanted} {isSwahili ? 'ekari' : 'acres'}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500">{isSwahili ? 'Aina ya Mazao' : 'Crop Type'}</p>
                      <p className="font-semibold text-gray-900 dark:text-white capitalize">
                        {projection.cropType}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500">{isSwahili ? 'Mavuno Yanayotarajiwa' : 'Est. Yield'}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {projection.estimatedYield.toLocaleString()} {projection.yieldUnit}
                      </p>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2.5">
                      <p className="text-xs text-gray-500">{isSwahili ? 'Bei ya Soko' : 'Market Price'}</p>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(projection.marketPrice)}/{projection.yieldUnit}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cost Breakdown */}
                {summary && summary.byCategory.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                      {isSwahili ? 'Mgawanyo wa Gharama' : 'Cost Breakdown'}
                    </h5>
                    <div className="space-y-2">
                      {summary.byCategory.map((cat) => {
                        const catInfo = getCategoryInfo(cat.category as InputCostCategory);
                        return (
                          <div key={cat.category} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{catInfo.icon}</span>
                              <span className="text-sm text-gray-700 dark:text-gray-300">
                                {isSwahili ? catInfo.labelSw : catInfo.label}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {formatCurrency(cat.total)}
                              </span>
                              <span className="text-xs text-gray-400 ml-1">
                                ({cat.percentage.toFixed(0)}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="border-t border-gray-200 dark:border-gray-600 pt-2 mt-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {isSwahili ? 'Jumla' : 'Total'}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatCurrency(summary.totalCost)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Calculation Formulas */}
                <div>
                  <h5 className="text-xs font-medium text-gray-500 uppercase mb-2">
                    {isSwahili ? 'Mahesabu' : 'Calculations'}
                  </h5>
                  <div className="space-y-2 text-sm">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-blue-700 dark:text-blue-300 font-medium mb-1">
                        {isSwahili ? 'Mapato' : 'Revenue'}
                      </p>
                      <p className="text-blue-600 dark:text-blue-400 font-mono text-xs">
                        {projection.estimatedYield.toLocaleString()} {projection.yieldUnit} × {formatCurrency(projection.marketPrice)} = {formatCurrency(projection.estimatedRevenue)}
                      </p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <p className="text-green-700 dark:text-green-300 font-medium mb-1">
                        {isSwahili ? 'Faida' : 'Profit'}
                      </p>
                      <p className="text-green-600 dark:text-green-400 font-mono text-xs">
                        {formatCurrency(projection.estimatedRevenue)} - {formatCurrency(projection.totalInputCosts)} = {formatCurrency(projection.estimatedProfit)}
                      </p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                      <p className="text-purple-700 dark:text-purple-300 font-medium mb-1">
                        {isSwahili ? 'Mavuno ya Usawa' : 'Break-even Yield'}
                      </p>
                      <p className="text-purple-600 dark:text-purple-400 font-mono text-xs">
                        {formatCurrency(projection.totalInputCosts)} ÷ {formatCurrency(projection.marketPrice)} = {projection.breakEvenYield.toLocaleString()} {projection.yieldUnit}
                      </p>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                      <p className="text-amber-700 dark:text-amber-300 font-medium mb-1">
                        ROI ({isSwahili ? 'Faida ya Uwekezaji' : 'Return on Investment'})
                      </p>
                      <p className="text-amber-600 dark:text-amber-400 font-mono text-xs">
                        ({formatCurrency(projection.estimatedProfit)} ÷ {formatCurrency(projection.totalInputCosts)}) × 100 = {projection.roi.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* Per Acre Stats */}
                {summary && summary.costPerAcre > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">
                      {isSwahili ? 'Gharama kwa Ekari' : 'Cost per Acre'}
                    </p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      {formatCurrency(summary.costPerAcre)}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">
            {isSwahili ? 'Mavuno ya Usawa' : 'Break-even Yield'}
          </p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {projection.breakEvenYield.toLocaleString()} {projection.yieldUnit}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-500 mb-1">
            {isSwahili ? 'Kiwango cha Hatari' : 'Risk Level'}
          </p>
          <span className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${riskColors[projection.riskLevel]}`}>
            {projection.riskLevel === 'low' && (isSwahili ? 'Chini' : 'Low')}
            {projection.riskLevel === 'medium' && (isSwahili ? 'Wastani' : 'Medium')}
            {projection.riskLevel === 'high' && (isSwahili ? 'Juu' : 'High')}
          </span>
        </div>
      </div>

      {/* Risk Factors */}
      {projection.riskFactors.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-xl p-4 border border-yellow-200 dark:border-yellow-800">
          <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {isSwahili ? 'Mambo ya Kuzingatia' : 'Risk Factors'}
          </h4>
          <ul className="space-y-1">
            {projection.riskFactors.map((factor, index) => (
              <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                <span className="text-yellow-500">•</span>
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Scenario Calculator */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          {isSwahili ? 'Hesabu Hali Tofauti' : 'Scenario Calculator'}
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {isSwahili ? 'Mavuno (kg)' : 'Yield (kg)'}
            </label>
            <input
              type="number"
              value={customYield}
              onChange={(e) => setCustomYield(e.target.value)}
              placeholder={projection.estimatedYield.toString()}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {isSwahili ? 'Bei kwa kg' : 'Price per kg'}
            </label>
            <input
              type="number"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              placeholder={projection.marketPrice.toString()}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg text-sm"
            />
          </div>
        </div>
        {(customYield || customPrice) && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
            <p className="text-sm text-emerald-700 dark:text-emerald-300">
              {isSwahili ? 'Faida Mpya: ' : 'New Profit: '}
              <span className="font-bold">
                {formatCurrency(
                  ((parseFloat(customYield) || projection.estimatedYield) *
                    (parseFloat(customPrice) || projection.marketPrice)) -
                    projection.totalInputCosts
                )}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Suggested Retail Price Calculator */}
      {retailPricing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-500" />
            {isSwahili ? 'Bei ya Rejareja Inayopendekezwa' : 'Suggested Retail Price'}
          </h4>

          {/* Cost per unit info */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isSwahili ? 'Gharama kwa' : 'Cost per'} {projection.yieldUnit}:
              </span>
              <span className="font-bold text-gray-900 dark:text-white">
                {formatCurrency(retailPricing.costPerUnit)}
              </span>
            </div>
          </div>

          {/* Target Margin Slider */}
          <div className="mb-4">
            <label className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>{isSwahili ? 'Faida Inayolengwa' : 'Target Profit Margin'}</span>
              <span className="font-semibold text-emerald-600">{targetMargin}%</span>
            </label>
            <input
              type="range"
              min="5"
              max="100"
              value={targetMargin}
              onChange={(e) => setTargetMargin(e.target.value)}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>5%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Suggested Price Display */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white mb-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingCart className="w-4 h-4 text-emerald-100" />
              <span className="text-sm text-emerald-100">
                {isSwahili ? 'Uza kwa' : 'Sell at'}:
              </span>
            </div>
            <p className="text-3xl font-bold">
              {formatCurrency(retailPricing.suggestedRetail)}
              <span className="text-lg font-normal text-emerald-100">/{projection.yieldUnit}</span>
            </p>
            <p className="text-sm text-emerald-100 mt-1">
              {isSwahili ? 'Faida' : 'Profit'}: {formatCurrency(retailPricing.suggestedRetail - retailPricing.costPerUnit)}/{projection.yieldUnit}
            </p>
          </div>

          {/* Price Tiers */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase mb-2">
              {isSwahili ? 'Viwango vya Bei' : 'Price Tiers'}
            </p>

            {/* Break-even */}
            <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {isSwahili ? 'Sawa sawa (0%)' : 'Break-even (0%)'}
                </span>
              </div>
              <span className="font-medium text-red-600">
                {formatCurrency(retailPricing.breakEvenPrice)}
              </span>
            </div>

            {/* Low Margin */}
            <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {isSwahili ? 'Faida Ndogo (15%)' : 'Low Margin (15%)'}
                </span>
              </div>
              <span className="font-medium text-yellow-600">
                {formatCurrency(retailPricing.lowMargin)}
              </span>
            </div>

            {/* Medium Margin */}
            <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {isSwahili ? 'Faida ya Kati (30%)' : 'Medium Margin (30%)'}
                </span>
              </div>
              <span className="font-medium text-green-600">
                {formatCurrency(retailPricing.mediumMargin)}
              </span>
            </div>

            {/* High Margin */}
            <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {isSwahili ? 'Faida Kubwa (50%)' : 'High Margin (50%)'}
                </span>
              </div>
              <span className="font-medium text-blue-600">
                {formatCurrency(retailPricing.highMargin)}
              </span>
            </div>

            {/* Premium */}
            <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {isSwahili ? 'Bei ya Juu (75%)' : 'Premium (75%)'}
                </span>
              </div>
              <span className="font-medium text-purple-600">
                {formatCurrency(retailPricing.premiumMargin)}
              </span>
            </div>
          </div>

          {/* Market Price Comparison */}
          {projection.marketPrice > 0 && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">
                {isSwahili ? 'Linganisha na Bei ya Soko' : 'Compare with Market Price'}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {isSwahili ? 'Bei ya Soko Sasa' : 'Current Market Price'}:
                </span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {formatCurrency(projection.marketPrice)}/{projection.yieldUnit}
                </span>
              </div>
              {projection.marketPrice < retailPricing.breakEvenPrice ? (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {isSwahili
                    ? 'Bei ya soko ni chini ya gharama yako!'
                    : 'Market price is below your cost!'}
                </p>
              ) : projection.marketPrice < retailPricing.suggestedRetail ? (
                <p className="text-xs text-yellow-600 mt-2">
                  {isSwahili
                    ? `Bei ya soko ni chini ya bei yako inayopendekezwa kwa ${((1 - projection.marketPrice / retailPricing.suggestedRetail) * 100).toFixed(0)}%`
                    : `Market price is ${((1 - projection.marketPrice / retailPricing.suggestedRetail) * 100).toFixed(0)}% below your suggested price`}
                </p>
              ) : (
                <p className="text-xs text-green-600 mt-2">
                  {isSwahili
                    ? 'Bei ya soko inakuruhusu kupata faida nzuri!'
                    : 'Market price allows for good profit!'}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================
// TIPS TAB
// ============================================

interface TipsTabProps {
  recommendations: {
    type: 'saving' | 'warning' | 'tip';
    message: string;
    messageSw?: string;
    category?: InputCostCategory;
    potentialSaving?: number;
  }[];
  isSwahili: boolean;
}

function TipsTab({ recommendations, isSwahili }: TipsTabProps) {
  const typeConfig = {
    saving: {
      icon: DollarSign,
      color: 'text-green-600 bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-200 dark:border-green-800',
    },
    warning: {
      icon: AlertTriangle,
      color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
    },
    tip: {
      icon: Lightbulb,
      color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-200 dark:border-blue-800',
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {recommendations.map((rec, index) => {
        const config = typeConfig[rec.type];
        const Icon = config.icon;
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 border ${config.borderColor}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${config.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-gray-700 dark:text-gray-300">
                  {isSwahili && rec.messageSw ? rec.messageSw : rec.message}
                </p>
                {rec.potentialSaving && (
                  <p className="text-sm text-green-600 font-medium mt-1">
                    {isSwahili ? 'Akiba Inayowezekana: ' : 'Potential Saving: '}
                    {formatCurrency(rec.potentialSaving)}
                  </p>
                )}
                {rec.category && (
                  <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400">
                    {getCategoryInfo(rec.category).icon}
                    {isSwahili
                      ? getCategoryInfo(rec.category).labelSw
                      : getCategoryInfo(rec.category).label}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ============================================
// ADD/EDIT MODAL
// ============================================

interface AddEditCostModalProps {
  cost: InputCost | null;
  fields: Field[];
  isSwahili: boolean;
  onClose: () => void;
}

function AddEditCostModal({ cost, fields, isSwahili, onClose }: AddEditCostModalProps) {
  const addMutation = useAddInputCost();
  const updateMutation = useUpdateInputCost();
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    category: cost?.category || 'seed' as InputCostCategory,
    itemName: cost?.itemName || '',
    totalAmount: cost?.totalAmount?.toString() || '',
    fieldId: cost?.fieldId || '',
    quantity: cost?.quantity?.toString() || '',
    unit: cost?.unit || '',
    unitPrice: cost?.unitPrice?.toString() || '',
    purchaseDate: cost?.purchaseDate || new Date().toISOString().split('T')[0],
    supplier: cost?.supplier || '',
    notes: cost?.notes || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.itemName.trim()) {
      setError(isSwahili ? 'Tafadhali ingiza jina la bidhaa' : 'Please enter an item name');
      return;
    }
    if (!formData.totalAmount || parseFloat(formData.totalAmount) <= 0) {
      setError(isSwahili ? 'Tafadhali ingiza kiasi halali' : 'Please enter a valid amount');
      return;
    }

    const payload = {
      category: formData.category,
      itemName: formData.itemName.trim(),
      totalAmount: parseFloat(formData.totalAmount) || 0,
      fieldId: formData.fieldId || undefined,
      quantity: formData.quantity ? parseFloat(formData.quantity) : undefined,
      unit: formData.unit || undefined,
      unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
      purchaseDate: formData.purchaseDate,
      supplier: formData.supplier || undefined,
      notes: formData.notes || undefined,
    };

    try {
      if (cost) {
        await updateMutation.mutateAsync({ costId: cost.id, ...payload });
      } else {
        await addMutation.mutateAsync(payload);
      }
      onClose();
    } catch (err) {
      console.error('Failed to save cost:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(isSwahili
        ? `Imeshindwa kuhifadhi: ${errorMessage}`
        : `Failed to save: ${errorMessage}`
      );
    }
  };

  // Auto-calculate total when quantity and unit price change
  React.useEffect(() => {
    if (formData.quantity && formData.unitPrice) {
      const total = parseFloat(formData.quantity) * parseFloat(formData.unitPrice);
      if (!isNaN(total)) {
        setFormData(prev => ({ ...prev, totalAmount: total.toString() }));
      }
    }
  }, [formData.quantity, formData.unitPrice]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {cost
              ? (isSwahili ? 'Hariri Gharama' : 'Edit Cost')
              : (isSwahili ? 'Ongeza Gharama' : 'Add Input Cost')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isSwahili ? 'Aina' : 'Category'} *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {INPUT_COST_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    formData.category === cat.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-emerald-300'
                  }`}
                >
                  <span className="text-xl block mb-1">{cat.icon}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {isSwahili ? cat.labelSw : cat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Jina la Bidhaa' : 'Item Name'} *
            </label>
            <input
              type="text"
              value={formData.itemName}
              onChange={(e) => setFormData(prev => ({ ...prev, itemName: e.target.value }))}
              placeholder={isSwahili ? 'Mfano: DAP 50kg' : 'e.g., DAP Fertilizer 50kg'}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg"
              required
            />
          </div>

          {/* Field Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Shamba' : 'Field'} ({isSwahili ? 'Hiari' : 'Optional'})
            </label>
            <select
              value={formData.fieldId}
              onChange={(e) => setFormData(prev => ({ ...prev, fieldId: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <option value="">{isSwahili ? 'Chagua shamba' : 'Select field'}</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>{field.name}</option>
              ))}
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
                step="0.01"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="e.g., 5"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isSwahili ? 'Kipimo' : 'Unit'}
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg"
              >
                <option value="">{isSwahili ? 'Chagua' : 'Select'}</option>
                {COMMON_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>{unit.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Unit Price and Total */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isSwahili ? 'Bei kwa Kipimo' : 'Unit Price'}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.unitPrice}
                onChange={(e) => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
                placeholder="e.g., 3500"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isSwahili ? 'Jumla' : 'Total Amount'} *
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.totalAmount}
                onChange={(e) => setFormData(prev => ({ ...prev, totalAmount: e.target.value }))}
                placeholder="e.g., 17500"
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg font-semibold"
                required
              />
            </div>
          </div>

          {/* Purchase Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Tarehe ya Ununuzi' : 'Purchase Date'}
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg"
            />
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Muuzaji' : 'Supplier'}
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
              placeholder={isSwahili ? 'Jina la duka au muuzaji' : 'Store or supplier name'}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isSwahili ? 'Maelezo' : 'Notes'}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder={isSwahili ? 'Maelezo ya ziada...' : 'Additional notes...'}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={addMutation.isPending || updateMutation.isPending}
            className="w-full py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {(addMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
            {cost
              ? (isSwahili ? 'Hifadhi Mabadiliko' : 'Save Changes')
              : (isSwahili ? 'Ongeza Gharama' : 'Add Cost')}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
