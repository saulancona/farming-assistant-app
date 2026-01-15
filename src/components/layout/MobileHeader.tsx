import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sprout, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useUIStore, type Tab } from '../../store/uiStore';
import TalkingButton from '../TalkingButton';
import NotificationsPanel from '../NotificationsPanel';
import {
  navigationCategories,
  getNavigationItemsByCategory,
  voiceLabelKeys,
  standaloneBottomItems,
  type NavigationCategory,
} from '../../config/navigation';
import type { Task, WeatherData } from '../../types';

interface MobileHeaderProps {
  tasks: Task[];
  weatherData: WeatherData | null;
  onRequestAuth: () => void;
}

export default function MobileHeader({ tasks, weatherData, onRequestAuth }: MobileHeaderProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { activeTab, setActiveTab, isMobileMenuOpen, setIsMobileMenuOpen } = useUIStore();
  const [expandedCategories, setExpandedCategories] = useState<Set<NavigationCategory>>(
    new Set(['home', 'farm'])
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

  return (
    <header
      className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-40"
      role="banner"
      aria-label="Mobile header"
    >
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
              onClick={onRequestAuth}
              className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium min-h-[44px]"
            >
              {t('auth.signIn')}
            </TalkingButton>
          )}
          <NotificationsPanel tasks={tasks} weatherData={weatherData} />
          <TalkingButton
            voiceLabel={
              isMobileMenuOpen
                ? 'Close Menu. Click to hide the navigation menu.'
                : 'Open Menu. Click to show the navigation menu.'
            }
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
          >
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </TalkingButton>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 overflow-hidden"
            role="navigation"
            aria-label="Mobile navigation menu"
          >
            <div className="space-y-2 max-h-[70vh] overflow-y-auto pb-4">
              {navigationCategories.map((category) => {
                const items = getNavigationItemsByCategory(category.id);
                const isExpanded = expandedCategories.has(category.id);
                const hasActiveItem = items.some(item => item.id === activeTab);
                const CategoryIcon = category.icon;

                return (
                  <div key={category.id}>
                    {/* Category Header */}
                    <button
                      onClick={() => toggleCategory(category.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors min-h-[48px] ${
                        hasActiveItem
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <CategoryIcon size={20} />
                        <span className="font-medium">
                          {t(category.labelKey, category.labelDefault)}
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronDown size={18} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={18} className="text-gray-400" />
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
                          <div className="ml-6 mt-1 space-y-1">
                            {items.map((item) => {
                              const ItemIcon = item.icon;
                              const isActive = activeTab === item.id;
                              const label = t(item.labelKey, item.labelDefault);

                              return (
                                <TalkingButton
                                  key={item.id}
                                  voiceLabel={getNavVoiceLabel(item.id, label)}
                                  onClick={() => {
                                    setActiveTab(item.id);
                                    setIsMobileMenuOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] ${
                                    isActive
                                      ? 'bg-primary-100 text-primary-700 font-medium'
                                      : 'text-gray-600 hover:bg-gray-50'
                                  }`}
                                >
                                  <ItemIcon size={20} />
                                  <span>{label}</span>
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
              <div className="mt-4 pt-4 border-t border-gray-200">
                {standaloneBottomItems.map((item) => {
                  const ItemIcon = item.icon;
                  const isActive = activeTab === item.id;
                  const label = t(item.labelKey, item.labelDefault);

                  return (
                    <TalkingButton
                      key={item.id}
                      voiceLabel={getNavVoiceLabel(item.id, label)}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[48px] mb-1 ${
                        isActive
                          ? 'bg-primary-100 text-primary-700 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <ItemIcon size={20} />
                      <span>{label}</span>
                    </TalkingButton>
                  );
                })}
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
