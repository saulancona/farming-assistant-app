import { useState, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Download,
  FileText,
  File
} from 'lucide-react';
import { exportToCSV, exportToPDF } from '../utils/exportUtils';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { Expense, Income, Field } from '../types';
import { format, subMonths } from 'date-fns';
import ConvertedPrice from './ConvertedPrice';

interface ReportsAnalyticsProps {
  expenses: Expense[];
  income: Income[];
  fields: Field[];
}

const COLORS = ['#16a34a', '#2563eb', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsAnalytics({ expenses, income, fields }: ReportsAnalyticsProps) {
  const [dateRange, setDateRange] = useState<'1m' | '3m' | '6m' | '1y' | 'all'>('3m');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    }

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Filter data by date range
  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;

    switch (dateRange) {
      case '1m':
        startDate = subMonths(now, 1);
        break;
      case '3m':
        startDate = subMonths(now, 3);
        break;
      case '6m':
        startDate = subMonths(now, 6);
        break;
      case '1y':
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const filteredExpenses = expenses.filter(e => new Date(e.date) >= startDate);
    const filteredIncome = income.filter(i => new Date(i.date) >= startDate);

    return { expenses: filteredExpenses, income: filteredIncome };
  }, [expenses, income, dateRange]);

  // Calculate financial metrics
  const metrics = useMemo(() => {
    const totalExpenses = filteredData.expenses.reduce((sum, e) => sum + e.amount, 0);
    const totalIncome = filteredData.income.reduce((sum, i) => sum + i.amount, 0);
    const netProfit = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      totalExpenses,
      totalIncome,
      netProfit,
      profitMargin
    };
  }, [filteredData]);

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    const categoryTotals: Record<string, number> = {};

    filteredData.expenses.forEach(expense => {
      const category = expense.category || 'other';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });

    return Object.entries(categoryTotals).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [filteredData.expenses]);

  // Monthly income vs expenses trend
  const monthlyTrend = useMemo(() => {
    const months: Record<string, { income: number; expenses: number }> = {};

    filteredData.expenses.forEach(expense => {
      const month = format(new Date(expense.date), 'MMM yyyy');
      if (!months[month]) months[month] = { income: 0, expenses: 0 };
      months[month].expenses += expense.amount;
    });

    filteredData.income.forEach(inc => {
      const month = format(new Date(inc.date), 'MMM yyyy');
      if (!months[month]) months[month] = { income: 0, expenses: 0 };
      months[month].income += inc.amount;
    });

    return Object.entries(months)
      .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
      .map(([month, data]) => ({
        month,
        income: data.income,
        expenses: data.expenses,
        profit: data.income - data.expenses
      }));
  }, [filteredData]);

  // Field performance (income per field)
  const fieldPerformance = useMemo(() => {
    const fieldIncome: Record<string, number> = {};
    const fieldExpenses: Record<string, number> = {};

    filteredData.income.forEach(inc => {
      if (inc.fieldId) {
        fieldIncome[inc.fieldId] = (fieldIncome[inc.fieldId] || 0) + inc.amount;
      }
    });

    filteredData.expenses.forEach(exp => {
      if (exp.fieldId) {
        fieldExpenses[exp.fieldId] = (fieldExpenses[exp.fieldId] || 0) + exp.amount;
      }
    });

    return fields
      .filter(field => fieldIncome[field.id] || fieldExpenses[field.id])
      .map(field => ({
        name: field.name,
        income: fieldIncome[field.id] || 0,
        expenses: fieldExpenses[field.id] || 0,
        profit: (fieldIncome[field.id] || 0) - (fieldExpenses[field.id] || 0)
      }));
  }, [filteredData, fields]);

  // Export handlers
  const handleExportCSV = () => {
    exportToCSV({
      expenses: filteredData.expenses,
      income: filteredData.income,
      fields,
      dateRange: dateRange === '1m' ? 'Last Month' :
                dateRange === '3m' ? 'Last 3 Months' :
                dateRange === '6m' ? 'Last 6 Months' :
                dateRange === '1y' ? 'Last Year' : 'All Time',
      metrics
    });
    setShowExportMenu(false);
  };

  const handleExportPDF = () => {
    exportToPDF({
      expenses: filteredData.expenses,
      income: filteredData.income,
      fields,
      dateRange: dateRange === '1m' ? 'Last Month' :
                dateRange === '3m' ? 'Last 3 Months' :
                dateRange === '6m' ? 'Last 6 Months' :
                dateRange === '1y' ? 'Last Year' : 'All Time',
      metrics
    });
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600 mt-1">Financial insights and performance metrics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="1m">Last Month</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
          <div ref={exportMenuRef} className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
            >
              <Download size={20} />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={handleExportPDF}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors text-left"
                >
                  <FileText size={16} className="text-red-600" />
                  <span className="text-gray-700">Export as PDF</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 transition-colors text-left"
                >
                  <File size={16} className="text-green-600" />
                  <span className="text-gray-700">Export as CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Income</p>
            <div className="bg-green-100 p-2 rounded-lg">
              <TrendingUp className="text-green-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900"><ConvertedPrice amount={metrics.totalIncome} /></p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Expenses</p>
            <div className="bg-red-100 p-2 rounded-lg">
              <TrendingDown className="text-red-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900"><ConvertedPrice amount={metrics.totalExpenses} /></p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Net Profit</p>
            <div className={`p-2 rounded-lg ${metrics.netProfit >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign className={metrics.netProfit >= 0 ? 'text-blue-600' : 'text-orange-600'} size={20} />
            </div>
          </div>
          <p className={`text-3xl font-bold ${metrics.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            <ConvertedPrice amount={Math.abs(metrics.netProfit)} />
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.netProfit >= 0 ? 'Profit' : 'Loss'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Profit Margin</p>
            <div className="bg-purple-100 p-2 rounded-lg">
              <BarChart3 className="text-purple-600" size={20} />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{metrics.profitMargin.toFixed(1)}%</p>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown Pie Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Expense Breakdown</h2>
          {expenseByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent as number) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseByCategory.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No expense data available
            </div>
          )}
        </motion.div>

        {/* Income vs Expenses Trend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Monthly Trend</h2>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#16a34a" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </motion.div>
      </div>

      {/* Field Performance */}
      {fieldPerformance.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Field Performance</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fieldPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="income" fill="#16a34a" name="Income" />
              <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
              <Bar dataKey="profit" fill="#2563eb" name="Profit" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
