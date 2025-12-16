import { motion } from 'framer-motion';
import { Trophy, Medal, Award, Flame, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLeaderboard, useLevelDefinitions, useUserRank } from '../../hooks/useRewards';

interface LeaderboardProps {
  userId: string | undefined;
  limit?: number;
}

const rankIcons = [
  { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
  { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
];

export default function Leaderboard({ userId, limit = 10 }: LeaderboardProps) {
  const { t, i18n } = useTranslation();
  const { data: leaderboard, isLoading } = useLeaderboard(limit);
  const { data: levels } = useLevelDefinitions();
  const { rank: userRank, totalUsers } = useUserRank(userId);
  const isSwahili = i18n.language === 'sw';

  const getLevelInfo = (levelNum: number) => {
    return levels?.find(l => l.level === levelNum);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(limit > 5 ? 5 : limit)].map((_, i) => (
          <div
            key={i}
            className="h-14 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>{t('rewards.noLeaderboardData', 'No leaderboard data yet')}</p>
        <p className="text-sm">{t('rewards.startEarning', 'Start earning XP to appear here!')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* User's rank if not in top list */}
      {userRank && userRank > limit && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-lg p-3 mb-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
              #{userRank}
            </div>
            <div className="flex-1">
              <p className="font-medium text-emerald-700 dark:text-emerald-300">
                {t('rewards.yourRank', 'Your Rank')}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                {t('rewards.outOf', 'out of')} {totalUsers} {t('rewards.farmers', 'farmers')}
              </p>
            </div>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </div>
        </motion.div>
      )}

      {/* Leaderboard entries */}
      {leaderboard.map((entry, index) => {
        const isCurrentUser = entry.userId === userId;
        const levelInfo = getLevelInfo(entry.currentLevel);
        const RankIcon = index < 3 ? rankIcons[index] : null;

        return (
          <motion.div
            key={entry.userId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              isCurrentUser
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
                : 'bg-gray-50 dark:bg-gray-800/50 border border-transparent'
            }`}
          >
            {/* Rank */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              RankIcon
                ? RankIcon.bg
                : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {RankIcon ? (
                <RankIcon.icon className={`w-4 h-4 ${RankIcon.color}`} />
              ) : (
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  {entry.rank}
                </span>
              )}
            </div>

            {/* Level Icon */}
            <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xl">
              {levelInfo?.icon || '🌱'}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className={`font-medium truncate ${
                  isCurrentUser
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {entry.userName || `${t('rewards.farmer', 'Farmer')} ${entry.rank}`}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                      {t('rewards.you', 'You')}
                    </span>
                  )}
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isSwahili ? levelInfo?.nameSw : levelInfo?.name || 'Seedling'} • Lvl {entry.currentLevel}
              </p>
            </div>

            {/* Stats */}
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">
                {entry.totalXp.toLocaleString()}
              </p>
              <div className="flex items-center gap-1 justify-end">
                <Flame className="w-3 h-3 text-orange-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {entry.currentStreak}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}

      {/* View More */}
      {limit < 100 && leaderboard.length === limit && (
        <button className="w-full py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
          {t('rewards.viewFullLeaderboard', 'View Full Leaderboard')}
        </button>
      )}
    </div>
  );
}
