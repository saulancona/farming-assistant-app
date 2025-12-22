import { motion } from 'framer-motion';
import { TrendingUp, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useRef } from 'react';
import type { MarketPrice } from '../types';
import MarketWidget from './MarketWidget';
import ReadButton from './ReadButton';
import TalkingButton from './TalkingButton';
import { useRecordActivity } from '../hooks/useStreak';
import { useAwardMicroReward } from '../hooks/useMicroWins';
import { useUpdateChallengeProgress } from '../hooks/useChallenges';

interface MarketsProps {
  prices: MarketPrice[];
  onRefresh?: () => void;
  userId?: string;
}

export default function Markets({ prices, onRefresh, userId }: MarketsProps) {
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const recordActivity = useRecordActivity();
  const awardMicroReward = useAwardMicroReward();
  const updateChallengeProgress = useUpdateChallengeProgress();
  const hasRecordedActivity = useRef(false);

  // Record price check activity on mount (only once per session)
  useEffect(() => {
    if (userId && !hasRecordedActivity.current) {
      hasRecordedActivity.current = true;
      console.log('[Markets] Recording activity for user:', userId);

      recordActivity.mutate({
        userId,
        activityType: 'price_check',
        activityName: 'Checked Market Prices',
        activityNameSw: 'Kuangalia Bei za Soko',
      });

      // Award micro-reward for checking prices
      awardMicroReward.mutate({
        userId,
        actionType: 'price_check',
      });

      // Update weekly challenge progress (target_action: 'check_prices')
      console.log('[Markets] Updating challenge progress for action: check_prices');
      updateChallengeProgress.mutate(
        {
          userId,
          action: 'check_prices',
        },
        {
          onSuccess: (data) => {
            console.log('[Markets] Challenge progress updated successfully:', data);
          },
          onError: (error) => {
            console.error('[Markets] Failed to update challenge progress:', error);
          },
        }
      );
    }
  }, [userId]);

  const handleRefresh = async () => {
    if (onRefresh) {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp className="text-primary-600" size={28} />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('market.title', 'Market Prices')}</h1>
          </div>
          <p className="text-gray-600 text-sm md:text-base">
            Compare international prices and add your local market prices
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ReadButton
            text="Market Prices page. View international commodity prices and add your own local market prices to compare."
            size="sm"
          />
          {onRefresh && (
            <TalkingButton
              voiceLabel="Refresh Market Prices. Click to update market data."
              onClick={handleRefresh}
              className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isRefreshing}
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </TalkingButton>
          )}
        </div>
      </div>

      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary-50 to-blue-50 border-l-4 border-primary-600 rounded-lg p-4"
      >
        <h3 className="text-sm font-semibold text-primary-900 mb-2">How Local Prices Work</h3>
        <ul className="text-sm text-primary-800 space-y-1">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span>Click "Add Local" on any commodity to input prices from your local market</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span>Toggle between "International" and "Local" to compare prices</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span>Your local prices are saved on your device and stay private to you</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 font-bold">•</span>
            <span>Update prices regularly to track market trends in your area</span>
          </li>
        </ul>
      </motion.div>

      {/* Market Widget */}
      <MarketWidget prices={prices} />
    </div>
  );
}
