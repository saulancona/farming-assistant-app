import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, LogOut, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUIStore, type Tab } from '../../store/uiStore';
import TalkingButton from '../TalkingButton';
import {
  navigationCategories,
  getNavigationItemsByCategory,
  voiceLabelKeys,
  standaloneBottomItems,
  type NavigationCategory,
} from '../../config/navigation';

interface SidebarProps {
  onRequestAuth: () => void;
}

export default function Sidebar({ onRequestAuth }: SidebarProps) {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { activeTab, setActiveTab } = useUIStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<NavigationCategory>>(
    new Set(['home', 'farm']) // Default expanded categories
  );

  const toggleCategory = (category: NavigationCategory) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const getNavVoiceLabel = (id: Tab, label: string): string => {
    return t(voiceLabelKeys[id], `${label}. Click to navigate.`);
  };

  // Note: Could add getActiveCategory() to highlight parent category if needed

  return (
    <aside
      className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200 fixed h-full"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Logo Header */}
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

      {/* Navigation with Categories */}
      <nav className="flex-1 p-4 overflow-y-auto" aria-label="Primary navigation menu">
        {navigationCategories.map((category) => {
          const items = getNavigationItemsByCategory(category.id);
          const isExpanded = expandedCategories.has(category.id);
          const hasActiveItem = items.some(item => item.id === activeTab);
          const CategoryIcon = category.icon;

          return (
            <div key={category.id} className="mb-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  hasActiveItem
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CategoryIcon size={18} />
                  <span className="font-medium text-sm">
                    {t(category.labelKey, category.labelDefault)}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-400" />
                ) : (
                  <ChevronRight size={16} className="text-gray-400" />
                )}
              </button>

              {/* Category Items */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-4 mt-1 space-y-1">
                      {items.map((item) => {
                        const ItemIcon = item.icon;
                        const isActive = activeTab === item.id;
                        const label = t(item.labelKey, item.labelDefault);

                        return (
                          <TalkingButton
                            key={item.id}
                            voiceLabel={getNavVoiceLabel(item.id, label)}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] ${
                              isActive
                                ? 'bg-primary-100 text-primary-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            <ItemIcon size={18} />
                            <span className="text-sm">{label}</span>
                          </TalkingButton>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Standalone Bottom Items (Weather, Settings) */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          {standaloneBottomItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            const label = t(item.labelKey, item.labelDefault);

            return (
              <TalkingButton
                key={item.id}
                voiceLabel={getNavVoiceLabel(item.id, label)}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors min-h-[44px] mb-1 ${
                  isActive
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <ItemIcon size={18} />
                <span className="text-sm">{label}</span>
              </TalkingButton>
            );
          })}
        </div>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        {user ? (
          <>
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-gray-700 truncate">{user.email}</p>
              <p className="text-xs text-gray-500">Logged in</p>
            </div>
            <TalkingButton
              voiceLabel="Sign Out. Click to log out of your account."
              onClick={signOut}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors min-h-[44px]"
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
              onClick={onRequestAuth}
              className="w-full px-3 py-2.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium min-h-[44px]"
            >
              {t('auth.signIn')}
            </TalkingButton>
          </div>
        )}
      </div>
    </aside>
  );
}
