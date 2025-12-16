import { motion } from 'framer-motion';
import { Shield, TrendingUp, ChevronRight, Award, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFarmerScore, useRecalculateFarmerScore, getTierBenefits, getScoreComponentInfo } from '../../hooks/useFarmerScore';
import type { FarmerScoreTier } from '../../types';

interface FarmerScoreCardProps {
  userId: string | undefined;
  compact?: boolean;
  onViewDetails?: () => void;
}

export default function FarmerScoreCard({ userId, compact = false, onViewDetails }: FarmerScoreCardProps) {
  const { t, i18n } = useTranslation();
  const { data: score, isLoading } = useFarmerScore(userId);
  const recalculateMutation = useRecalculateFarmerScore();
  const isSwahili = i18n.language === 'sw';

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl ${compact ? 'p-3' : 'p-4'} animate-pulse`}>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  const totalScore = score?.totalScore || 0;
  const tier = score?.tier || 'bronze';
  const tierInfo = getTierBenefits(tier);

  const getTierGradient = (t: FarmerScoreTier) => {
    switch (t) {
      case 'champion':
        return 'from-purple-500 via-purple-600 to-purple-700';
      case 'gold':
        return 'from-amber-400 via-amber-500 to-amber-600';
      case 'silver':
        return 'from-gray-300 via-gray-400 to-gray-500';
      default:
        return 'from-amber-600 via-amber-700 to-amber-800';
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 91) return 'text-purple-500';
    if (s >= 71) return 'text-amber-500';
    if (s >= 41) return 'text-gray-400';
    return 'text-amber-700';
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
        onClick={onViewDetails}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getTierGradient(tier)} flex items-center justify-center text-white`}>
              <span className="text-lg">{tierInfo.icon}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {t('farmerScore.title', 'Farmer Score')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isSwahili ? tierInfo.nameSw : tierInfo.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-bold ${getScoreColor(totalScore)}`}>
              {Math.round(totalScore)}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header with Tier Badge */}
      <div className={`bg-gradient-to-br ${getTierGradient(tier)} p-6 text-white relative overflow-hidden`}>
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <span className="text-3xl">{tierInfo.icon}</span>
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {t('farmerScore.title', 'Farmer Score')}
                </h3>
                <p className="text-white/80 text-sm flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {isSwahili ? tierInfo.nameSw : tierInfo.name} {t('farmerScore.tier', 'Tier')}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold">{Math.round(totalScore)}</div>
              <div className="text-white/80 text-sm">/100</div>
            </div>
          </div>

          {/* Score Progress Bar */}
          <div className="relative h-3 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalScore}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 bg-white rounded-full"
            />
            {/* Tier markers */}
            <div className="absolute inset-0 flex">
              <div className="w-[40%] border-r border-white/30" />
              <div className="w-[30%] border-r border-white/30" />
              <div className="w-[20%] border-r border-white/30" />
              <div className="w-[10%]" />
            </div>
          </div>

          <div className="flex justify-between mt-1 text-xs text-white/60">
            <span>{t('farmerScore.bronze', 'Bronze')}</span>
            <span>41</span>
            <span>71</span>
            <span>91</span>
            <span>100</span>
          </div>
        </div>
      </div>

      {/* Score Components */}
      <div className="p-4">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t('farmerScore.breakdown', 'Score Breakdown')}
        </h4>

        <div className="grid grid-cols-2 gap-3">
          {(['learning', 'mission', 'engagement', 'reliability'] as const).map((component) => {
            const info = getScoreComponentInfo(component);
            const componentScore = score?.[`${component}Score` as keyof typeof score] as number || 0;
            const percentage = (componentScore / 25) * 100;

            return (
              <div
                key={component}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{info.icon}</span>
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {isSwahili ? info.nameSw : info.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className={`h-full rounded-full ${
                        percentage >= 80
                          ? 'bg-emerald-500'
                          : percentage >= 50
                          ? 'bg-blue-500'
                          : 'bg-amber-500'
                      }`}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8 text-right">
                    {Math.round(componentScore)}/{info.maxPoints}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="px-4 pb-4">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-lg p-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {t('farmerScore.benefits', 'Tier Benefits')}
          </h4>
          <div className="flex flex-wrap gap-1">
            {(isSwahili ? tierInfo.benefitsSw : tierInfo.benefits).map((benefit, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-500"
              >
                {benefit}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => userId && recalculateMutation.mutate(userId)}
          disabled={recalculateMutation.isPending}
          className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Shield className="w-4 h-4" />
          {recalculateMutation.isPending
            ? t('farmerScore.calculating', 'Calculating...')
            : t('farmerScore.recalculate', 'Recalculate Score')}
        </button>
      </div>
    </motion.div>
  );
}

// Mini widget for dashboard
export function FarmerScoreWidget({ userId, onClick }: { userId: string | undefined; onClick?: () => void }) {
  const { i18n } = useTranslation();
  const { data: score, isLoading } = useFarmerScore(userId);
  const isSwahili = i18n.language === 'sw';

  if (isLoading) {
    return (
      <div className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg animate-pulse" />
    );
  }

  const totalScore = score?.totalScore || 0;
  const tier = score?.tier || 'bronze';
  const tierInfo = getTierBenefits(tier);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all text-left"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{tierInfo.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {isSwahili ? tierInfo.nameSw : tierInfo.name}
            </span>
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(totalScore)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${totalScore}%` }}
              className="h-full bg-blue-500 rounded-full"
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}
