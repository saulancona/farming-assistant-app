import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame,
  AlertTriangle,
  Camera,
  TrendingUp,
  Clock,
  X,
  Check,
  Loader2,
  Star,
  Volume2,
  Ticket,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useStreakStatus,
  useSaveStreak,
  useRecordActivity,
  getStreakStatusMessage,
  getStreakFireEmoji,
  streakNeedsAttention,
} from '../../hooks/useStreak';
import { supabase } from '../../lib/supabase';
import type { StreakStatus, NextMilestone, RecentMilestoneClaim } from '../../types';

interface StreakWidgetProps {
  userId: string | undefined;
  compact?: boolean;
  showActivities?: boolean;
}

export default function StreakWidget({
  userId,
  compact = false,
  showActivities = true,
}: StreakWidgetProps) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const { data: streakStatus, isLoading } = useStreakStatus(userId);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showMilestoneDetails, setShowMilestoneDetails] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  const attention = streakNeedsAttention(streakStatus ?? null);
  const statusMessage = getStreakStatusMessage(
    streakStatus?.currentStreak || 0,
    isSwahili
  );

  if (compact) {
    return (
      <CompactStreakWidget
        streakStatus={streakStatus ?? null}
        attention={attention}
        statusMessage={statusMessage}
        isSwahili={isSwahili}
        onShowRecovery={() => setShowRecoveryModal(true)}
      />
    );
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`bg-gradient-to-br ${
          attention.type === 'can_recover'
            ? 'from-amber-500 to-orange-600'
            : attention.type === 'at_risk'
            ? 'from-red-500 to-orange-600'
            : 'from-orange-500 to-red-600'
        } rounded-2xl p-5 text-white relative overflow-hidden`}
      >
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-2xl">{getStreakFireEmoji(streakStatus?.currentStreak || 0)}</span>
              </div>
              <div>
                <h3 className="font-bold text-lg">
                  {isSwahili ? 'Mfululizo wa Kila Siku' : 'Daily Streak'}
                </h3>
                <p className="text-orange-100 text-sm">{statusMessage.message}</p>
              </div>
            </div>
          </div>

          {/* Streak Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{streakStatus?.currentStreak || 0}</p>
              <p className="text-xs text-orange-100">
                {isSwahili ? 'Siku Sasa' : 'Current'}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{streakStatus?.longestStreak || 0}</p>
              <p className="text-xs text-orange-100">
                {isSwahili ? 'Rekodi' : 'Best'}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl p-3 text-center">
              <p className="text-3xl font-bold">{streakStatus?.monthlyRaffleEntries || 0}</p>
              <p className="text-xs text-orange-100">
                {isSwahili ? 'Tiketi' : 'Raffle'}
              </p>
            </div>
          </div>

          {/* Next Milestone */}
          {streakStatus?.nextMilestone && (
            <NextMilestoneCard
              milestone={streakStatus.nextMilestone}
              isSwahili={isSwahili}
              onClick={() => setShowMilestoneDetails(true)}
            />
          )}

          {/* Streak at Risk / Recovery */}
          {attention.needsAction && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-3"
            >
              {attention.type === 'can_recover' ? (
                <button
                  onClick={() => setShowRecoveryModal(true)}
                  className="w-full py-3 bg-white text-orange-600 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-orange-50 transition-colors"
                >
                  <AlertTriangle className="w-5 h-5" />
                  {isSwahili ? 'Okoa Mfululizo Wako!' : 'Save Your Streak!'}
                </button>
              ) : attention.type === 'at_risk' ? (
                <div className="bg-white/20 rounded-xl p-3 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-white" />
                  <p className="text-sm">
                    {isSwahili
                      ? 'Fanya shughuli leo ili kudumisha mfululizo!'
                      : 'Complete an activity today to keep your streak!'}
                  </p>
                </div>
              ) : null}
            </motion.div>
          )}

          {/* Today's Activities */}
          {showActivities && streakStatus?.activitiesToday && streakStatus.activitiesToday.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-orange-100 mb-2">
                {isSwahili ? 'Shughuli za Leo' : "Today's Activities"}
              </p>
              <div className="flex flex-wrap gap-2">
                {streakStatus.activitiesToday.map((activity, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-white/20 rounded-full text-xs flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    {isSwahili ? activity.nameSw || activity.name : activity.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recent Milestones */}
          {streakStatus?.recentMilestones && streakStatus.recentMilestones.length > 0 && (
            <RecentMilestones milestones={streakStatus.recentMilestones} isSwahili={isSwahili} />
          )}
        </div>
      </motion.div>

      {/* Recovery Modal */}
      <AnimatePresence>
        {showRecoveryModal && userId && (
          <StreakRecoveryModal
            userId={userId}
            streakStatus={streakStatus ?? null}
            isSwahili={isSwahili}
            onClose={() => setShowRecoveryModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Milestone Details Modal */}
      <AnimatePresence>
        {showMilestoneDetails && (
          <MilestoneDetailsModal
            currentStreak={streakStatus?.currentStreak || 0}
            isSwahili={isSwahili}
            onClose={() => setShowMilestoneDetails(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Compact version for dashboard
function CompactStreakWidget({
  streakStatus,
  attention,
  statusMessage,
  isSwahili,
  onShowRecovery,
}: {
  streakStatus: StreakStatus | null;
  attention: ReturnType<typeof streakNeedsAttention>;
  statusMessage: { emoji: string; message: string };
  isSwahili: boolean;
  onShowRecovery: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-gradient-to-r ${
        attention.type === 'can_recover'
          ? 'from-amber-500 to-orange-500'
          : attention.type === 'at_risk'
          ? 'from-red-500 to-orange-500'
          : 'from-orange-500 to-red-500'
      } rounded-xl p-3 text-white`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{getStreakFireEmoji(streakStatus?.currentStreak || 0)}</span>
          <div>
            <p className="font-bold">{streakStatus?.currentStreak || 0} {isSwahili ? 'siku' : 'days'}</p>
            <p className="text-xs text-orange-100">{statusMessage.message}</p>
          </div>
        </div>
        {attention.type === 'can_recover' && (
          <button
            onClick={onShowRecovery}
            className="px-3 py-1.5 bg-white text-orange-600 rounded-lg text-sm font-medium"
          >
            {isSwahili ? 'Okoa' : 'Save'}
          </button>
        )}
        {streakStatus?.nextMilestone && !attention.type && (
          <div className="text-right">
            <p className="text-xs text-orange-100">{isSwahili ? 'Ijayo' : 'Next'}</p>
            <p className="font-semibold">{streakStatus.nextMilestone.icon} {streakStatus.nextMilestone.days}d</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Next Milestone Card
function NextMilestoneCard({
  milestone,
  isSwahili,
  onClick,
}: {
  milestone: NextMilestone;
  isSwahili: boolean;
  onClick: () => void;
}) {
  const progress = ((milestone.days - milestone.daysRemaining) / milestone.days) * 100;

  return (
    <button
      onClick={onClick}
      className="w-full bg-white/20 rounded-xl p-3 text-left hover:bg-white/30 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{milestone.icon}</span>
          <div>
            <p className="font-semibold text-sm">
              {isSwahili ? milestone.nameSw : milestone.name}
            </p>
            <p className="text-xs text-orange-100">
              {milestone.daysRemaining} {isSwahili ? 'siku zilizobaki' : 'days left'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs bg-white/20 px-2 py-1 rounded-full">
          {milestone.rewardType === 'points' && (
            <>
              <Star className="w-3 h-3" />
              +{milestone.rewardValue}
            </>
          )}
          {milestone.rewardType === 'raffle' && (
            <>
              <Ticket className="w-3 h-3" />
              {isSwahili ? 'Tiketi' : 'Raffle'}
            </>
          )}
          {milestone.rewardType === 'voice_tip' && (
            <>
              <Volume2 className="w-3 h-3" />
              {isSwahili ? 'Kidokezo' : 'Tip'}
            </>
          )}
        </div>
      </div>
      <div className="h-1.5 bg-white/30 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          className="h-full bg-white rounded-full"
        />
      </div>
    </button>
  );
}

// Recent Milestones
function RecentMilestones({
  milestones,
  isSwahili,
}: {
  milestones: RecentMilestoneClaim[];
  isSwahili: boolean;
}) {
  return (
    <div className="mt-4">
      <p className="text-xs text-orange-100 mb-2">
        {isSwahili ? 'Tuzo za Hivi Karibuni' : 'Recent Rewards'}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {milestones.map((milestone, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex-shrink-0 bg-white/20 rounded-lg p-2 text-center"
          >
            <span className="text-xl">{milestone.icon}</span>
            <p className="text-xs font-medium">{milestone.milestoneDays}d</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Streak Recovery Modal
function StreakRecoveryModal({
  userId,
  streakStatus,
  isSwahili,
  onClose,
}: {
  userId: string;
  streakStatus: StreakStatus | null;
  isSwahili: boolean;
  onClose: () => void;
}) {
  useTranslation();
  const saveStreak = useSaveStreak();
  const recordActivity = useRecordActivity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<'photo_upload' | 'price_check' | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `streak_save_${userId}_${Date.now()}.${fileExt}`;
      const filePath = `streak-saves/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);
      setUploadedPhotoUrl(urlData.publicUrl);
    } catch (err) {
      setError(isSwahili ? 'Imeshindwa kupakia picha' : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  const handleSaveStreak = async () => {
    if (!selectedChallenge) return;

    try {
      setError(null);
      const result = await saveStreak.mutateAsync({
        userId,
        challengeType: selectedChallenge,
        evidenceUrl: uploadedPhotoUrl || undefined,
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(onClose, 2000);
      } else {
        setError(result.error || result.reason || 'Failed to save streak');
      }
    } catch (err) {
      setError(isSwahili ? 'Imeshindwa kuokoa mfululizo' : 'Failed to save streak');
    }
  };

  const handlePriceCheck = async () => {
    setSelectedChallenge('price_check');
    try {
      // Record the price check activity
      await recordActivity.mutateAsync({
        userId,
        activityType: 'price_check',
        activityName: 'Streak Recovery Price Check',
        activityNameSw: 'Kuangalia Bei kwa Kuokoa Mfululizo',
      });

      // Then save the streak
      const result = await saveStreak.mutateAsync({
        userId,
        challengeType: 'price_check',
      });

      if (result.success) {
        setSuccess(true);
        setTimeout(onClose, 2000);
      } else {
        setError(result.error || result.reason || 'Failed to save streak');
      }
    } catch (err) {
      setError(isSwahili ? 'Imeshindwa kuokoa mfululizo' : 'Failed to save streak');
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center max-w-sm"
        >
          <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {isSwahili ? 'Mfululizo Umeokolewa!' : 'Streak Saved!'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {isSwahili
              ? `Mfululizo wako wa siku ${streakStatus?.currentStreak} unaendelea!`
              : `Your ${streakStatus?.currentStreak}-day streak continues!`}
          </p>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-5 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8" />
              <div>
                <h3 className="font-bold text-lg">
                  {isSwahili ? 'Okoa Mfululizo Wako!' : 'Save Your Streak!'}
                </h3>
                <p className="text-amber-100 text-sm">
                  {isSwahili
                    ? `Siku ${streakStatus?.currentStreak} za mfululizo ziko hatarini`
                    : `${streakStatus?.currentStreak}-day streak at risk`}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {isSwahili
              ? 'Kamilisha moja ya changamoto hizi ili kuokoa mfululizo wako:'
              : 'Complete one of these challenges to save your streak:'}
          </p>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Challenge Options */}
          <div className="space-y-3">
            {/* Photo Upload Challenge */}
            <div
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                selectedChallenge === 'photo_upload'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
              }`}
              onClick={() => setSelectedChallenge('photo_upload')}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <Camera className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {isSwahili ? 'Pakia Picha ya Mazao' : 'Upload Crop Photo'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isSwahili
                      ? 'Pakia picha ya shamba lako au mazao'
                      : 'Upload a photo of your field or crops'}
                  </p>
                </div>
                {selectedChallenge === 'photo_upload' && (
                  <Check className="w-6 h-6 text-amber-500" />
                )}
              </div>

              {selectedChallenge === 'photo_upload' && (
                <div className="mt-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handlePhotoUpload}
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                  />
                  {uploadedPhotoUrl ? (
                    <div className="relative">
                      <img
                        src={uploadedPhotoUrl}
                        alt="Uploaded"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <div className="absolute top-2 right-2 w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full py-3 border-2 border-dashed border-amber-300 rounded-lg text-amber-600 flex items-center justify-center gap-2 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {uploading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                      {isSwahili ? 'Piga au Chagua Picha' : 'Take or Select Photo'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Price Check Challenge */}
            <div
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                selectedChallenge === 'price_check'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-amber-300'
              }`}
              onClick={() => setSelectedChallenge('price_check')}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {isSwahili ? 'Angalia Bei za Soko' : 'Check Market Prices'}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {isSwahili
                      ? 'Bonyeza kuangalia bei za leo za mazao'
                      : 'Tap to check today\'s crop prices'}
                  </p>
                </div>
                {selectedChallenge === 'price_check' && (
                  <Check className="w-6 h-6 text-amber-500" />
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={selectedChallenge === 'price_check' ? handlePriceCheck : handleSaveStreak}
            disabled={
              !selectedChallenge ||
              (selectedChallenge === 'photo_upload' && !uploadedPhotoUrl) ||
              saveStreak.isPending ||
              recordActivity.isPending
            }
            className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:from-amber-600 hover:to-orange-600 transition-colors"
          >
            {saveStreak.isPending || recordActivity.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Flame className="w-5 h-5" />
            )}
            {isSwahili ? 'Okoa Mfululizo Wangu' : 'Save My Streak'}
          </button>

          <p className="text-xs text-gray-400 text-center">
            {isSwahili
              ? 'Unaweza kutumia kuokoa mfululizo mara moja kwa wiki'
              : 'Streak save can only be used once per week'}
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Milestone Details Modal
function MilestoneDetailsModal({
  currentStreak,
  isSwahili,
  onClose,
}: {
  currentStreak: number;
  isSwahili: boolean;
  onClose: () => void;
}) {
  const milestones = [
    { days: 3, icon: '🔥', reward: 'Voice Tip', rewardSw: 'Kidokezo cha Sauti', points: 5 },
    { days: 7, icon: '⭐', reward: '10 Points', rewardSw: 'Pointi 10', points: 10 },
    { days: 14, icon: '🌟', reward: '25 Points', rewardSw: 'Pointi 25', points: 25 },
    { days: 21, icon: '💫', reward: '40 Points', rewardSw: 'Pointi 40', points: 40 },
    { days: 30, icon: '🏆', reward: 'Raffle Entry', rewardSw: 'Tiketi ya Bahati', points: 100 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[80vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {isSwahili ? 'Hatua za Mfululizo' : 'Streak Milestones'}
            </h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-3">
            {milestones.map((milestone) => {
              const isCompleted = currentStreak >= milestone.days;
              const isNext = !isCompleted && currentStreak < milestone.days;
              const progress = Math.min(100, (currentStreak / milestone.days) * 100);

              return (
                <div
                  key={milestone.days}
                  className={`p-4 rounded-xl border-2 ${
                    isCompleted
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/20'
                      : isNext
                      ? 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                        isCompleted
                          ? 'bg-emerald-100 dark:bg-emerald-900/50'
                          : 'bg-gray-100 dark:bg-gray-700'
                      }`}
                    >
                      {milestone.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {milestone.days} {isSwahili ? 'Siku' : 'Days'}
                        </p>
                        {isCompleted && (
                          <Check className="w-5 h-5 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isSwahili ? milestone.rewardSw : milestone.reward}
                      </p>
                    </div>
                  </div>
                  {!isCompleted && (
                    <div className="mt-3">
                      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className="h-full bg-orange-500 rounded-full"
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {currentStreak}/{milestone.days} {isSwahili ? 'siku' : 'days'}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Export compact widget for dashboard
export function StreakWidgetCompact({ userId }: { userId: string | undefined }) {
  return <StreakWidget userId={userId} compact showActivities={false} />;
}
