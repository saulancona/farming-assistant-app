import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Sprout, DollarSign, MapPin, BarChart3, ChevronRight, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, eachMonthOfInterval, subMonths, subDays, startOfYear, formatDistanceToNow, parseISO, isWithinInterval } from 'date-fns';
import type { DashboardStats, Expense, Income, Field, Task } from '../types';
import ReadButton from './ReadButton';
import TalkingButton from './TalkingButton';
import ConvertedPrice from './ConvertedPrice';
import { useAuth } from '../contexts/AuthContext';
import { useRewardsProfile, useLevelDefinitions, useXPProgress, useRealTimeStats } from '../hooks/useRewards';
import { useFarmerScore } from '../hooks/useFarmerScore';
import { useUserPoints } from '../hooks/useRewardsShop';
import { StreakWidgetCompact } from './rewards/StreakWidget';

interface DashboardProps {
  stats: DashboardStats;
  expenses?: Expense[];
  income?: Income[];
  fields?: Field[];
  tasks?: Task[];
  onNavigate?: (tab: string) => void;
}

type DateRangePreset = 'all' | '7d' | '30d' | '90d' | 'ytd' | 'custom';

export default function Dashboard({ stats, expenses = [], income = [], fields = [], tasks = [], onNavigate }: DashboardProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [farmSizeUnit, setFarmSizeUnit] = useState<'acres' | 'hectares'>('acres');
  const [, setCurrency] = useState<string>('KES'); // Force re-render on currency change

  // Date range filter state
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Rewards data
  const { data: rewardsProfile } = useRewardsProfile(user?.id);
  const { data: levels } = useLevelDefinitions();
  const { data: farmerScore } = useFarmerScore(user?.id);
  const { data: realTimeStats } = useRealTimeStats(user?.id);
  const { data: userPoints } = useUserPoints(user?.id);
  const xpProgress = useXPProgress(user?.id);
  const currentLevel = levels?.find(l => l.level === rewardsProfile?.currentLevel);
  const isSwahili = i18n.language === 'sw';

  // Load unit preference from localStorage and listen for changes
  useEffect(() => {
    const loadUnitPreference = () => {
      const savedSettings = localStorage.getItem('farmSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setFarmSizeUnit(settings.farmSizeUnit || 'acres');
          setCurrency(settings.currency || 'KES');
        } catch (error) {
          console.error('Error loading unit preference:', error);
        }
      }
    };

    loadUnitPreference();

    // Listen for settings changes
    const handleSettingsSaved = () => {
      loadUnitPreference();
    };

    window.addEventListener('settingsSaved', handleSettingsSaved);
    return () => window.removeEventListener('settingsSaved', handleSettingsSaved);
  }, []);

  // Helper function to convert area for display
  const convertAreaForDisplay = (areaInAcres: number): string => {
    if (farmSizeUnit === 'hectares') {
      return (areaInAcres * 0.404686).toFixed(2);
    }
    return areaInAcres.toFixed(2);
  };

  // Get date range based on preset
  const getDateRange = (): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (dateRangePreset) {
      case '7d':
        return { start: subDays(now, 7), end: now };
      case '30d':
        return { start: subDays(now, 30), end: now };
      case '90d':
        return { start: subDays(now, 90), end: now };
      case 'ytd':
        return { start: startOfYear(now), end: now };
      case 'custom':
        return {
          start: customStartDate ? new Date(customStartDate) : null,
          end: customEndDate ? new Date(customEndDate) : null
        };
      default:
        return { start: null, end: null };
    }
  };

  // Filter function for date range
  const isInDateRange = (dateStr: string): boolean => {
    if (dateRangePreset === 'all') return true;
    const { start, end } = getDateRange();
    if (!start || !end) return true;
    try {
      const date = new Date(dateStr);
      return isWithinInterval(date, { start, end });
    } catch {
      return true;
    }
  };

  // Filtered data based on date range
  const filteredExpenses = expenses.filter(e => e.date && isInDateRange(e.date));
  const filteredIncome = income.filter(i => i.date && isInDateRange(i.date));

  // Prepare data for Revenue vs Expenses chart (last 6 months)
  const last6Months = eachMonthOfInterval({
    start: subMonths(startOfMonth(new Date()), 5),
    end: startOfMonth(new Date())
  });

  const monthlyData = last6Months.map(month => {
    const monthStart = startOfMonth(month);
    const monthKey = format(monthStart, 'yyyy-MM');

    const monthExpenses = expenses
      .filter(e => e.date && format(new Date(e.date), 'yyyy-MM') === monthKey)
      .reduce((sum, e) => sum + e.amount, 0);

    const monthIncome = income
      .filter(i => i.date && format(new Date(i.date), 'yyyy-MM') === monthKey)
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      month: format(monthStart, 'MMM'),
      expenses: monthExpenses,
      income: monthIncome,
      profit: monthIncome - monthExpenses
    };
  });

  // Prepare data for Expense breakdown by category (using filtered data)
  const expenseByCategory = filteredExpenses.reduce((acc, expense) => {
    const existing = acc.find(item => item.category === expense.category);
    if (existing) {
      existing.value += expense.amount;
    } else {
      acc.push({ category: expense.category, value: expense.amount });
    }
    return acc;
  }, [] as { category: string; value: number }[]);

  // Prepare data for Income breakdown - show each harvest sale individually (using filtered data)
  const incomeBreakdown = filteredIncome.map(incomeItem => {
    // For harvest sales, show detailed breakdown
    if (incomeItem.source === 'harvest_sale') {
      return {
        name: incomeItem.description || `Harvest Sale ${format(new Date(incomeItem.date), 'MMM dd')}`,
        value: incomeItem.amount,
        field: incomeItem.fieldName || 'Unknown Field',
        date: format(new Date(incomeItem.date), 'MMM dd, yyyy')
      };
    }
    // For other sources, show with description
    return {
      name: incomeItem.description || incomeItem.source.replace('_', ' '),
      value: incomeItem.amount,
      field: incomeItem.fieldName,
      date: format(new Date(incomeItem.date), 'MMM dd, yyyy')
    };
  });

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  // Helper to safely parse ISO date strings
  const safeParseDateISO = (dateStr: string | undefined | null): Date | null => {
    if (!dateStr) return null;
    try {
      const date = parseISO(dateStr);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // Generate recent activity from all data sources
  const recentActivities = (() => {
    const activities: Array<{ action: string; description: string; time: string; timestamp: Date; amount?: number }> = [];

    // Add field activities
    fields.forEach(field => {
      const plantingDate = safeParseDateISO(field.plantingDate);
      if (plantingDate) {
        activities.push({
          action: 'Field Planted',
          description: `${field.name} - ${field.cropType}`,
          time: formatDistanceToNow(plantingDate, { addSuffix: true }),
          timestamp: plantingDate
        });
      }
    });

    // Add expense activities
    expenses.slice(0, 5).forEach(expense => {
      const expenseDate = safeParseDateISO(expense.date);
      if (expenseDate) {
        activities.push({
          action: 'Expense Added',
          description: expense.description,
          amount: expense.amount,
          time: formatDistanceToNow(expenseDate, { addSuffix: true }),
          timestamp: expenseDate
        });
      }
    });

    // Add income activities
    income.slice(0, 5).forEach(incomeItem => {
      const incomeDate = safeParseDateISO(incomeItem.date);
      if (incomeDate) {
        activities.push({
          action: 'Income Received',
          description: incomeItem.description,
          amount: incomeItem.amount,
          time: formatDistanceToNow(incomeDate, { addSuffix: true }),
          timestamp: incomeDate
        });
      }
    });

    // Add task activities (completed tasks)
    tasks.filter(task => task.status === 'completed' && task.completedAt).slice(0, 5).forEach(task => {
      const completedDate = safeParseDateISO(task.completedAt);
      if (completedDate) {
        activities.push({
          action: 'Task Completed',
          description: task.title,
          time: formatDistanceToNow(completedDate, { addSuffix: true }),
          timestamp: completedDate
        });
      }
    });

    // Sort by timestamp (most recent first) and take top 5
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 5);
  })();

  const statCards = [
    {
      title: t('dashboard.totalFields'),
      value: stats.totalFields,
      icon: MapPin,
      color: 'bg-blue-500',
      subtitle: `${stats.activeFields} active`,
      isCurrency: false,
    },
    {
      title: t('dashboard.totalArea'),
      value: `${convertAreaForDisplay(stats.totalArea)} ${farmSizeUnit === 'hectares' ? 'hectares' : 'acres'}`,
      icon: Sprout,
      color: 'bg-green-500',
      subtitle: 'Under cultivation',
      isCurrency: false,
    },
    {
      title: t('dashboard.totalExpenses'),
      value: stats.monthlyExpenses,
      icon: BarChart3,
      color: 'bg-orange-500',
      subtitle: (
        <span className={`flex items-center gap-1 ${stats.expenseChange >= 0 ? 'text-red-600' : 'text-green-600'}`}>
          {stats.expenseChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {Math.abs(stats.expenseChange)}% from last month
        </span>
      ),
      isCurrency: true,
    },
    {
      title: t('dashboard.estimatedRevenue'),
      value: stats.estimatedRevenue,
      icon: DollarSign,
      color: 'bg-primary-600',
      subtitle: 'Projected this season',
      isCurrency: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="text-gray-600 mt-1">{t('auth.welcome')}</p>
        </div>

        {/* Date Range Filter */}
        <div className="relative">
          <button
            onClick={() => setShowDateFilter(!showDateFilter)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Filter size={18} className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {dateRangePreset === 'all' ? t('dashboard.allTime', 'All Time') :
               dateRangePreset === '7d' ? t('dashboard.last7Days', 'Last 7 Days') :
               dateRangePreset === '30d' ? t('dashboard.last30Days', 'Last 30 Days') :
               dateRangePreset === '90d' ? t('dashboard.last90Days', 'Last 90 Days') :
               dateRangePreset === 'ytd' ? t('dashboard.yearToDate', 'Year to Date') :
               t('dashboard.custom', 'Custom')}
            </span>
          </button>

          {showDateFilter && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-4">
              <p className="text-xs font-medium text-gray-500 mb-3">{t('dashboard.filterByDate', 'Filter by Date Range')}</p>
              <div className="space-y-2">
                {(['all', '7d', '30d', '90d', 'ytd', 'custom'] as DateRangePreset[]).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => {
                      setDateRangePreset(preset);
                      if (preset !== 'custom') setShowDateFilter(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      dateRangePreset === preset
                        ? 'bg-green-100 text-green-800 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    {preset === 'all' ? t('dashboard.allTime', 'All Time') :
                     preset === '7d' ? t('dashboard.last7Days', 'Last 7 Days') :
                     preset === '30d' ? t('dashboard.last30Days', 'Last 30 Days') :
                     preset === '90d' ? t('dashboard.last90Days', 'Last 90 Days') :
                     preset === 'ytd' ? t('dashboard.yearToDate', 'Year to Date') :
                     t('dashboard.customRange', 'Custom Range')}
                  </button>
                ))}
              </div>

              {dateRangePreset === 'custom' && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('dashboard.startDate', 'Start Date')}
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {t('dashboard.endDate', 'End Date')}
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <button
                    onClick={() => setShowDateFilter(false)}
                    className="w-full px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                  >
                    {t('common.apply', 'Apply')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily Streak Widget - At the top */}
      {user && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <StreakWidgetCompact userId={user.id} />
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => {
          // Create descriptive text for voice
          const subtitleText = typeof card.subtitle === 'string' ? card.subtitle : '';
          const voiceText = `${card.title}: ${card.value}. ${subtitleText}`;

          return (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-sm font-medium text-gray-600 flex-1">{card.title}</p>
                <ReadButton text={voiceText} size="sm" />
              </div>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-2xl font-bold text-gray-900 mb-2">
                    {card.isCurrency ? <ConvertedPrice amount={card.value as number} /> : card.value}
                  </p>
                  <p className="text-xs text-gray-500">{card.subtitle}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <card.icon className="text-white" size={24} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Rewards Progress Widget */}
      {user && rewardsProfile && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Level Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="lg:col-span-2 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-md p-4 text-white cursor-pointer hover:from-emerald-600 hover:to-emerald-700 transition-colors"
            onClick={() => onNavigate?.('rewards')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-3xl">
                  {currentLevel?.icon || '🌱'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-emerald-100 text-xs">
                      {t('rewards.level', 'Level')} {rewardsProfile.currentLevel}
                    </p>
        {/* Streak shown in separate widget below */}
                  </div>
                  <p className="font-bold text-lg">
                    {isSwahili ? currentLevel?.nameSw : currentLevel?.name || 'Seedling'}
                  </p>
                  <p className="text-xs text-emerald-100">
                    {rewardsProfile.totalXp.toLocaleString()} XP • {xpProgress.xpToNextLevel.toLocaleString()} {t('rewards.toNextLevel', 'to next level')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold">{realTimeStats?.tasksCompleted ?? rewardsProfile.tasksCompleted}</p>
                    <p className="text-xs text-emerald-100">{t('rewards.tasks', 'Tasks')}</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{realTimeStats?.fieldsCount ?? rewardsProfile.fieldsCount}</p>
                    <p className="text-xs text-emerald-100">{t('rewards.fields', 'Fields')}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-200" />
              </div>
            </div>
            {/* XP Progress Bar */}
            <div className="mt-3">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress.progressPercentage}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Farmer Score Mini Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-md p-4 text-white cursor-pointer hover:from-purple-600 hover:to-indigo-700 transition-colors"
            onClick={() => onNavigate?.('rewards')}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-2">
                <p className="text-purple-100 text-xs font-medium">{t('rewards.farmerScore', 'Farmer Score')}</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  farmerScore?.tier === 'champion' ? 'bg-amber-400 text-amber-900' :
                  farmerScore?.tier === 'gold' ? 'bg-yellow-400 text-yellow-900' :
                  farmerScore?.tier === 'silver' ? 'bg-gray-300 text-gray-800' :
                  'bg-orange-400 text-orange-900'
                }`}>
                  {farmerScore?.tier?.toUpperCase() || 'BRONZE'}
                </span>
              </div>
              <div className="flex items-center justify-center flex-1">
                <div className="text-center">
                  <p className="text-4xl font-bold">{Math.round(farmerScore?.totalScore || 0)}</p>
                  <p className="text-xs text-purple-200">{t('rewards.outOf100', 'out of 100')}</p>
                </div>
              </div>
              {/* Score Components Mini Bar */}
              <div className="mt-2 flex gap-1 h-1.5">
                <div
                  className="bg-blue-400 rounded-full"
                  style={{ width: `${((farmerScore?.learningScore || 0) / 25) * 25}%` }}
                  title="Learning"
                />
                <div
                  className="bg-green-400 rounded-full"
                  style={{ width: `${((farmerScore?.missionScore || 0) / 25) * 25}%` }}
                  title="Missions"
                />
                <div
                  className="bg-yellow-400 rounded-full"
                  style={{ width: `${((farmerScore?.engagementScore || 0) / 25) * 25}%` }}
                  title="Engagement"
                />
                <div
                  className="bg-purple-400 rounded-full"
                  style={{ width: `${((farmerScore?.reliabilityScore || 0) / 25) * 25}%` }}
                  title="Reliability"
                />
              </div>
              <div className="flex justify-between text-[10px] text-purple-200 mt-1">
                <span>L</span>
                <span>M</span>
                <span>E</span>
                <span>R</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Points Balance Banner */}
      {user && userPoints && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md p-3 text-white cursor-pointer hover:from-amber-600 hover:to-orange-600 transition-colors"
          onClick={() => onNavigate?.('shop')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <p className="text-amber-100 text-xs">{t('rewards.pointsBalance', 'Points Balance')}</p>
                <p className="font-bold text-xl">{userPoints.totalPoints?.toLocaleString() || 0} {t('rewards.points', 'pts')}</p>
              </div>
            </div>
            <button className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors">
              {t('rewards.visitShop', 'Shop')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('dashboard.recentActivity')}</h2>
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-b-0">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                    <p className="text-xs text-gray-600">
                      {activity.description}
                      {activity.amount !== undefined && (
                        <span> - <ConvertedPrice amount={activity.amount} /></span>
                      )}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No recent activity yet. Start by adding fields, expenses, or tasks!</p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('dashboard.quickActions')}</h2>
          <div className="grid grid-cols-3 gap-3">
            <TalkingButton
              voiceLabel="Add Field. Click to go to the Fields page and add a new field to track your crops."
              onClick={() => onNavigate?.('fields')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left group"
            >
              <Sprout className="text-primary-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <p className="text-sm font-medium text-gray-900">Add Field</p>
              <p className="text-xs text-gray-500">Track new crop</p>
            </TalkingButton>
            <TalkingButton
              voiceLabel="Add Expense. Click to go to the Expenses page and record a new cost or purchase."
              onClick={() => onNavigate?.('expenses')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left group"
            >
              <DollarSign className="text-primary-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <p className="text-sm font-medium text-gray-900">Add Expense</p>
              <p className="text-xs text-gray-500">Record cost</p>
            </TalkingButton>
            <TalkingButton
              voiceLabel="View Reports. Click to see your farm's analytics, charts, and financial reports."
              onClick={() => onNavigate?.('reports')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-primary-500 hover:bg-primary-50 transition-colors text-left group"
            >
              <BarChart3 className="text-primary-600 mb-2 group-hover:scale-110 transition-transform" size={24} />
              <p className="text-sm font-medium text-gray-900">View Reports</p>
              <p className="text-xs text-gray-500">Analytics</p>
            </TalkingButton>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      {(expenses.length > 0 || income.length > 0) && (
        <>
          {/* Revenue vs Expenses Chart with Net Profit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-xl shadow-md p-4 md:p-6"
          >
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Revenue vs Expenses (Last 6 Months)</h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(value) => `$${value}`}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="income" fill="#10b981" name="Income" />
                    <Bar dataKey="expenses" fill="#ef4444" name="Expenses" />
                    <Bar dataKey="profit" fill="#8b5cf6" name="Net Profit" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Expense Breakdown Chart */}
            {expenseByCategory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="bg-white rounded-xl shadow-md p-4 md:p-6"
              >
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Expenses by Category</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={expenseByCategory}
                      cx="50%"
                      cy="50%"
                      innerRadius={window.innerWidth < 768 ? 40 : 60}
                      outerRadius={window.innerWidth < 768 ? 70 : 100}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {expenseByCategory.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          const total = expenseByCategory.reduce((sum, item) => sum + item.value, 0);
                          const percent = ((data.value / total) * 100).toFixed(1);
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                              <p className="font-medium text-gray-900 capitalize mb-1">{data.category}</p>
                              <p className="text-red-600 font-bold">${data.value.toLocaleString()}</p>
                              <p className="text-gray-400 text-xs">{percent}% of total</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend for better readability */}
                <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                  {expenseByCategory.map((item, index) => {
                    const total = expenseByCategory.reduce((sum, i) => sum + i.value, 0);
                    const percent = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-gray-700 capitalize">{item.category}</span>
                          <span className="text-gray-400">({percent}%)</span>
                        </div>
                        <span className="text-gray-900 font-medium"><ConvertedPrice amount={item.value} /></span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Income Breakdown Chart - Individual Sales */}
            {incomeBreakdown.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="bg-white rounded-xl shadow-md p-4 md:p-6"
              >
                <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Income Breakdown</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={incomeBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={window.innerWidth < 768 ? 40 : 60}
                      outerRadius={window.innerWidth < 768 ? 70 : 100}
                      fill="#8884d8"
                      dataKey="value"
                      paddingAngle={2}
                    >
                      {incomeBreakdown.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
                              <p className="font-medium text-gray-900 mb-1">{data.name}</p>
                              <p className="text-green-600 font-bold">${data.value.toLocaleString()}</p>
                              {data.field && <p className="text-gray-500 text-xs mt-1">Field: {data.field}</p>}
                              <p className="text-gray-400 text-xs">{data.date}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend for better readability */}
                <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                  {incomeBreakdown.map((item, index) => {
                    const total = incomeBreakdown.reduce((sum, i) => sum + i.value, 0);
                    const percent = ((item.value / total) * 100).toFixed(1);
                    return (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
                          <span className="text-gray-700 truncate max-w-[150px]">{item.name}</span>
                          <span className="text-gray-400">({percent}%)</span>
                        </div>
                        <span className="text-gray-900 font-medium"><ConvertedPrice amount={item.value} /></span>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>

          {/* Profit Trend Line Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="bg-white rounded-xl shadow-md p-4 md:p-6"
          >
            <h2 className="text-lg md:text-xl font-semibold text-gray-900 mb-3 md:mb-4">Profit Trend</h2>
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip formatter={(value) => `$${value}`} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="profit" stroke="#8b5cf6" strokeWidth={2} name="Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
