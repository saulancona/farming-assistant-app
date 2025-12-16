import { motion } from 'framer-motion';
import { Lock, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAchievements, useUserAchievements } from '../../hooks/useRewards';
import type { UserAchievement, AchievementCategory } from '../../types';

interface AchievementGridProps {
  userId: string | undefined;
  limit?: number;
  showProgress?: boolean;
  category?: AchievementCategory;
}

const tierColors = {
  bronze: 'from-amber-600 to-amber-700',
  silver: 'from-gray-400 to-gray-500',
  gold: 'from-yellow-400 to-yellow-500',
  platinum: 'from-purple-400 to-purple-600',
};

const tierBgColors = {
  bronze: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700',
  silver: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600',
  gold: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700',
  platinum: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700',
};

const categoryIcons: Record<AchievementCategory, string> = {
  learning: '📚',
  farming: '🌾',
  community: '👥',
  marketplace: '🛒',
  streaks: '🔥',
  milestones: '⭐',
};

export default function AchievementGrid({
  userId,
  limit,
  showProgress = true,
  category,
}: AchievementGridProps) {
  const { i18n } = useTranslation();
  const { data: achievements, isLoading: achievementsLoading } = useAchievements();
  const { data: userAchievements, isLoading: userAchievementsLoading } = useUserAchievements(userId);
  const isSwahili = i18n.language === 'sw';

  if (achievementsLoading || userAchievementsLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[...Array(limit || 6)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  // Filter achievements by category if specified
  let filteredAchievements = achievements || [];
  if (category) {
    filteredAchievements = filteredAchievements.filter(a => a.category === category);
  }

  // Limit the number of achievements shown
  if (limit) {
    // Prioritize showing completed achievements first, then in-progress
    const userAchievementMap = new Map(
      (userAchievements || []).map(ua => [ua.achievementId, ua])
    );

    filteredAchievements = [...filteredAchievements].sort((a, b) => {
      const aUserAch = userAchievementMap.get(a.id);
      const bUserAch = userAchievementMap.get(b.id);

      // Completed first
      if (aUserAch?.completed && !bUserAch?.completed) return -1;
      if (!aUserAch?.completed && bUserAch?.completed) return 1;

      // Then by progress percentage
      const aProgress = aUserAch ? (aUserAch.progress / a.requirementValue) : 0;
      const bProgress = bUserAch ? (bUserAch.progress / b.requirementValue) : 0;

      return bProgress - aProgress;
    }).slice(0, limit);
  }

  const getUserAchievement = (achievementId: string): UserAchievement | undefined => {
    return userAchievements?.find(ua => ua.achievementId === achievementId);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {filteredAchievements.map((achievement, index) => {
        const userAchievement = getUserAchievement(achievement.id);
        const isCompleted = userAchievement?.completed || false;
        const progress = userAchievement?.progress || 0;
        const progressPercentage = Math.min(100, (progress / achievement.requirementValue) * 100);

        return (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`relative rounded-xl p-3 border ${
              isCompleted
                ? tierBgColors[achievement.tier]
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            } ${!isCompleted ? 'opacity-75' : ''}`}
          >
            {/* Achievement Icon */}
            <div className="flex items-start justify-between mb-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                  isCompleted
                    ? `bg-gradient-to-br ${tierColors[achievement.tier]} text-white shadow-md`
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}
              >
                {isCompleted ? achievement.icon : <Lock className="w-4 h-4" />}
              </div>
              {isCompleted && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-white" />
                </motion.div>
              )}
            </div>

            {/* Achievement Details */}
            <h4 className={`font-medium text-sm mb-1 ${
              isCompleted
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {isSwahili ? achievement.nameSw : achievement.name}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {isSwahili ? achievement.descriptionSw : achievement.description}
            </p>

            {/* Progress Bar */}
            {showProgress && !isCompleted && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                  <span>{progress} / {achievement.requirementValue}</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full rounded-full bg-gradient-to-r ${tierColors[achievement.tier]}`}
                  />
                </div>
              </div>
            )}

            {/* XP Reward Badge */}
            <div className="absolute bottom-2 right-2">
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                isCompleted
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                +{achievement.xpReward} XP
              </span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// Category filter component for full achievements page
export function AchievementCategoryTabs({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: AchievementCategory | null;
  onSelectCategory: (category: AchievementCategory | null) => void;
}) {
  const { t } = useTranslation();

  const categories: { key: AchievementCategory | null; label: string }[] = [
    { key: null, label: t('rewards.all', 'All') },
    { key: 'learning', label: t('rewards.learning', 'Learning') },
    { key: 'farming', label: t('rewards.farming', 'Farming') },
    { key: 'streaks', label: t('rewards.streaks', 'Streaks') },
    { key: 'milestones', label: t('rewards.milestones', 'Milestones') },
    { key: 'community', label: t('rewards.community', 'Community') },
    { key: 'marketplace', label: t('rewards.marketplace', 'Marketplace') },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map(({ key, label }) => (
        <button
          key={key ?? 'all'}
          onClick={() => onSelectCategory(key)}
          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
            selectedCategory === key
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          {key && <span className="mr-1">{categoryIcons[key]}</span>}
          {label}
        </button>
      ))}
    </div>
  );
}
