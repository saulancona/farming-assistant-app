import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Flame, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface XPNotification {
  id: string;
  type: 'xp' | 'level_up' | 'achievement' | 'streak';
  title: string;
  subtitle?: string;
  xpAmount?: number;
  icon?: string;
}

interface XPToastContextType {
  showXPGain: (amount: number, action: string) => void;
  showLevelUp: (level: number, levelName: string, levelIcon: string) => void;
  showAchievement: (name: string, icon: string, xpReward: number) => void;
  showStreak: (days: number, xpBonus: number) => void;
}

const XPToastContext = createContext<XPToastContextType | null>(null);

export function useXPToast() {
  const context = useContext(XPToastContext);
  if (!context) {
    throw new Error('useXPToast must be used within an XPToastProvider');
  }
  return context;
}

export function XPToastProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<XPNotification[]>([]);
  const { t } = useTranslation();

  const addNotification = useCallback((notification: Omit<XPNotification, 'id'>) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications(prev => [...prev, { ...notification, id }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showXPGain = useCallback((amount: number, action: string) => {
    addNotification({
      type: 'xp',
      title: `+${amount} XP`,
      subtitle: action,
      xpAmount: amount,
    });
  }, [addNotification]);

  const showLevelUp = useCallback((level: number, levelName: string, levelIcon: string) => {
    addNotification({
      type: 'level_up',
      title: t('rewards.levelUp', 'Level Up!'),
      subtitle: `${t('rewards.level', 'Level')} ${level}: ${levelName}`,
      icon: levelIcon,
    });
  }, [addNotification, t]);

  const showAchievement = useCallback((name: string, icon: string, xpReward: number) => {
    addNotification({
      type: 'achievement',
      title: t('rewards.achievementUnlocked', 'Achievement Unlocked!'),
      subtitle: name,
      icon,
      xpAmount: xpReward,
    });
  }, [addNotification, t]);

  const showStreak = useCallback((days: number, xpBonus: number) => {
    addNotification({
      type: 'streak',
      title: `${days} ${t('rewards.dayStreak', 'Day Streak')}!`,
      subtitle: `+${xpBonus} XP ${t('rewards.bonus', 'bonus')}`,
      xpAmount: xpBonus,
    });
  }, [addNotification, t]);

  return (
    <XPToastContext.Provider value={{ showXPGain, showLevelUp, showAchievement, showStreak }}>
      {children}
      <XPToastContainer
        notifications={notifications}
        onDismiss={removeNotification}
      />
    </XPToastContext.Provider>
  );
}

function XPToastContainer({
  notifications,
  onDismiss,
}: {
  notifications: XPNotification[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map(notification => (
          <XPToastItem
            key={notification.id}
            notification={notification}
            onDismiss={() => onDismiss(notification.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function XPToastItem({
  notification,
  onDismiss,
}: {
  notification: XPNotification;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, notification.type === 'level_up' ? 5000 : 3000);
    return () => clearTimeout(timer);
  }, [onDismiss, notification.type]);

  const getIcon = () => {
    switch (notification.type) {
      case 'xp':
        return <Star className="w-5 h-5 text-amber-400" />;
      case 'level_up':
        return <span className="text-2xl">{notification.icon || '🎉'}</span>;
      case 'achievement':
        return <span className="text-2xl">{notification.icon || '🏆'}</span>;
      case 'streak':
        return <Flame className="w-5 h-5 text-orange-500" />;
      default:
        return <Zap className="w-5 h-5 text-emerald-400" />;
    }
  };

  const getGradient = () => {
    switch (notification.type) {
      case 'xp':
        return 'from-emerald-500 to-emerald-600';
      case 'level_up':
        return 'from-purple-500 to-purple-600';
      case 'achievement':
        return 'from-amber-500 to-amber-600';
      case 'streak':
        return 'from-orange-500 to-orange-600';
      default:
        return 'from-blue-500 to-blue-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 100, scale: 0.8 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.8 }}
      className={`pointer-events-auto bg-gradient-to-r ${getGradient()} text-white px-4 py-3 rounded-xl shadow-lg min-w-[200px] max-w-[300px]`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
          {getIcon()}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{notification.title}</p>
          {notification.subtitle && (
            <p className="text-xs text-white/80">{notification.subtitle}</p>
          )}
        </div>
        {notification.type === 'level_up' && (
          <motion.div
            animate={{ rotate: [0, 10, -10, 10, 0] }}
            transition={{ repeat: Infinity, duration: 0.5 }}
            className="text-2xl"
          >
            🎉
          </motion.div>
        )}
      </div>

      {/* XP floating animation for XP gains */}
      {notification.type === 'xp' && notification.xpAmount && (
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 0, y: -20 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="absolute -top-2 right-4 text-sm font-bold text-amber-300"
        >
          +{notification.xpAmount}
        </motion.div>
      )}
    </motion.div>
  );
}

// Standalone XP gain animation for inline use
export function XPGainAnimation({
  amount,
  onComplete,
}: {
  amount: number;
  onComplete?: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onComplete?.(), 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -30, scale: 1.2 }}
      transition={{ duration: 1.5 }}
      className="inline-flex items-center gap-1 text-emerald-500 font-bold"
    >
      <Star className="w-4 h-4" />
      +{amount} XP
    </motion.div>
  );
}

export default XPToastProvider;
