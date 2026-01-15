import { useState, useEffect, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { useUIStore } from './store/uiStore';
import { useFields, useExpenses, useIncome, useTasks, useInventory } from './hooks/useSupabaseData';
import { useRealtimeSubscriptions } from './hooks/useRealtimeSubscriptions';
import { useWeatherData, useMarketData } from './hooks/useWeatherAndMarket';
import { useUpdateStreak } from './hooks/useRewards';
import { useRecordActivity } from './hooks/useStreak';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';
import { Onboarding, isOnboardingComplete } from './components/onboarding';

// Layout components
import { Sidebar, MobileHeader, VoiceBanner } from './components/layout';
import NotificationsPanel from './components/NotificationsPanel';
import VoiceControl from './components/VoiceControl';
import TalkingButton from './components/TalkingButton';
import OfflineIndicator from './components/OfflineIndicator';
import { XPToastProvider } from './components/rewards/XPToast';
import MicroWinToast from './components/micro-wins/MicroWinToast';
import RouteContent from './routes/RouteContent';

// Lazy load modal components
const Auth = lazy(() => import('./components/Auth'));
const VoiceAssistant = lazy(() => import('./components/VoiceAssistant'));

import type { DashboardStats } from './types';

function App() {
  const { t } = useTranslation();
  const { user, loading: authLoading, signOut } = useAuth();
  const { activeTab, isLoading, setIsLoading, showAuthModal, setShowAuthModal, farmLocation } = useUIStore();

  // Data hooks
  const { data: fields = [] } = useFields(user?.id);
  const { data: expenses = [] } = useExpenses(user?.id);
  const { data: income = [] } = useIncome(user?.id);
  const { data: tasks = [] } = useTasks(user?.id);
  const { data: inventory = [] } = useInventory(user?.id);
  const { weatherData, refresh: refreshWeather } = useWeatherData();
  const { marketPrices, refresh: refreshMarkets } = useMarketData();

  // Setup realtime subscriptions
  useRealtimeSubscriptions(user);

  // Voice assistant state
  const [isVoiceAssistantOpen, setIsVoiceAssistantOpen] = useState(false);

  // Onboarding state
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingComplete());

  // Streak update
  const updateStreak = useUpdateStreak();
  const recordActivity = useRecordActivity();

  useEffect(() => {
    if (!authLoading) setIsLoading(false);
  }, [authLoading, setIsLoading]);

  useEffect(() => {
    if (user?.id && !authLoading) {
      updateStreak.mutate(user.id);
      // Record app_open activity for enhanced streak tracking
      recordActivity.mutate({
        userId: user.id,
        activityType: 'app_open',
        activityName: 'Opened App',
        activityNameSw: 'Kufungua Programu',
      });
    }
  }, [user?.id, authLoading]);

  // Calculate dashboard stats
  const dashboardStats: DashboardStats = {
    totalFields: fields.length,
    activeFields: fields.filter(f => f.status === 'growing' || f.status === 'planted').length,
    totalArea: fields.reduce((sum, f) => sum + f.area, 0),
    monthlyExpenses: expenses.reduce((sum, e) => sum + e.amount, 0),
    estimatedRevenue: income.reduce((sum, i) => sum + i.amount, 0),
    expenseChange: 12.5,
  };

  // Loading screen
  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (showOnboarding) {
    return <Onboarding onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#363636', color: '#fff' } }} />
      <MicroWinToast />
      <OfflineIndicator />

      {/* Desktop Sidebar */}
      <Sidebar onRequestAuth={() => setShowAuthModal(true)} />

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Desktop Header */}
        <div className="hidden lg:flex items-center justify-end gap-3 p-4 bg-white border-b border-gray-200 sticky top-0 z-40">
          <NotificationsPanel tasks={tasks} weatherData={weatherData} />
          {user ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">{user.email}</p>
                <p className="text-xs text-gray-500">Logged in</p>
              </div>
              <TalkingButton voiceLabel="Sign Out" onClick={signOut} className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium min-h-[44px]">
                {t('settings.logout')}
              </TalkingButton>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <TalkingButton voiceLabel="Sign In" onClick={() => setShowAuthModal(true)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg font-medium min-h-[44px]">
                {t('auth.signIn')}
              </TalkingButton>
              <TalkingButton voiceLabel="Sign Up" onClick={() => setShowAuthModal(true)} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium min-h-[44px]">
                {t('auth.signUp')}
              </TalkingButton>
            </div>
          )}
        </div>

        {/* Mobile Header */}
        <MobileHeader tasks={tasks} weatherData={weatherData} onRequestAuth={() => setShowAuthModal(true)} />

        {/* Voice Banner */}
        <VoiceBanner onOpenAssistant={() => setIsVoiceAssistantOpen(true)} />

        {/* Page Content */}
        <main className="p-6 lg:p-8" role="main">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
            <RouteContent
              userId={user?.id}
              fields={fields}
              expenses={expenses}
              income={income}
              tasks={tasks}
              inventory={inventory}
              weatherData={weatherData}
              marketPrices={marketPrices}
              farmLocation={farmLocation}
              dashboardStats={dashboardStats}
              onRefreshWeather={refreshWeather}
              onRefreshMarkets={refreshMarkets}
              onRequestAuth={() => setShowAuthModal(true)}
            />
          </motion.div>
        </main>
      </div>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowAuthModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md">
              <Suspense fallback={<Loader className="animate-spin text-white" />}>
                <Auth onAuthSuccess={() => setShowAuthModal(false)} />
              </Suspense>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Voice Control */}
      <VoiceControl />

      {/* Voice Assistant Modal */}
      <Suspense fallback={null}>
        <VoiceAssistant isOpen={isVoiceAssistantOpen} onClose={() => setIsVoiceAssistantOpen(false)} userId={user?.id} />
      </Suspense>
    </div>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <XPToastProvider>
        <App />
      </XPToastProvider>
    </ErrorBoundary>
  );
}
