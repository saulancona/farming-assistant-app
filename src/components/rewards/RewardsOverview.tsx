import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Flame, Star, TrendingUp, Target, Award, ChevronRight, Coins, Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRewardsProfile, useLevelDefinitions, useXPProgress, useUserAchievements, useRealTimeStats, useSyncRewardsStats } from '../../hooks/useRewards';
import { useLearningStats } from '../../hooks/useLearningProgress';
import { useRecalculateFarmerScore } from '../../hooks/useFarmerScore';
import { useUserPoints } from '../../hooks/useRewardsShop';
import { useUserPhotoStats } from '../../hooks/usePhotoChallenges';
import AchievementGrid from './AchievementGrid';
import Leaderboard from './Leaderboard';
import FarmerScoreCard from './FarmerScoreCard';
import StreakWidget from './StreakWidget';
import { PhotoChallengesWidget } from '../challenges/PhotoChallenges';
import { TeamWidget } from '../teams/TeamDashboard';
import { StoryQuestsWidget } from '../story-quests/StoryQuestsDashboard';

interface RewardsOverviewProps {
  userId: string | undefined;
  onNavigate?: (tab: string) => void;
}

export default function RewardsOverview({ userId, onNavigate }: RewardsOverviewProps) {
  const { t, i18n } = useTranslation();
  const { data: profile, isLoading: profileLoading } = useRewardsProfile(userId);
  const { data: levels } = useLevelDefinitions();
  const { data: userAchievements } = useUserAchievements(userId);
  const { data: learningStats } = useLearningStats(userId);
  const { data: realTimeStats } = useRealTimeStats(userId);
  const { data: userPoints } = useUserPoints(userId);
  const { data: photoStats } = useUserPhotoStats(userId || '');
  const xpProgress = useXPProgress(userId);
  const syncStatsMutation = useSyncRewardsStats();
  const recalculateScoreMutation = useRecalculateFarmerScore();

  const currentLevel = levels?.find(l => l.level === profile?.currentLevel);
  const nextLevel = levels?.find(l => l.level === (profile?.currentLevel || 0) + 1);
  const isSwahili = i18n.language === 'sw';

  const completedAchievements = userAchievements?.filter(ua => ua.completed) || [];

  // Sync stats on mount if user is logged in
  useEffect(() => {
    if (userId) {
      syncStatsMutation.mutate(userId);
      recalculateScoreMutation.mutate(userId);
    }
  }, [userId]);

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Farmer Score Card */}
      <FarmerScoreCard userId={userId} />

      {/* Daily Streak Widget */}
      <StreakWidget userId={userId} />

      {/* Photo Challenges Widget */}
      <PhotoChallengesWidget userId={userId} onClick={() => onNavigate?.('photo-challenges')} />

      {/* Team Widget */}
      <TeamWidget userId={userId} onClick={() => onNavigate?.('teams')} />

      {/* Story Quests Widget */}
      <StoryQuestsWidget userId={userId || ''} onClick={() => onNavigate?.('story-quests')} />

      {/* Header with Level & XP */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center text-4xl">
              {currentLevel?.icon || '🌱'}
            </div>
            <div>
              <p className="text-emerald-100 text-sm">{t('rewards.level', 'Level')} {profile?.currentLevel || 1}</p>
              <h2 className="text-2xl font-bold">
                {isSwahili ? currentLevel?.nameSw : currentLevel?.name || 'Seedling'}
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                {profile?.totalXp?.toLocaleString() || 0} XP
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-amber-300">
              <Flame className="w-5 h-5" />
              <span className="font-bold">{profile?.currentStreak || 0}</span>
            </div>
            <p className="text-xs text-emerald-100">
              {t('rewards.dayStreak', 'day streak')}
            </p>
          </div>
        </div>

        {/* XP Progress Bar */}
        {nextLevel && (
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-emerald-100">
                {t('rewards.nextLevel', 'Next')}: {isSwahili ? nextLevel.nameSw : nextLevel.name}
              </span>
              <span className="text-emerald-100">
                {xpProgress.xpToNextLevel.toLocaleString()} XP {t('rewards.toGo', 'to go')}
              </span>
            </div>
            <div className="h-3 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress.progressPercentage}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-400 to-amber-300 rounded-full"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
            <Trophy className="w-5 h-5" />
            <span className="text-sm font-medium">{t('rewards.achievements', 'Achievements')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {completedAchievements.length}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('rewards.unlocked', 'unlocked')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
            <Flame className="w-5 h-5" />
            <span className="text-sm font-medium">{t('rewards.longestStreak', 'Best Streak')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {profile?.longestStreak || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('rewards.days', 'days')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Target className="w-5 h-5" />
            <span className="text-sm font-medium">{t('rewards.tasksCompleted', 'Tasks')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {profile?.tasksCompleted || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('rewards.completed', 'completed')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-2">
            <Star className="w-5 h-5" />
            <span className="text-sm font-medium">{t('rewards.learning', 'Learning')}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {(learningStats?.articlesCompleted || 0) + (learningStats?.videosCompleted || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('rewards.lessonsCompleted', 'lessons')}
          </p>
        </motion.div>
      </div>

      {/* Photo Challenge Stats Card */}
      {photoStats && photoStats.totalPhotos > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onNavigate?.('photo-challenges')}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-violet-100 text-sm">{t('rewards.photoChallenge', 'Photo Challenges')}</p>
                <p className="text-2xl font-bold text-white">
                  {photoStats.totalPhotos} {t('rewards.photos', 'photos')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-violet-100 text-sm">{photoStats.totalChallengeXp} XP</p>
              <p className="text-white font-medium">{photoStats.challengesCompleted} {t('rewards.challenges', 'challenges')}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Points Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onNavigate?.('shop')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Coins className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-amber-100 text-sm">{t('rewards.pointsBalance', 'Points Balance')}</p>
              <p className="text-2xl font-bold text-white">
                {userPoints?.totalPoints?.toLocaleString() || 0}
              </p>
            </div>
          </div>
          <div className="text-right">
            <button
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
            >
              {t('rewards.visitShop', 'Visit Shop')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-emerald-600" />
          {t('rewards.yourProgress', 'Your Progress')}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{realTimeStats?.fieldsCount || profile?.fieldsCount || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('rewards.fields', 'Fields')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{realTimeStats?.tasksCompleted || profile?.tasksCompleted || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('rewards.tasks', 'Tasks')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{learningStats?.articlesCompleted || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('rewards.articles', 'Articles')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{learningStats?.videosCompleted || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('rewards.videos', 'Videos')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{realTimeStats?.postsCount || profile?.postsCount || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('rewards.posts', 'Posts')}</p>
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{realTimeStats?.listingsCount || profile?.listingsCount || 0}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('rewards.listings', 'Listings')}</p>
          </div>
        </div>
      </motion.div>

      {/* Achievements Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            {t('rewards.achievements', 'Achievements')}
          </h3>
          <button
            onClick={() => onNavigate?.('achievements')}
            className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
          >
            {t('rewards.viewAll', 'View All')}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <AchievementGrid userId={userId} limit={6} showProgress />
      </motion.div>

      {/* Leaderboard Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {t('rewards.leaderboard', 'Leaderboard')}
          </h3>
        </div>
        <Leaderboard userId={userId} limit={5} />
      </motion.div>

      {/* Level Progress Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {t('rewards.levelGuide', 'Level Guide')}
        </h3>
        <div className="space-y-2">
          {levels?.map((level) => {
            const isCurrentLevel = level.level === profile?.currentLevel;
            const isPastLevel = level.level < (profile?.currentLevel || 1);

            return (
              <div
                key={level.level}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  isCurrentLevel
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700'
                    : isPastLevel
                    ? 'opacity-60'
                    : ''
                }`}
              >
                <span className="text-2xl">{level.icon}</span>
                <div className="flex-1">
                  <p className={`font-medium ${isCurrentLevel ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {isSwahili ? level.nameSw : level.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {level.xpRequired.toLocaleString()} XP
                  </p>
                </div>
                {isPastLevel && (
                  <span className="text-emerald-500">✓</span>
                )}
                {isCurrentLevel && (
                  <span className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full">
                    {t('rewards.current', 'Current')}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
