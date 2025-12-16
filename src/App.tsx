import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Sprout, DollarSign, CloudSun, TrendingUp, Menu, X, CheckSquare, Settings as SettingsIcon, LogOut, Bug, MessageCircle, Users, Mail, BookOpen, ShoppingCart, BarChart3, Calendar, Loader, Package, Warehouse, Mic, Trophy, GraduationCap, Target, Zap, Gift, UserPlus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useUIStore, type Tab } from './store/uiStore';
import { useFields, useExpenses, useIncome, useTasks, useInventory, useStorageBins } from './hooks/useSupabaseData';
import ErrorBoundary from './components/ErrorBoundary';
import toast, { Toaster } from 'react-hot-toast';

// Lazy load components for code splitting
const Dashboard = lazy(() => import('./components/Dashboard'));
const Weather = lazy(() => import('./components/Weather'));
const Markets = lazy(() => import('./components/Markets'));
const FieldsManager = lazy(() => import('./components/FieldsManager'));
const ExpenseTracker = lazy(() => import('./components/ExpenseTracker'));
const IncomeTracker = lazy(() => import('./components/IncomeTracker'));
const TaskManager = lazy(() => import('./components/TaskManager'));
const Settings = lazy(() => import('./components/Settings'));
const PestControl = lazy(() => import('./components/PestControl'));
const FarmingChat = lazy(() => import('./components/FarmingChat'));
const Community = lazy(() => import('./components/Community'));
const Messages = lazy(() => import('./components/Messages'));
const Knowledge = lazy(() => import('./components/Knowledge'));
const Marketplace = lazy(() => import('./components/Marketplace'));
const Analytics = lazy(() => import('./components/Analytics'));
const FarmCalendar = lazy(() => import('./components/FarmCalendar'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const StorageBinManager = lazy(() => import('./components/StorageBinManager'));
const Auth = lazy(() => import('./components/Auth'));
const VoiceAssistant = lazy(() => import('./components/VoiceAssistant'));
const RewardsOverview = lazy(() => import('./components/rewards/RewardsOverview'));
const LearningProgress = lazy(() => import('./components/learning/LearningProgress'));
const MissionHub = lazy(() => import('./components/missions/MissionHub'));
const WeeklyChallenges = lazy(() => import('./components/challenges/WeeklyChallenges'));
const RewardsShop = lazy(() => import('./components/shop/RewardsShop'));
const ReferralDashboard = lazy(() => import('./components/referrals/ReferralDashboard'));

// Keep these as regular imports (used in main layout)
import NotificationsPanel from './components/NotificationsPanel';
import VoiceControl from './components/VoiceControl';
import TalkingButton from './components/TalkingButton';
import OfflineIndicator from './components/OfflineIndicator';
import { XPToastProvider } from './components/rewards/XPToast';
import { useUpdateStreak } from './hooks/useRewards';
import type { Field, Expense, Income, Task, InventoryItem, StorageBin, WeatherData, MarketPrice, DashboardStats } from './types';
import * as db from './services/database';
import { supabase } from './lib/supabase';
import { getWeatherData } from './services/weather';
import { getMarketData } from './services/marketData';
import { checkWeatherAndNotify, startWeatherNotificationService, getNotificationPermission } from './services/notifications';

// Loading fallback component
const PageLoader = () => (
  <div className="flex items-center justify-center py-12">
    <div className="text-center">
      <Loader className="animate-spin text-green-600 mx-auto mb-3" size={32} />
      <p className="text-gray-500">Loading...</p>
    </div>
  </div>
);

function App() {
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const queryClient = useQueryClient();

  // UI state from store
  const {
    activeTab,
    setActiveTab,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isLoading,
    setIsLoading,
    showAuthModal,
    setShowAuthModal,
    farmLocation,
    setFarmLocation
  } = useUIStore();

  // Server data from React Query hooks
  const { data: fields = [] } = useFields(user?.id);
  const { data: expenses = [] } = useExpenses(user?.id);
  const { data: income = [] } = useIncome(user?.id);
  const { data: tasks = [] } = useTasks(user?.id);
  const { data: inventory = [] } = useInventory(user?.id);
  const { data: storageBins = [] } = useStorageBins(user?.id);

  // Weather and market data (keep as local state for now)
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);

  // Voice Assistant state
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  // Streak update hook
  const updateStreak = useUpdateStreak();

  // Set loading state when auth completes
  useEffect(() => {
    // Only set isLoading to false after auth has finished loading
    if (!authLoading) {
      setIsLoading(false);
    }
  }, [authLoading, setIsLoading]);

  // Update streak on login
  useEffect(() => {
    if (user?.id && !authLoading) {
      updateStreak.mutate(user.id);
    }
  }, [user?.id, authLoading]);

  // Setup realtime subscriptions for live updates integrated with React Query
  useEffect(() => {
    if (!user) return;

    console.log('Setting up realtime subscriptions integrated with React Query...');

    // Subscribe to fields changes - invalidate React Query cache
    const fieldsChannel = supabase
      .channel('fields-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fields', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        console.log('Fields change detected:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['fields', user.id] });
      })
      .subscribe();

    // Subscribe to expenses changes
    const expensesChannel = supabase
      .channel('expenses-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        console.log('Expenses change detected:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['expenses', user.id] });
      })
      .subscribe();

    // Subscribe to income changes
    const incomeChannel = supabase
      .channel('income-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'income', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        console.log('Income change detected:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['income', user.id] });
      })
      .subscribe();

    // Subscribe to tasks changes
    const tasksChannel = supabase
      .channel('tasks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        console.log('Tasks change detected:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['tasks', user.id] });
      })
      .subscribe();

    // Subscribe to inventory changes
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        console.log('Inventory change detected:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['inventory', user.id] });
      })
      .subscribe();

    // Subscribe to storage bins changes
    const storageChannel = supabase
      .channel('storage-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'storage_bins', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        console.log('Storage change detected:', payload.eventType);
        queryClient.invalidateQueries({ queryKey: ['storage_bins', user.id] });
      })
      .subscribe();

    // Cleanup subscriptions on unmount or user change
    return () => {
      console.log('Cleaning up realtime subscriptions...');
      supabase.removeChannel(fieldsChannel);
      supabase.removeChannel(expensesChannel);
      supabase.removeChannel(incomeChannel);
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(storageChannel);
    };
  }, [user, queryClient]);

  // Load weather data and farm location independently
  useEffect(() => {
    async function loadWeather() {
      try {
        console.log('Loading weather data...');

        // Get coordinates and location from settings
        const savedSettings = localStorage.getItem('farmSettings');
        let lat, lon, location;

        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            lat = settings.latitude;
            lon = settings.longitude;
            location = settings.farmLocation;
            setFarmLocation(location || 'Nairobi, Kenya');
          } catch (error) {
            console.error('Error parsing settings:', error);
          }
        }

        const weather = await getWeatherData(lat, lon);
        setWeatherData(weather);
        // Save to localStorage for AI context
        localStorage.setItem('weatherData', JSON.stringify(weather));
        console.log('Weather data loaded:', weather);

        // Check weather conditions and send notifications if enabled
        if (getNotificationPermission() === 'granted') {
          await checkWeatherAndNotify(weather);
          // Start the periodic weather notification service
          startWeatherNotificationService();
        }
      } catch (error) {
        console.error('Error loading weather:', error);
      }
    }
    loadWeather();
  }, []);

  // Load market data independently
  useEffect(() => {
    async function loadMarket() {
      try {
        console.log('Loading market data...');
        const markets = await getMarketData();
        setMarketPrices(markets);
        console.log('Market data loaded:', markets);
      } catch (error) {
        console.error('Error loading market data:', error);
      }
    }
    loadMarket();
  }, []);

  // Listen for settings changes to reload weather and update location
  useEffect(() => {
    const handleSettingsSaved = async (event: any) => {
      const { latitude, longitude } = event.detail;
      console.log('Settings updated, reloading weather for:', latitude, longitude);

      try {
        // Update location name from settings
        const savedSettings = localStorage.getItem('farmSettings');
        if (savedSettings) {
          try {
            const settings = JSON.parse(savedSettings);
            setFarmLocation(settings.farmLocation || 'Nairobi, Kenya');
          } catch (error) {
            console.error('Error parsing settings:', error);
          }
        }

        const weather = await getWeatherData(latitude, longitude);
        setWeatherData(weather);
        // Save to localStorage for AI context
        localStorage.setItem('weatherData', JSON.stringify(weather));
        console.log('Weather data updated with new location');
      } catch (error) {
        console.error('Error reloading weather:', error);
      }
    };

    window.addEventListener('settingsSaved', handleSettingsSaved);
    return () => window.removeEventListener('settingsSaved', handleSettingsSaved);
  }, []);

  // React Query handles data loading automatically - no manual loadData needed!

  // Calculate dashboard stats
  const dashboardStats: DashboardStats = {
    totalFields: fields.length,
    activeFields: fields.filter(f => f.status === 'growing' || f.status === 'planted').length,
    totalArea: fields.reduce((sum, f) => sum + f.area, 0),
    monthlyExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    estimatedRevenue: income.reduce((sum, i) => sum + i.amount, 0),
    expenseChange: 12.5
  };

  // CRUD handlers for fields
  const handleAddField = async (field: Omit<Field, 'id'>) => {
    try {
      await db.addField(field);
      queryClient.invalidateQueries({ queryKey: ['fields', user?.id] });
      window.dispatchEvent(new Event('fieldsChanged'));
    } catch (error) {
      console.error('Error adding field:', error);
      toast.error('Failed to add field. Please try again.');
    }
  };

  const handleUpdateField = async (id: string, updates: Partial<Field>) => {
    try {
      console.log('Updating field:', id, updates);
      const result = await db.updateField(id, updates);
      console.log('Update result:', result);
      // Manually invalidate the query cache to ensure UI updates
      queryClient.invalidateQueries({ queryKey: ['fields', user?.id] });
      // Notify Settings to recalculate farm size
      window.dispatchEvent(new Event('fieldsChanged'));
    } catch (error) {
      console.error('Error updating field:', error);
      toast.error('Failed to update field. Please try again.');
    }
  };

  const handleDeleteField = async (id: string) => {
    try {
      await db.deleteField(id);
      queryClient.invalidateQueries({ queryKey: ['fields', user?.id] });
      window.dispatchEvent(new Event('fieldsChanged'));
    } catch (error) {
      console.error('Error deleting field:', error);
      toast.error('Failed to delete field. Please try again.');
    }
  };

  // CRUD handlers for expenses
  const handleAddExpense = async (expense: Omit<Expense, 'id'>) => {
    try {
      await db.addExpense(expense);
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
    } catch (error) {
      console.error('Error adding expense:', error);
      toast.error('Failed to add expense. Please try again.');
    }
  };

  const handleUpdateExpense = async (id: string, updates: Partial<Expense>) => {
    try {
      await db.updateExpense(id, updates);
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense. Please try again.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await db.deleteExpense(id);
      queryClient.invalidateQueries({ queryKey: ['expenses', user?.id] });
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense. Please try again.');
    }
  };

  // CRUD handlers for income
  const handleAddIncome = async (incomeItem: Omit<Income, 'id'>) => {
    try {
      await db.addIncome(incomeItem);
      queryClient.invalidateQueries({ queryKey: ['income', user?.id] });
    } catch (error) {
      console.error('Error adding income:', error);
      toast.error('Failed to add income. Please try again.');
    }
  };

  const handleUpdateIncome = async (id: string, updates: Partial<Income>) => {
    try {
      await db.updateIncome(id, updates);
      queryClient.invalidateQueries({ queryKey: ['income', user?.id] });
    } catch (error) {
      console.error('Error updating income:', error);
      toast.error('Failed to update income. Please try again.');
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await db.deleteIncome(id);
      queryClient.invalidateQueries({ queryKey: ['income', user?.id] });
    } catch (error) {
      console.error('Error deleting income:', error);
      toast.error('Failed to delete income. Please try again.');
    }
  };

  // CRUD handlers for tasks
  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    try {
      await db.addTask(task);
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Failed to add task. Please try again.');
    }
  };

  const handleUpdateTask = async (id: string, updates: Partial<Task>) => {
    try {
      await db.updateTask(id, updates);
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task. Please try again.');
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await db.deleteTask(id);
      queryClient.invalidateQueries({ queryKey: ['tasks', user?.id] });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task. Please try again.');
    }
  };

  const handleAddInventory = async (item: Omit<InventoryItem, 'id'>) => {
    try {
      await db.addInventoryItem(item);
      queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] });
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast.error('Failed to add inventory item. Please try again.');
    }
  };

  const handleUpdateInventory = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      await db.updateInventoryItem(id, updates);
      queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast.error('Failed to update inventory item. Please try again.');
    }
  };

  const handleDeleteInventory = async (id: string) => {
    try {
      await db.deleteInventoryItem(id);
      queryClient.invalidateQueries({ queryKey: ['inventory', user?.id] });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast.error('Failed to delete inventory item. Please try again.');
    }
  };

  const handleAddStorageBin = async (bin: Omit<StorageBin, 'id'>) => {
    try {
      await db.addStorageBin(bin);
      queryClient.invalidateQueries({ queryKey: ['storage_bins', user?.id] });
    } catch (error) {
      console.error('Error adding storage bin:', error);
      toast.error('Failed to add storage bin. Please try again.');
    }
  };

  const handleUpdateStorageBin = async (id: string, updates: Partial<StorageBin>) => {
    try {
      await db.updateStorageBin(id, updates);
      queryClient.invalidateQueries({ queryKey: ['storage_bins', user?.id] });
    } catch (error) {
      console.error('Error updating storage bin:', error);
      toast.error('Failed to update storage bin. Please try again.');
    }
  };

  const handleDeleteStorageBin = async (id: string) => {
    try {
      await db.deleteStorageBin(id);
      queryClient.invalidateQueries({ queryKey: ['storage_bins', user?.id] });
    } catch (error) {
      console.error('Error deleting storage bin:', error);
      toast.error('Failed to delete storage bin. Please try again.');
    }
  };

  const navigationItems = [
    { id: 'dashboard' as Tab, label: t('navigation.dashboard'), icon: LayoutDashboard },
    { id: 'calendar' as Tab, label: t('navigation.calendar', 'Calendar'), icon: Calendar },
    { id: 'fields' as Tab, label: t('navigation.fields'), icon: Sprout },
    { id: 'expenses' as Tab, label: t('navigation.expenses'), icon: DollarSign },
    { id: 'income' as Tab, label: t('navigation.income'), icon: TrendingUp },
    { id: 'tasks' as Tab, label: t('navigation.tasks'), icon: CheckSquare },
    { id: 'inventory' as Tab, label: 'Inventory', icon: Package },
    { id: 'storage' as Tab, label: 'Storage', icon: Warehouse },
    { id: 'analytics' as Tab, label: 'Analytics', icon: BarChart3 },
    { id: 'marketplace' as Tab, label: 'Marketplace', icon: ShoppingCart },
    { id: 'rewards' as Tab, label: t('navigation.rewards', 'Rewards'), icon: Trophy },
    { id: 'missions' as Tab, label: t('navigation.missions', 'Missions'), icon: Target },
    { id: 'challenges' as Tab, label: t('navigation.challenges', 'Challenges'), icon: Zap },
    { id: 'shop' as Tab, label: t('navigation.shop', 'Shop'), icon: Gift },
    { id: 'referrals' as Tab, label: t('navigation.referrals', 'Referrals'), icon: UserPlus },
    { id: 'learning' as Tab, label: t('navigation.learning', 'Learning'), icon: GraduationCap },
    { id: 'pestcontrol' as Tab, label: t('navigation.pest'), icon: Bug },
    { id: 'aichat' as Tab, label: t('navigation.chat'), icon: MessageCircle },
    { id: 'knowledge' as Tab, label: t('navigation.knowledge'), icon: BookOpen },
    { id: 'community' as Tab, label: t('navigation.community'), icon: Users },
    { id: 'messages' as Tab, label: t('navigation.messages'), icon: Mail },
    { id: 'weather' as Tab, label: t('weather.title'), icon: CloudSun },
    { id: 'markets' as Tab, label: t('market.title'), icon: TrendingUp },
    { id: 'settings' as Tab, label: t('navigation.settings'), icon: SettingsIcon },
  ];

  // Voice descriptions for navigation items
  const getNavVoiceLabel = (id: Tab, label: string): string => {
    const voiceKeys: Record<Tab, string> = {
      dashboard: 'navigation.dashboardVoice',
      calendar: 'navigation.calendarVoice',
      fields: 'navigation.fieldsVoice',
      expenses: 'navigation.expensesVoice',
      income: 'navigation.incomeVoice',
      tasks: 'navigation.tasksVoice',
      inventory: 'navigation.inventoryVoice',
      storage: 'navigation.storageVoice',
      analytics: 'navigation.analyticsVoice',
      marketplace: 'navigation.marketplaceVoice',
      rewards: 'navigation.rewardsVoice',
      missions: 'navigation.missionsVoice',
      challenges: 'navigation.challengesVoice',
      shop: 'navigation.shopVoice',
      referrals: 'navigation.referralsVoice',
      learning: 'navigation.learningVoice',
      pestcontrol: 'navigation.pestVoice',
      aichat: 'navigation.chatVoice',
      knowledge: 'navigation.knowledgeVoice',
      community: 'navigation.communityVoice',
      messages: 'navigation.messagesVoice',
      settings: 'navigation.settingsVoice',
      weather: 'navigation.weatherVoice',
      markets: 'navigation.marketsVoice',
    };
    return t(voiceKeys[id], `${label}. Click to navigate.`);
  };

  const renderContent = () => {
    const isReadOnly = !user;

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard stats={dashboardStats} expenses={expenses} income={income} fields={fields} tasks={tasks} onNavigate={(tab) => setActiveTab(tab as Tab)} />;
      case 'fields':
        return (
          <FieldsManager
            fields={fields}
            onAddField={handleAddField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            readOnly={isReadOnly}
            onRequestAuth={() => setShowAuthModal(true)}
          />
        );
      case 'expenses':
        return (
          <ExpenseTracker
            expenses={expenses}
            fields={fields}
            onAddExpense={handleAddExpense}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        );
      case 'income':
        return (
          <IncomeTracker
            income={income}
            fields={fields}
            onAddIncome={handleAddIncome}
            onUpdateIncome={handleUpdateIncome}
            onDeleteIncome={handleDeleteIncome}
          />
        );
      case 'tasks':
        return (
          <TaskManager
            tasks={tasks}
            fields={fields}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        );
      case 'inventory':
        return (
          <InventoryManager
            inventory={inventory}
            onAddItem={handleAddInventory}
            onUpdateItem={handleUpdateInventory}
            onDeleteItem={handleDeleteInventory}
          />
        );
      case 'storage':
        return (
          <StorageBinManager
            bins={storageBins}
            onAddBin={handleAddStorageBin}
            onUpdateBin={handleUpdateStorageBin}
            onDeleteBin={handleDeleteStorageBin}
          />
        );
      case 'pestcontrol':
        return <PestControl />;
      case 'aichat':
        return <FarmingChat />;
      case 'knowledge':
        return <Knowledge />;
      case 'community':
        return <Community />;
      case 'messages':
        return <Messages />;
      case 'marketplace':
        return <Marketplace onAddIncome={handleAddIncome} />;
      case 'analytics':
        return <Analytics fields={fields} expenses={expenses} income={income} />;
      case 'rewards':
        return <RewardsOverview userId={user?.id} onNavigate={(tab) => setActiveTab(tab as Tab)} />;
      case 'missions':
        return (
          <MissionHub
            userId={user?.id}
            userFields={fields.map(f => ({ id: f.id, name: f.name, cropType: f.cropType }))}
          />
        );
      case 'challenges':
        return <WeeklyChallenges userId={user?.id} />;
      case 'shop':
        return <RewardsShop userId={user?.id} />;
      case 'referrals':
        return <ReferralDashboard userId={user?.id} />;
      case 'learning':
        return <LearningProgress userId={user?.id} />;
      case 'calendar':
        return (
          <FarmCalendar
            fields={fields}
            tasks={tasks}
            onEventClick={(event) => {
              // Navigate to the relevant section based on event type
              if (event.type === 'task') {
                setActiveTab('tasks');
              } else if (event.type === 'planting' || event.type === 'harvest') {
                setActiveTab('fields');
              }
            }}
            onAddTask={handleAddTask}
          />
        );
      case 'settings':
        return <Settings />;
      case 'weather':
        return weatherData ? (
          <Weather
            weather={weatherData}
            location={farmLocation}
            onRefresh={async () => {
              const savedSettings = localStorage.getItem('farmSettings');
              let lat, lon;
              if (savedSettings) {
                try {
                  const settings = JSON.parse(savedSettings);
                  lat = settings.latitude;
                  lon = settings.longitude;
                } catch (error) {
                  console.error('Error parsing settings:', error);
                }
              }
              const weather = await getWeatherData(lat, lon);
              setWeatherData(weather);
              localStorage.setItem('weatherData', JSON.stringify(weather));
            }}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading weather data...</p>
          </div>
        );
      case 'markets':
        return <Markets
          prices={marketPrices}
          onRefresh={async () => {
            const markets = await getMarketData();
            setMarketPrices(markets);
          }}
        />;
      default:
        return <Dashboard stats={dashboardStats} expenses={expenses} income={income} onNavigate={(tab) => setActiveTab(tab as Tab)} />;
    }
  };

  // Show loading screen while auth is initializing
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Toast Notifications */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          error: {
            style: {
              background: '#ef4444',
              color: '#fff',
            },
          },
          success: {
            style: {
              background: '#22c55e',
              color: '#fff',
            },
          },
        }}
      />
      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 fixed h-full" role="navigation" aria-label="Main navigation">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
              <Sprout className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('app.name')}</h1>
              <p className="text-xs text-gray-600">{t('app.tagline')}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto" aria-label="Primary navigation menu">
          {navigationItems.map((item) => (
            <TalkingButton
              key={item.id}
              voiceLabel={getNavVoiceLabel(item.id, item.label)}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                activeTab === item.id
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </TalkingButton>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200">
          {user ? (
            <>
              <div className="mb-3 px-2">
                <p className="text-sm font-medium text-gray-700">{user.email}</p>
                <p className="text-xs text-gray-500">Logged in</p>
              </div>
              <TalkingButton
                voiceLabel="Sign Out. Click to log out of your account."
                onClick={signOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                <span className="text-sm font-medium">{t('settings.logout')}</span>
              </TalkingButton>
            </>
          ) : (
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm font-medium text-amber-900 mb-1">View Only Mode</p>
              <p className="text-xs text-amber-700 mb-3">Sign in to add or edit data</p>
              <TalkingButton
                voiceLabel="Sign In. Click to log in and start managing your farm data."
                onClick={() => setShowAuthModal(true)}
                className="w-full px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                {t('auth.signIn')}
              </TalkingButton>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Desktop Header Bar */}
        <div className="hidden lg:flex items-center justify-end gap-3 p-4 bg-white border-b border-gray-200 sticky top-0 z-40">
          <NotificationsPanel
            tasks={tasks}
            weatherData={weatherData}
          />
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user.email}</p>
                <p className="text-xs text-gray-500">Logged in</p>
              </div>
              <TalkingButton
                voiceLabel="Sign Out. Click to log out of your account."
                onClick={signOut}
                className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
              >
                {t('settings.logout')}
              </TalkingButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <TalkingButton
                voiceLabel="Sign In. Click to log in to your existing account."
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                {t('auth.signIn')}
              </TalkingButton>
              <TalkingButton
                voiceLabel="Sign Up. Click to create a new account and start managing your farm."
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                {t('auth.signUp')}
              </TalkingButton>
            </div>
          )}
        </div>

        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-40" role="banner" aria-label="Mobile header">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Sprout className="text-white" size={20} />
              </div>
              <h1 className="text-lg font-bold text-gray-900">{t('app.name')}</h1>
            </div>
            <div className="flex items-center gap-2">
              {!user && (
                <TalkingButton
                  voiceLabel="Sign In. Click to log in and start managing your farm data."
                  onClick={() => setShowAuthModal(true)}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  {t('auth.signIn')}
                </TalkingButton>
              )}
              <NotificationsPanel
                tasks={tasks}
                weatherData={weatherData}
              />
              <TalkingButton
                voiceLabel={isMobileMenuOpen ? "Close Menu. Click to hide the navigation menu." : "Open Menu. Click to show the navigation menu."}
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </TalkingButton>
            </div>
          </div>

          {/* Mobile Menu */}
          {isMobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-2"
              role="navigation"
              aria-label="Mobile navigation menu"
            >
              {navigationItems.map((item) => (
                <TalkingButton
                  key={item.id}
                  voiceLabel={getNavVoiceLabel(item.id, item.label)}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === item.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </TalkingButton>
              ))}
            </motion.nav>
          )}
        </header>

        {/* Voice Assistant Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 text-white cursor-pointer hover:from-green-700 hover:via-emerald-700 hover:to-teal-700 transition-all"
          onClick={() => setIsVoiceAssistantOpen(true)}
          role="button"
          tabIndex={0}
          aria-label="Open voice assistant. Tap to speak commands like Add expense 5000 for seeds"
          onKeyDown={(e) => e.key === 'Enter' && setIsVoiceAssistantOpen(true)}
        >
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Mic size={20} />
              </div>
              <div>
                <p className="font-semibold text-sm sm:text-base">Voice Assistant</p>
                <p className="text-xs sm:text-sm text-white/80">Tap to speak commands like "Add expense 5000 for seeds"</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-sm text-white/80">Tap to start</span>
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                <Mic size={16} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Page Content */}
        <main className="p-6 lg:p-8" role="main" aria-label="Page content">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Suspense fallback={<PageLoader />}>
              {renderContent()}
            </Suspense>
          </motion.div>
        </main>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAuthModal(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to AgroAfrica"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md"
            >
              <Suspense fallback={<PageLoader />}>
                <Auth
                  onAuthSuccess={() => {
                    setShowAuthModal(false);
                    // React Query will automatically load data when user becomes available
                  }}
                />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Voice Control */}
      <VoiceControl />

      {/* Voice Assistant Modal */}
      <Suspense fallback={null}>
        <VoiceAssistant
          isOpen={isVoiceAssistantOpen}
          onClose={() => setIsVoiceAssistantOpen(false)}
          userId={user?.id}
        />
      </Suspense>
    </div>
  );
}

// Wrap App with ErrorBoundary and XPToastProvider
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <XPToastProvider>
        <App />
      </XPToastProvider>
    </ErrorBoundary>
  );
}

export default AppWithErrorBoundary;
