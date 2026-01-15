import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, DollarSign, Calendar, Tag, X, TrendingUp, ChevronDown, Download, Calculator, Link2, MapPin, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Expense, Field } from '../types';
import ConvertedPrice from './ConvertedPrice';
import { useAwardMicroReward } from '../hooks/useMicroWins';
import { useUIStore } from '../store/uiStore';

interface ExpenseTrackerProps {
  expenses: Expense[];
  fields: Field[];
  userId?: string;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onUpdateExpense: (id: string, expense: Partial<Expense>) => void;
  onDeleteExpense: (id: string) => void;
}

export default function ExpenseTracker({ expenses, fields, userId, onAddExpense, onUpdateExpense, onDeleteExpense }: ExpenseTrackerProps) {
  const { t } = useTranslation();
  const { setActiveTab } = useUIStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const awardMicroReward = useAwardMicroReward();
  const [formData, setFormData] = useState<Omit<Expense, 'id'> & { fieldIds: string[] }>({
    date: '',
    category: 'other',
    description: '',
    amount: 0,
    supplier: '',
    fieldId: '',
    fieldName: '',
    fieldIds: [],
  });
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);

  // Filter state
  const [selectedFieldFilter, setSelectedFieldFilter] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<Expense['category'] | ''>('');

  const handleOpenModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      const existingFieldIds = expense.fieldId ? [expense.fieldId] : [];
      setFormData({
        date: expense.date,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        supplier: expense.supplier || '',
        fieldId: expense.fieldId || '',
        fieldName: expense.fieldName || '',
        fieldIds: existingFieldIds,
      });
    } else {
      setEditingExpense(null);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        category: 'other',
        description: '',
        amount: 0,
        supplier: '',
        fieldId: '',
        fieldName: '',
        fieldIds: [],
      });
    }
    setIsModalOpen(true);
    setShowFieldDropdown(false);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedFields = fields.filter(f => formData.fieldIds.includes(f.id));
    const expenseData: any = {
      date: formData.date,
      category: formData.category,
      description: formData.description,
      amount: formData.amount,
      supplier: formData.supplier,
    };

    // Include fieldId/fieldName for backward compatibility (use first selected field)
    if (selectedFields.length > 0) {
      expenseData.fieldId = selectedFields[0].id;
      // Show "All Fields" when all fields are selected, otherwise list names
      expenseData.fieldName = selectedFields.length === fields.length
        ? t('common.allFields', 'All Fields')
        : selectedFields.map(f => f.name).join(', ');
    }

    if (editingExpense) {
      onUpdateExpense(editingExpense.id, expenseData);
    } else {
      onAddExpense(expenseData);
      // Award micro-reward for logging expense
      if (userId) {
        awardMicroReward.mutate({
          userId,
          actionType: 'expense_logged',
        });
      }
    }
    handleCloseModal();
  };

  const toggleFieldSelection = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      fieldIds: prev.fieldIds.includes(fieldId)
        ? prev.fieldIds.filter(id => id !== fieldId)
        : [...prev.fieldIds, fieldId]
    }));
  };

  const selectAllFields = () => {
    setFormData(prev => ({
      ...prev,
      fieldIds: fields.map(f => f.id)
    }));
  };

  const clearAllFields = () => {
    setFormData(prev => ({
      ...prev,
      fieldIds: []
    }));
  };

  const getCategoryColor = (category: Expense['category']) => {
    switch (category) {
      case 'seeds':
        return 'bg-green-100 text-green-800';
      case 'fertilizer':
        return 'bg-blue-100 text-blue-800';
      case 'labor':
        return 'bg-purple-100 text-purple-800';
      case 'equipment':
        return 'bg-orange-100 text-orange-800';
      case 'fuel':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = () => {
    return <Tag size={16} />;
  };

  // Filter expenses based on selected filters
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      // Field filter
      if (selectedFieldFilter && expense.fieldId !== selectedFieldFilter) {
        return false;
      }
      // Category filter
      if (selectedCategoryFilter && expense.category !== selectedCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [expenses, selectedFieldFilter, selectedCategoryFilter]);

  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const categoryTotals = filteredExpenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const sortedExpenses = [...filteredExpenses].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Check if any filters are active
  const hasActiveFilters = selectedFieldFilter || selectedCategoryFilter;

  // Clear all filters
  const clearFilters = () => {
    setSelectedFieldFilter('');
    setSelectedCategoryFilter('');
  };

  const exportToCSV = () => {
    if (expenses.length === 0) return;

    const headers = ['Date', 'Category', 'Description', 'Supplier', 'Field', 'Amount'];
    const csvRows = [
      headers.join(','),
      ...sortedExpenses.map(expense => [
        format(new Date(expense.date), 'yyyy-MM-dd'),
        expense.category,
        `"${expense.description.replace(/"/g, '""')}"`,
        `"${(expense.supplier || '').replace(/"/g, '""')}"`,
        `"${(expense.fieldName || '').replace(/"/g, '""')}"`,
        expense.amount.toFixed(2)
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `expenses_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Check if expense is from input cost calculator
  const isFromInputCost = (expense: Expense): boolean => {
    return !!(expense.sourceInputCostId || expense.sourceType === 'input_cost' || expense.description?.startsWith('[Input Cost]'));
  };

  // Count expenses by source (from filtered list)
  const manualExpenses = filteredExpenses.filter(e => !isFromInputCost(e));
  const inputCostExpenses = filteredExpenses.filter(e => isFromInputCost(e));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('expenses.trackerTitle', 'Expense Tracker')}</h1>
          <p className="text-gray-600 mt-1">{t('expenses.monitorDesc', 'Monitor and manage farm expenses')}</p>
        </div>
        <div className="flex items-center gap-2">
          {expenses.length > 0 && (
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Download size={20} />
              {t('common.exportCSV', 'Export CSV')}
            </button>
          )}
          <button
            onClick={() => setActiveTab('costs')}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
            title={t('expenses.openCostCalculator', 'Open Input Cost Calculator for detailed tracking')}
          >
            <Calculator size={20} />
            {t('expenses.inputCosts', 'Input Costs')}
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
          >
            <Plus size={20} />
            {t('expenses.addExpense', 'Add Expense')}
          </button>
        </div>
      </div>

      {/* Data Source Info Banner */}
      {inputCostExpenses.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Link2 className="text-emerald-600" size={20} />
              </div>
              <div>
                <p className="font-medium text-emerald-800">
                  {t('expenses.unifiedView', 'Unified Expense View')}
                </p>
                <p className="text-sm text-emerald-600">
                  {t('expenses.showingBothSources', 'Showing {{manual}} manual + {{inputCost}} from Input Cost Calculator', {
                    manual: manualExpenses.length,
                    inputCost: inputCostExpenses.length
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('costs')}
              className="text-sm text-emerald-700 hover:text-emerald-900 font-medium flex items-center gap-1"
            >
              {t('expenses.viewInCalculator', 'View in Calculator')}
              <Calculator size={16} />
            </button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Filter size={18} />
            <span className="text-sm font-medium">{t('common.filters', 'Filters')}:</span>
          </div>

          {/* Field Filter */}
          <div className="relative">
            <select
              value={selectedFieldFilter}
              onChange={(e) => setSelectedFieldFilter(e.target.value)}
              className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="">{t('expenses.allFields', 'All Fields')}</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
            <MapPin size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value as Expense['category'] | '')}
              className="pl-8 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="">{t('expenses.allCategories', 'All Categories')}</option>
              <option value="seeds">{t('expenses.seeds', 'Seeds')}</option>
              <option value="fertilizer">{t('expenses.fertilizer', 'Fertilizer')}</option>
              <option value="pesticide">{t('expenses.pesticide', 'Pesticide')}</option>
              <option value="labor">{t('expenses.labor', 'Labor')}</option>
              <option value="equipment">{t('expenses.equipment', 'Equipment')}</option>
              <option value="fuel">{t('expenses.fuel', 'Fuel')}</option>
              <option value="other">{t('expenses.other', 'Other')}</option>
            </select>
            <Tag size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={16} />
              {t('common.clearFilters', 'Clear')}
            </button>
          )}

          {/* Filter Summary */}
          {hasActiveFilters && (
            <div className="ml-auto text-sm text-gray-500">
              {t('expenses.showingCount', 'Showing {{count}} of {{total}}', {
                count: filteredExpenses.length,
                total: expenses.length
              })}
            </div>
          )}
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('expenses.totalExpenses', 'Total Expenses')}</p>
              <p className="text-3xl font-bold text-gray-900"><ConvertedPrice amount={totalExpenses} /></p>
              <p className="text-xs text-gray-500 mt-1">{t('expenses.allTime', 'All time')}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <DollarSign className="text-red-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('expenses.categories', 'Categories')}</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(categoryTotals).length}</p>
              <p className="text-xs text-gray-500 mt-1">Active categories</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Tag className="text-blue-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('expenses.transactions', 'Transactions')}</p>
              <p className="text-3xl font-bold text-gray-900">{expenses.length}</p>
              <p className="text-xs text-gray-500 mt-1">Total recorded</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('expenses.expensesByCategory', 'Expenses by Category')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(categoryTotals).map(([category, amount]) => (
              <div key={category} className="text-center">
                <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg mb-2 ${getCategoryColor(category as Expense['category'])}`}>
                  {getCategoryIcon()}
                  <span className="text-xs font-medium capitalize">{t(`expenses.${category}`, category)}</span>
                </div>
                <p className="text-lg font-bold text-gray-900"><ConvertedPrice amount={amount} /></p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Expenses List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.date', 'Date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.category', 'Category')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.description', 'Description')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.supplier', 'Supplier')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.field', 'Field')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.amount', 'Amount')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('expenses.actions', 'Actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedExpenses.map((expense, index) => {
                const fromInputCost = isFromInputCost(expense);
                return (
                  <motion.tr
                    key={expense.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`hover:bg-gray-50 ${fromInputCost ? 'bg-emerald-50/30' : ''}`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-900">
                        <Calendar size={16} className="text-gray-400" />
                        {format(new Date(expense.date), 'MMM d, yyyy')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                          {getCategoryIcon()}
                          <span className="capitalize">{t(`expenses.${expense.category}`, expense.category)}</span>
                        </span>
                        {fromInputCost && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                            <Calculator size={10} />
                            {t('expenses.fromCostCalc', 'Input Cost')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {expense.description?.replace('[Input Cost] ', '')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{expense.supplier || t('expenses.none', '-')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{expense.fieldName || t('expenses.none', '-')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900"><ConvertedPrice amount={expense.amount} /></div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        {fromInputCost ? (
                          <button
                            onClick={() => setActiveTab('costs')}
                            className="p-1 text-emerald-600 hover:text-emerald-800 transition-colors"
                            title={t('expenses.editInCalculator', 'Edit in Input Cost Calculator')}
                          >
                            <Calculator size={16} />
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleOpenModal(expense)}
                              className="p-1 text-gray-600 hover:text-primary-600 transition-colors"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => onDeleteExpense(expense.id)}
                              className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {expenses.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">{t('expenses.noExpensesYet', 'No expenses recorded yet. Add your first expense to get started!')}</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingExpense ? t('expenses.editExpense', 'Edit Expense') : t('expenses.addNewExpense', 'Add New Expense')}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('expenses.date', 'Date')}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('expenses.category', 'Category')}
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as Expense['category'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="seeds">{t('expenses.seeds', 'Seeds')}</option>
                      <option value="fertilizer">{t('expenses.fertilizer', 'Fertilizer')}</option>
                      <option value="labor">{t('expenses.labor', 'Labor')}</option>
                      <option value="equipment">{t('expenses.equipment', 'Equipment')}</option>
                      <option value="fuel">{t('expenses.fuel', 'Fuel')}</option>
                      <option value="other">{t('expenses.other', 'Other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('expenses.description', 'Description')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Hybrid maize seeds"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('expenses.supplier', 'Supplier')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="e.g., Farm Supplies Co."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('expenses.amountLabel', 'Amount')} ($)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('expenses.fieldsOptional', 'Fields (optional)')}
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowFieldDropdown(!showFieldDropdown)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white text-left flex items-center justify-between"
                    >
                      <span className={formData.fieldIds.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
                        {formData.fieldIds.length === 0
                          ? t('expenses.selectFields', 'Select fields...')
                          : formData.fieldIds.length === fields.length && fields.length > 0
                            ? t('common.allFields', 'All Fields')
                            : formData.fieldIds.length === 1
                              ? fields.find(f => f.id === formData.fieldIds[0])?.name
                              : t('expenses.fieldsSelected', '{{count}} fields selected', { count: formData.fieldIds.length })}
                      </span>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${showFieldDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {showFieldDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200 flex gap-2">
                          <button
                            type="button"
                            onClick={selectAllFields}
                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                          >
                            {t('common.selectAll', 'Select All')}
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={clearAllFields}
                            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                          >
                            {t('common.clearAll', 'Clear All')}
                          </button>
                        </div>
                        {fields.length === 0 ? (
                          <div className="p-3 text-sm text-gray-500 text-center">
                            {t('expenses.noFieldsAvailable', 'No fields available')}
                          </div>
                        ) : (
                          <>
                            {/* All Fields option */}
                            <label
                              className="flex items-center gap-3 px-3 py-2 hover:bg-green-50 cursor-pointer border-b border-gray-100 bg-green-50/50"
                            >
                              <input
                                type="checkbox"
                                checked={formData.fieldIds.length === fields.length && fields.length > 0}
                                onChange={() => {
                                  if (formData.fieldIds.length === fields.length) {
                                    clearAllFields();
                                  } else {
                                    selectAllFields();
                                  }
                                }}
                                className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                              />
                              <span className="text-sm font-medium text-green-700">
                                {t('common.allFields', 'All Fields')}
                              </span>
                            </label>
                            {fields.map((field) => (
                              <label
                                key={field.id}
                                className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={formData.fieldIds.includes(field.id)}
                                  onChange={() => toggleFieldSelection(field.id)}
                                  className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className="text-sm text-gray-700">
                                  {field.name} ({field.cropType})
                                </span>
                              </label>
                            ))}
                          </>
                        )}
                      </div>
                    )}

                    {/* Selected fields tags - hide when all fields selected */}
                    {formData.fieldIds.length > 0 && formData.fieldIds.length < fields.length && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {formData.fieldIds.map(fieldId => {
                          const field = fields.find(f => f.id === fieldId);
                          return field ? (
                            <span
                              key={fieldId}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                            >
                              {field.name}
                              <button
                                type="button"
                                onClick={() => toggleFieldSelection(fieldId)}
                                className="hover:text-green-900"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t('common.save', 'Save')}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
