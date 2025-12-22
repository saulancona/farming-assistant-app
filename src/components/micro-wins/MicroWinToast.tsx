import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Star, Flame, AlertCircle, Sparkles, X } from 'lucide-react';
import { useMicroWinStore, getBadgeIcon, useBadgeProgress, getBadgeLabel, getBadgeLabelSw } from '../../hooks/useMicroWins';

export default function MicroWinToast() {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const { toasts, removeToast } = useMicroWinStore();

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -50, scale: 0.8, x: 100 }}
            animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 100 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="pointer-events-auto"
          >
            {toast.type === 'reward' && (
              <RewardToast
                message={isSwahili ? toast.messageSw || toast.message : toast.message}
                points={toast.points}
                xp={toast.xp}
                onClose={() => removeToast(toast.id)}
              />
            )}
            {toast.type === 'badge' && (
              <BadgeToast
                message={isSwahili ? toast.messageSw || toast.message : toast.message}
                badgeProgress={toast.badgeProgress}
                xp={toast.xp}
                onClose={() => removeToast(toast.id)}
              />
            )}
            {toast.type === 'streak' && (
              <StreakToast
                message={isSwahili ? toast.messageSw || toast.message : toast.message}
                onClose={() => removeToast(toast.id)}
              />
            )}
            {toast.type === 'limit' && (
              <LimitToast
                message={isSwahili ? toast.messageSw || toast.message : toast.message}
                onClose={() => removeToast(toast.id)}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// REWARD TOAST
// ============================================

function RewardToast({
  message,
  points,
  xp,
  onClose,
}: {
  message: string;
  points?: number;
  xp?: number;
  onClose: () => void;
}) {
  return (
    <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl shadow-lg p-3 pr-10 min-w-[200px] max-w-[300px] relative overflow-hidden">
      {/* Sparkle effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 0.5 }}
      >
        <Sparkles className="absolute top-1 right-8 w-4 h-4 text-yellow-200" />
        <Sparkles className="absolute bottom-2 left-4 w-3 h-3 text-yellow-200" />
      </motion.div>

      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, stiffness: 200 }}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
        >
          <Star className="w-6 h-6 text-yellow-200" />
        </motion.div>

        <div className="flex-1">
          <p className="font-medium text-sm">{message}</p>
          <div className="flex items-center gap-3 mt-1">
            {points !== undefined && points > 0 && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xs bg-white/20 px-2 py-0.5 rounded-full"
              >
                +{points} pts
              </motion.span>
            )}
            {xp !== undefined && xp > 0 && (
              <motion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs bg-white/20 px-2 py-0.5 rounded-full"
              >
                +{xp} XP
              </motion.span>
            )}
          </div>
        </div>
      </div>

      {/* Animated progress bar */}
      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-white/30"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 3, ease: 'linear' }}
      />
    </div>
  );
}

// ============================================
// BADGE TOAST
// ============================================

function BadgeToast({
  message,
  badgeProgress,
  xp,
  onClose,
}: {
  message: string;
  badgeProgress?: {
    badgeType: string;
    currentProgress: number;
    targetProgress: number;
    justCompleted: boolean;
  };
  xp?: number;
  onClose: () => void;
}) {
  const isCompleted = badgeProgress?.justCompleted;

  return (
    <div
      className={`${
        isCompleted
          ? 'bg-gradient-to-r from-purple-500 to-pink-500'
          : 'bg-gradient-to-r from-blue-500 to-cyan-500'
      } text-white rounded-xl shadow-lg p-3 pr-10 min-w-[220px] max-w-[320px] relative overflow-hidden`}
    >
      {/* Celebration effect for completed badges */}
      {isCompleted && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0, 1, 0] }}
          transition={{ duration: 1, times: [0, 0.2, 0.4, 0.6, 1] }}
        >
          <Sparkles className="absolute top-1 right-12 w-5 h-5 text-yellow-200" />
          <Sparkles className="absolute top-3 left-8 w-4 h-4 text-yellow-200" />
          <Sparkles className="absolute bottom-2 right-16 w-3 h-3 text-yellow-200" />
        </motion.div>
      )}

      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: 0.4 }}
          className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl"
        >
          {isCompleted ? '🏆' : getBadgeIcon(badgeProgress?.badgeType || '')}
        </motion.div>

        <div className="flex-1">
          <p className="font-medium text-sm">{message}</p>

          {/* Progress bar for incomplete badges */}
          {badgeProgress && !isCompleted && (
            <div className="mt-2">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(badgeProgress.currentProgress / badgeProgress.targetProgress) * 100}%`,
                  }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="h-full bg-white/60 rounded-full"
                />
              </div>
              <p className="text-xs mt-1 opacity-80">
                {badgeProgress.currentProgress}/{badgeProgress.targetProgress}
              </p>
            </div>
          )}

          {/* Bonus XP for completed badges */}
          {isCompleted && xp && (
            <motion.span
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="inline-block mt-1 text-xs bg-white/20 px-2 py-0.5 rounded-full"
            >
              +{xp} XP Bonus!
            </motion.span>
          )}
        </div>
      </div>

      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-white/30"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 3, ease: 'linear' }}
      />
    </div>
  );
}

// ============================================
// STREAK TOAST
// ============================================

function StreakToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl shadow-lg p-3 pr-10 min-w-[200px] max-w-[300px] relative overflow-hidden">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.3, 1] }}
          transition={{ duration: 0.4 }}
          className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
        >
          <Flame className="w-6 h-6 text-yellow-200" />
        </motion.div>

        <p className="font-medium text-sm flex-1">{message}</p>
      </div>

      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-white/30"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 3, ease: 'linear' }}
      />
    </div>
  );
}

// ============================================
// LIMIT TOAST
// ============================================

function LimitToast({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="bg-gray-700 text-white rounded-xl shadow-lg p-3 pr-10 min-w-[200px] max-w-[300px] relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 p-1 hover:bg-white/20 rounded-full transition"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
          <AlertCircle className="w-5 h-5 text-gray-300" />
        </div>

        <p className="text-sm text-gray-300 flex-1">{message}</p>
      </div>

      <motion.div
        className="absolute bottom-0 left-0 h-1 bg-white/20"
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: 3, ease: 'linear' }}
      />
    </div>
  );
}

// ============================================
// BADGE PROGRESS WIDGET
// ============================================

export function BadgeProgressWidget({ userId }: { userId: string }) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const { data: badges } = useBadgeProgress(userId);

  // Get the closest badge to completion
  const inProgressBadges = badges?.filter((b: { isCompleted: boolean }) => !b.isCompleted) || [];
  const closestBadge = inProgressBadges.sort(
    (a: { percentComplete: number }, b: { percentComplete: number }) => b.percentComplete - a.percentComplete
  )[0];

  if (!closestBadge) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800"
    >
      <div className="flex items-center gap-3">
        <div className="text-2xl">{getBadgeIcon(closestBadge.badgeType)}</div>
        <div className="flex-1">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
            {isSwahili
              ? `Hatua ${closestBadge.targetProgress - closestBadge.currentProgress} zaidi!`
              : `Just ${closestBadge.targetProgress - closestBadge.currentProgress} more steps!`}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            {isSwahili ? getBadgeLabelSw(closestBadge.badgeType) : getBadgeLabel(closestBadge.badgeType)}
          </p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {closestBadge.percentComplete}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${closestBadge.percentComplete}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
        />
      </div>
    </motion.div>
  );
}
