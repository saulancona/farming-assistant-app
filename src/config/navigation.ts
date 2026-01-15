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
  Trophy,
  GraduationCap,
  Target,
  Zap,
  Gift,
  UserPlus,
  UsersRound,
  BookImage,
  Wheat,
  Calculator,
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
  | 'community'
  | 'rewards';

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
  { id: 'community', labelKey: 'navigation.communityCategory', labelDefault: 'Community', icon: Users, color: 'indigo' },
  { id: 'rewards', labelKey: 'navigation.rewardsCategory', labelDefault: 'Rewards', icon: Trophy, color: 'orange' },
];

// All navigation items with their categories
export const navigationItems: NavigationItem[] = [
  // Home category
  { id: 'dashboard', labelKey: 'navigation.dashboard', labelDefault: 'Dashboard', icon: LayoutDashboard, category: 'home' },
  { id: 'calendar', labelKey: 'navigation.calendar', labelDefault: 'Calendar', icon: Calendar, category: 'home' },

  // My Farm category
  { id: 'fields', labelKey: 'navigation.fields', labelDefault: 'Fields', icon: Sprout, category: 'farm' },
  { id: 'harvests', labelKey: 'navigation.harvests', labelDefault: 'Harvests', icon: Wheat, category: 'farm' },
  { id: 'tasks', labelKey: 'navigation.tasks', labelDefault: 'Tasks', icon: CheckSquare, category: 'farm' },
  { id: 'inventory', labelKey: 'navigation.inventory', labelDefault: 'Inventory', icon: Package, category: 'farm' },
  { id: 'pestcontrol', labelKey: 'navigation.pest', labelDefault: 'Pest Control', icon: Bug, category: 'farm' },

  // Money category
  { id: 'costs', labelKey: 'navigation.costs', labelDefault: 'Cost Calculator', icon: Calculator, category: 'money' },
  { id: 'expenses', labelKey: 'navigation.expenses', labelDefault: 'Expenses', icon: DollarSign, category: 'money' },
  { id: 'income', labelKey: 'navigation.income', labelDefault: 'Income', icon: TrendingUp, category: 'money' },
  { id: 'analytics', labelKey: 'navigation.analytics', labelDefault: 'Analytics', icon: BarChart3, category: 'money' },

  // Market category
  { id: 'marketplace', labelKey: 'navigation.marketplace', labelDefault: 'Marketplace', icon: ShoppingCart, category: 'market' },
  { id: 'markets', labelKey: 'market.title', labelDefault: 'Prices', icon: TrendingUp, category: 'market' },

  // Learn category
  { id: 'knowledge', labelKey: 'navigation.knowledge', labelDefault: 'Knowledge', icon: BookOpen, category: 'learn' },
  { id: 'aichat', labelKey: 'navigation.chat', labelDefault: 'AI Chat', icon: MessageCircle, category: 'learn' },
  { id: 'learning', labelKey: 'navigation.learning', labelDefault: 'Learning', icon: GraduationCap, category: 'learn' },

  // Community category
  { id: 'community', labelKey: 'navigation.community', labelDefault: 'Community', icon: Users, category: 'community' },
  { id: 'messages', labelKey: 'navigation.messages', labelDefault: 'Messages', icon: Mail, category: 'community' },
  { id: 'referrals', labelKey: 'navigation.referrals', labelDefault: 'Referrals', icon: UserPlus, category: 'community' },
  { id: 'teams', labelKey: 'navigation.teams', labelDefault: 'Teams', icon: UsersRound, category: 'community' },

  // Rewards category
  { id: 'rewards', labelKey: 'navigation.rewards', labelDefault: 'Rewards', icon: Trophy, category: 'rewards' },
  { id: 'missions', labelKey: 'navigation.missions', labelDefault: 'Missions', icon: Target, category: 'rewards' },
  { id: 'challenges', labelKey: 'navigation.challenges', labelDefault: 'Challenges', icon: Zap, category: 'rewards' },
  { id: 'shop', labelKey: 'navigation.shop', labelDefault: 'Shop', icon: Gift, category: 'rewards' },
  { id: 'story-quests', labelKey: 'navigation.storyQuests', labelDefault: 'Story Quests', icon: BookImage, category: 'rewards' },
];

// Get items by category
export function getNavigationItemsByCategory(category: NavigationCategory): NavigationItem[] {
  return navigationItems.filter(item => item.category === category);
}

// Standalone bottom navigation items (no dropdown)
export interface StandaloneNavItem {
  id: Tab;
  labelKey: string;
  labelDefault: string;
  icon: LucideIcon;
}

export const standaloneBottomItems: StandaloneNavItem[] = [
  { id: 'weather', labelKey: 'weather.title', labelDefault: 'Weather', icon: CloudSun },
  { id: 'settings', labelKey: 'navigation.settings', labelDefault: 'Settings', icon: SettingsIcon },
];

// Voice label keys for each navigation item
export const voiceLabelKeys: Record<Tab, string> = {
  dashboard: 'navigation.dashboardVoice',
  calendar: 'navigation.calendarVoice',
  fields: 'navigation.fieldsVoice',
  harvests: 'navigation.harvestsVoice',
  costs: 'navigation.costsVoice',
  expenses: 'navigation.expensesVoice',
  income: 'navigation.incomeVoice',
  tasks: 'navigation.tasksVoice',
  inventory: 'navigation.inventoryVoice',
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
  teams: 'navigation.teamsVoice',
  'story-quests': 'navigation.storyQuestsVoice',
};
