import { lazy, Suspense } from 'react';
import { Loader, AlertTriangle, RefreshCw } from 'lucide-react';
import { useUIStore, type Tab } from '../store/uiStore';
import { useFarmOperations } from '../hooks/useFarmOperations';
import ErrorBoundary from '../components/ErrorBoundary';
import type {
  Field,
  Expense,
  Income,
  Task,
  InventoryItem,
  StorageBin,
  WeatherData,
  MarketPrice,
  DashboardStats,
} from '../types';

// Lazy load all page components
const Dashboard = lazy(() => import('../components/Dashboard'));
const Weather = lazy(() => import('../components/Weather'));
const Markets = lazy(() => import('../components/Markets'));
const FieldsManager = lazy(() => import('../components/FieldsManager'));
const ExpenseTracker = lazy(() => import('../components/ExpenseTracker'));
const IncomeTracker = lazy(() => import('../components/IncomeTracker'));
const TaskManager = lazy(() => import('../components/TaskManager'));
const Settings = lazy(() => import('../components/Settings'));
const PestControl = lazy(() => import('../components/PestControl'));
const FarmingChat = lazy(() => import('../components/FarmingChat'));
const Community = lazy(() => import('../components/Community'));
const Messages = lazy(() => import('../components/Messages'));
const Knowledge = lazy(() => import('../components/Knowledge'));
const Marketplace = lazy(() => import('../components/Marketplace'));
const Analytics = lazy(() => import('../components/Analytics'));
const FarmCalendar = lazy(() => import('../components/FarmCalendar'));
const InventoryManager = lazy(() => import('../components/InventoryManager'));
const StorageBinManager = lazy(() => import('../components/StorageBinManager'));
const RewardsOverview = lazy(() => import('../components/rewards/RewardsOverview'));
const LearningProgress = lazy(() => import('../components/learning/LearningProgress'));
const MissionHub = lazy(() => import('../components/missions/MissionHub'));
const WeeklyChallenges = lazy(() => import('../components/challenges/WeeklyChallenges'));
const PhotoChallenges = lazy(() => import('../components/challenges/PhotoChallenges'));
const RewardsShop = lazy(() => import('../components/shop/RewardsShop'));
const ReferralDashboard = lazy(() => import('../components/referrals/ReferralDashboard'));
const TeamDashboard = lazy(() => import('../components/teams/TeamDashboard'));
const StoryQuestsDashboard = lazy(() => import('../components/story-quests/StoryQuestsDashboard'));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader className="animate-spin text-green-600 mx-auto mb-3" size={32} />
        <p className="text-gray-500">Loading...</p>
      </div>
    </div>
  );
}

// Section-level error fallback (less intrusive than full page error)
function SectionErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 m-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <AlertTriangle className="text-red-500" size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-800 mb-1">
            Something went wrong
          </h3>
          <p className="text-red-600 text-sm mb-4">
            This section couldn't load properly. You can try again or navigate to another section.
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}

interface RouteContentProps {
  userId?: string;
  fields: Field[];
  expenses: Expense[];
  income: Income[];
  tasks: Task[];
  inventory: InventoryItem[];
  storageBins: StorageBin[];
  weatherData: WeatherData | null;
  marketPrices: MarketPrice[];
  farmLocation: string;
  dashboardStats: DashboardStats;
  onRefreshWeather: () => Promise<void>;
  onRefreshMarkets: () => Promise<void>;
  onRequestAuth: () => void;
}

export default function RouteContent({
  userId,
  fields,
  expenses,
  income,
  tasks,
  inventory,
  storageBins,
  weatherData,
  marketPrices,
  farmLocation,
  dashboardStats,
  onRefreshWeather,
  onRefreshMarkets,
  onRequestAuth,
}: RouteContentProps) {
  const { activeTab, setActiveTab } = useUIStore();
  const operations = useFarmOperations();

  const isReadOnly = !userId;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            stats={dashboardStats}
            expenses={expenses}
            income={income}
            fields={fields}
            tasks={tasks}
            onNavigate={(tab) => setActiveTab(tab as Tab)}
          />
        );

      case 'fields':
        return (
          <FieldsManager
            fields={fields}
            onAddField={operations.addField}
            onUpdateField={operations.updateField}
            onDeleteField={operations.deleteField}
            onAddInventory={operations.addInventory}
            readOnly={isReadOnly}
            onRequestAuth={onRequestAuth}
          />
        );

      case 'expenses':
        return (
          <ExpenseTracker
            expenses={expenses}
            fields={fields}
            userId={userId}
            onAddExpense={operations.addExpense}
            onUpdateExpense={operations.updateExpense}
            onDeleteExpense={operations.deleteExpense}
          />
        );

      case 'income':
        return (
          <IncomeTracker
            income={income}
            fields={fields}
            userId={userId}
            onAddIncome={operations.addIncome}
            onUpdateIncome={operations.updateIncome}
            onDeleteIncome={operations.deleteIncome}
          />
        );

      case 'tasks':
        return (
          <TaskManager
            tasks={tasks}
            fields={fields}
            userId={userId}
            onAddTask={operations.addTask}
            onUpdateTask={operations.updateTask}
            onDeleteTask={operations.deleteTask}
          />
        );

      case 'inventory':
        return (
          <InventoryManager
            inventory={inventory}
            onAddItem={operations.addInventory}
            onUpdateItem={operations.updateInventory}
            onDeleteItem={operations.deleteInventory}
          />
        );

      case 'storage':
        return (
          <StorageBinManager
            bins={storageBins}
            onAddBin={operations.addStorageBin}
            onUpdateBin={operations.updateStorageBin}
            onDeleteBin={operations.deleteStorageBin}
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
        return <Marketplace onAddIncome={operations.addIncome} />;

      case 'analytics':
        return <Analytics fields={fields} expenses={expenses} income={income} />;

      case 'rewards':
        return (
          <RewardsOverview
            userId={userId}
            onNavigate={(tab) => setActiveTab(tab as Tab)}
          />
        );

      case 'missions':
        return (
          <MissionHub
            userId={userId}
            userFields={fields.map((f) => ({
              id: f.id,
              name: f.name,
              cropType: f.cropType,
            }))}
          />
        );

      case 'challenges':
        return <WeeklyChallenges userId={userId} />;

      case 'photo-challenges':
        return <PhotoChallenges userId={userId} />;

      case 'shop':
        return <RewardsShop userId={userId} />;

      case 'referrals':
        return <ReferralDashboard userId={userId} />;

      case 'teams':
        return <TeamDashboard userId={userId} />;

      case 'story-quests':
        return <StoryQuestsDashboard userId={userId || ''} />;

      case 'learning':
        return <LearningProgress userId={userId} />;

      case 'calendar':
        return (
          <FarmCalendar
            fields={fields}
            tasks={tasks}
            onEventClick={(event) => {
              if (event.type === 'task') {
                setActiveTab('tasks');
              } else if (event.type === 'planting' || event.type === 'harvest') {
                setActiveTab('fields');
              }
            }}
            onAddTask={operations.addTask}
          />
        );

      case 'settings':
        return <Settings />;

      case 'weather':
        return weatherData ? (
          <Weather
            weather={weatherData}
            location={farmLocation}
            onRefresh={onRefreshWeather}
            userId={userId}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading weather data...</p>
          </div>
        );

      case 'markets':
        return <Markets prices={marketPrices} onRefresh={onRefreshMarkets} userId={userId} />;

      default:
        return (
          <Dashboard
            stats={dashboardStats}
            expenses={expenses}
            income={income}
            onNavigate={(tab) => setActiveTab(tab as Tab)}
          />
        );
    }
  };

  return (
    <ErrorBoundary
      fallback={<SectionErrorFallback onRetry={() => window.location.reload()} />}
    >
      <Suspense fallback={<PageLoader />}>{renderContent()}</Suspense>
    </ErrorBoundary>
  );
}
