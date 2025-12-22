import {
  LayoutDashboard,
  Sprout,
  DollarSign,
  CloudSun,
  TrendingUp,
  CheckSquare,
  Settings as SettingsIcon,
  Bug,
  MessageCircle,
  Users,
  Mail,
  BookOpen,
  ShoppingCart,
  BarChart3,
  Calendar,
  Package,
  Warehouse,
  Trophy,
  GraduationCap,
  Target,
  Zap,
  Gift,
  UserPlus,
  Camera,
  UsersRound,
  BookImage,
  type LucideIcon,
} from 'lucide-react';
import type { Tab } from '../store/uiStore';

export interface NavigationItem {
  id: Tab;
  labelKey: string;
  labelDefault: string;
  icon: LucideIcon;
  category: NavigationCategory;
}

export type NavigationCategory =
  | 'home'
  | 'farm'
  | 'money'
  | 'market'
  | 'learn'
  | 'rewards'
  | 'settings';

export interface NavigationCategoryConfig {
  id: NavigationCategory;
  labelKey: string;
  labelDefault: string;
  icon: LucideIcon;
  color: string;
}

// Category definitions for grouped navigation
export const navigationCategories: NavigationCategoryConfig[] = [
  { id: 'home', labelKey: 'navigation.home', labelDefault: 'Home', icon: LayoutDashboard, color: 'blue' },
  { id: 'farm', labelKey: 'navigation.myFarm', labelDefault: 'My Farm', icon: Sprout, color: 'green' },
  { id: 'money', labelKey: 'navigation.money', labelDefault: 'Money', icon: DollarSign, color: 'amber' },
  { id: 'market', labelKey: 'navigation.market', labelDefault: 'Market', icon: ShoppingCart, color: 'purple' },
  { id: 'learn', labelKey: 'navigation.learn', labelDefault: 'Learn', icon: BookOpen, color: 'cyan' },
  { id: 'rewards', labelKey: 'navigation.rewardsCategory', labelDefault: 'Rewards', icon: Trophy, color: 'orange' },
  { id: 'settings', labelKey: 'navigation.settings', labelDefault: 'Settings', icon: SettingsIcon, color: 'gray' },
];

// All navigation items with their categories
export const navigationItems: NavigationItem[] = [
  // Home category
  { id: 'dashboard', labelKey: 'navigation.dashboard', labelDefault: 'Dashboard', icon: LayoutDashboard, category: 'home' },
  { id: 'calendar', labelKey: 'navigation.calendar', labelDefault: 'Calendar', icon: Calendar, category: 'home' },

  // My Farm category
  { id: 'fields', labelKey: 'navigation.fields', labelDefault: 'Fields', icon: Sprout, category: 'farm' },
  { id: 'tasks', labelKey: 'navigation.tasks', labelDefault: 'Tasks', icon: CheckSquare, category: 'farm' },
  { id: 'inventory', labelKey: 'navigation.inventory', labelDefault: 'Inventory', icon: Package, category: 'farm' },
  { id: 'storage', labelKey: 'navigation.storage', labelDefault: 'Storage', icon: Warehouse, category: 'farm' },

  // Money category
  { id: 'expenses', labelKey: 'navigation.expenses', labelDefault: 'Expenses', icon: DollarSign, category: 'money' },
  { id: 'income', labelKey: 'navigation.income', labelDefault: 'Income', icon: TrendingUp, category: 'money' },
  { id: 'analytics', labelKey: 'navigation.analytics', labelDefault: 'Analytics', icon: BarChart3, category: 'money' },

  // Market category
  { id: 'marketplace', labelKey: 'navigation.marketplace', labelDefault: 'Marketplace', icon: ShoppingCart, category: 'market' },
  { id: 'markets', labelKey: 'market.title', labelDefault: 'Prices', icon: TrendingUp, category: 'market' },

  // Learn category
  { id: 'knowledge', labelKey: 'navigation.knowledge', labelDefault: 'Knowledge', icon: BookOpen, category: 'learn' },
  { id: 'aichat', labelKey: 'navigation.chat', labelDefault: 'AI Chat', icon: MessageCircle, category: 'learn' },
  { id: 'pestcontrol', labelKey: 'navigation.pest', labelDefault: 'Pest Control', icon: Bug, category: 'learn' },
  { id: 'weather', labelKey: 'weather.title', labelDefault: 'Weather', icon: CloudSun, category: 'learn' },
  { id: 'learning', labelKey: 'navigation.learning', labelDefault: 'Learning', icon: GraduationCap, category: 'learn' },
  { id: 'community', labelKey: 'navigation.community', labelDefault: 'Community', icon: Users, category: 'learn' },
  { id: 'messages', labelKey: 'navigation.messages', labelDefault: 'Messages', icon: Mail, category: 'learn' },

  // Rewards category
  { id: 'rewards', labelKey: 'navigation.rewards', labelDefault: 'Rewards', icon: Trophy, category: 'rewards' },
  { id: 'missions', labelKey: 'navigation.missions', labelDefault: 'Missions', icon: Target, category: 'rewards' },
  { id: 'challenges', labelKey: 'navigation.challenges', labelDefault: 'Challenges', icon: Zap, category: 'rewards' },
  { id: 'photo-challenges', labelKey: 'navigation.photoChallenges', labelDefault: 'Photo Challenges', icon: Camera, category: 'rewards' },
  { id: 'shop', labelKey: 'navigation.shop', labelDefault: 'Shop', icon: Gift, category: 'rewards' },
  { id: 'referrals', labelKey: 'navigation.referrals', labelDefault: 'Referrals', icon: UserPlus, category: 'rewards' },
  { id: 'teams', labelKey: 'navigation.teams', labelDefault: 'Teams', icon: UsersRound, category: 'rewards' },
  { id: 'story-quests', labelKey: 'navigation.storyQuests', labelDefault: 'Story Quests', icon: BookImage, category: 'rewards' },

  // Settings category
  { id: 'settings', labelKey: 'navigation.settings', labelDefault: 'Settings', icon: SettingsIcon, category: 'settings' },
];

// Get items by category
export function getNavigationItemsByCategory(category: NavigationCategory): NavigationItem[] {
  return navigationItems.filter(item => item.category === category);
}

// Voice label keys for each navigation item
export const voiceLabelKeys: Record<Tab, string> = {
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
  'photo-challenges': 'navigation.photoChallengesVoice',
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
  teams: 'navigation.teamsVoice',
  'story-quests': 'navigation.storyQuestsVoice',
};
