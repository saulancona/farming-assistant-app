import { motion } from 'framer-motion';
import { BookOpen, Video, Clock, TrendingUp, Target, CheckCircle2, PlayCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLearningStats, useVideoProgress, useArticleProgress } from '../../hooks/useLearningProgress';

interface LearningProgressProps {
  userId: string | undefined;
}

export default function LearningProgress({ userId }: LearningProgressProps) {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useLearningStats(userId);
  const { data: recentVideos } = useVideoProgress(userId);
  const { data: recentArticles } = useArticleProgress(userId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  const totalLearningTime = (stats?.totalReadingTimeMinutes || 0) + (stats?.totalWatchTimeMinutes || 0);
  const totalCompleted = (stats?.articlesCompleted || 0) + (stats?.videosCompleted || 0);

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-6 text-white shadow-lg"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{t('learning.yourProgress', 'Your Learning Progress')}</h2>
            <p className="text-blue-100 text-sm">{t('learning.keepGoing', 'Keep up the great work!')}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold">{totalCompleted}</p>
            <p className="text-blue-100 text-xs">{t('learning.lessonsCompleted', 'Lessons Completed')}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">{totalLearningTime}</p>
            <p className="text-blue-100 text-xs">{t('learning.minutesLearned', 'Minutes Learned')}</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold">
              {Math.round(((stats?.articleCompletionRate || 0) + (stats?.videoCompletionRate || 0)) / 2)}%
            </p>
            <p className="text-blue-100 text-xs">{t('learning.completionRate', 'Completion Rate')}</p>
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-3">
            <BookOpen className="w-5 h-5" />
            <span className="font-medium">{t('learning.articles', 'Articles')}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('learning.completed', 'Completed')}</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats?.articlesCompleted || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('learning.inProgress', 'In Progress')}</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {(stats?.totalArticlesStarted || 0) - (stats?.articlesCompleted || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('learning.readingTime', 'Reading Time')}</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats?.totalReadingTimeMinutes || 0} min</span>
            </div>
          </div>

          {/* Completion Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{t('learning.completionRate', 'Completion')}</span>
              <span>{stats?.articleCompletionRate || 0}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats?.articleCompletionRate || 0}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-blue-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-3">
            <Video className="w-5 h-5" />
            <span className="font-medium">{t('learning.videos', 'Videos')}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('learning.completed', 'Completed')}</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats?.videosCompleted || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('learning.inProgress', 'In Progress')}</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {(stats?.totalVideosStarted || 0) - (stats?.videosCompleted || 0)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">{t('learning.watchTime', 'Watch Time')}</span>
              <span className="font-medium text-gray-900 dark:text-white">{stats?.totalWatchTimeMinutes || 0} min</span>
            </div>
          </div>

          {/* Completion Progress */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{t('learning.completionRate', 'Completion')}</span>
              <span>{stats?.videoCompletionRate || 0}%</span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats?.videoCompletionRate || 0}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-purple-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          {t('learning.recentActivity', 'Recent Activity')}
        </h3>

        {(Array.isArray(recentVideos) && recentVideos.length > 0) || (Array.isArray(recentArticles) && recentArticles.length > 0) ? (
          <div className="space-y-3">
            {/* Recent Videos */}
            {Array.isArray(recentVideos) && recentVideos.slice(0, 3).map((video) => (
              <div
                key={video.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  video.completed
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                }`}>
                  {video.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <PlayCircle className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Video: {video.videoId}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {video.completed
                      ? t('learning.completedOn', 'Completed')
                      : `${Math.round(video.percentageWatched)}% ${t('learning.watched', 'watched')}`}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(video.watchTimeSeconds / 60)} min
                </div>
              </div>
            ))}

            {/* Recent Articles */}
            {Array.isArray(recentArticles) && recentArticles.slice(0, 3).map((article) => (
              <div
                key={article.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  article.completed
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                }`}>
                  {article.completed ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <BookOpen className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    Article: {article.articleId}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {article.completed
                      ? t('learning.completedOn', 'Completed')
                      : `${Math.round(article.scrollPercentage)}% ${t('learning.read', 'read')}`}
                  </p>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {Math.round(article.readingTimeSeconds / 60)} min
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{t('learning.noActivity', 'No learning activity yet')}</p>
            <p className="text-sm">{t('learning.startLearning', 'Start reading articles or watching videos!')}</p>
          </div>
        )}
      </motion.div>

      {/* Tips */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800"
      >
        <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-2">
          💡 {t('learning.tips', 'Learning Tips')}
        </h3>
        <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-300">
          <li>• {t('learning.tip1', 'Complete lessons to earn XP and unlock achievements')}</li>
          <li>• {t('learning.tip2', 'Watch videos on topics relevant to your crops')}</li>
          <li>• {t('learning.tip3', 'Consistent daily learning builds streaks and bonus XP')}</li>
        </ul>
      </motion.div>
    </div>
  );
}

// Compact widget for dashboard
export function LearningProgressWidget({ userId }: { userId: string | undefined }) {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useLearningStats(userId);

  if (isLoading) {
    return (
      <div className="h-20 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  const totalCompleted = (stats?.articlesCompleted || 0) + (stats?.videosCompleted || 0);
  const avgCompletion = Math.round(((stats?.articleCompletionRate || 0) + (stats?.videoCompletionRate || 0)) / 2);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {t('learning.learning', 'Learning')}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {totalCompleted} {t('learning.lessonsCompleted', 'lessons completed')}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{avgCompletion}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('learning.completion', 'completion')}</p>
        </div>
      </div>
    </div>
  );
}
