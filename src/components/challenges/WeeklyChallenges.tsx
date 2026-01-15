import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Camera,
  CheckCircle2,
  Clock,
  ChevronRight,
  Trophy,
  Upload,
  X,
  Loader2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useActiveChallengesWithProgress,
  useChallengeHistory,
  useSubmitPhoto,
  getChallengeTypeInfo,
  getPhotoTypeInfo,
  calculateChallengeTimeRemaining,
} from '../../hooks/useChallenges';
import type { WeeklyChallenge, PhotoType } from '../../types';

interface WeeklyChallengesProps {
  userId: string | undefined;
}

export default function WeeklyChallenges({ userId }: WeeklyChallengesProps) {
  const { t, i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const { data: challenges, isLoading } = useActiveChallengesWithProgress(userId);
  const { data: history } = useChallengeHistory(userId);
  const submitPhoto = useSubmitPhoto();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<WeeklyChallenge | null>(null);

  const activeCount = challenges?.filter((c) => !c.isCompleted).length || 0;
  const completedCount = challenges?.filter((c) => c.isCompleted).length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('challenges.title', 'Weekly Challenges')}</h2>
              <p className="text-amber-100 text-sm">
                {t('challenges.subtitle', 'Complete challenges to earn rewards')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{activeCount}</p>
              <p className="text-amber-100 text-xs">{t('challenges.active', 'Active')}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{completedCount}</p>
              <p className="text-amber-100 text-xs">{t('challenges.completed', 'Completed')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'active'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {t('challenges.tab.active', 'Active')}
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-xs rounded-full">
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'completed'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {t('challenges.tab.completed', 'Completed')}
        </button>
      </div>

      {/* Challenge Cards */}
      <AnimatePresence mode="wait">
        {activeTab === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {challenges && challenges.filter((c) => !c.isCompleted).length > 0 ? (
              challenges
                .filter((c) => !c.isCompleted)
                .map((challenge) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    isSwahili={isSwahili}
                    onPhotoUpload={() => {
                      setSelectedChallenge(challenge);
                      setPhotoModalOpen(true);
                    }}
                  />
                ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-amber-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('challenges.allComplete', 'All challenges completed!')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('challenges.checkBack', 'Check back next week for new challenges')}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'completed' && (
          <motion.div
            key="completed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {history && history.length > 0 ? (
              history.map((challenge) => (
                <CompletedChallengeCard
                  key={challenge.id}
                  challenge={challenge}
                  isSwahili={isSwahili}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Zap className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('challenges.noCompleted', 'No completed challenges yet')}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Photo Upload Modal */}
      <PhotoUploadModal
        isOpen={photoModalOpen}
        onClose={() => {
          setPhotoModalOpen(false);
          setSelectedChallenge(null);
        }}
        challenge={selectedChallenge}
        userId={userId}
        onSubmit={submitPhoto}
        isSwahili={isSwahili}
      />
    </div>
  );
}

// Challenge Card Component
function ChallengeCard({
  challenge,
  isSwahili,
  onPhotoUpload,
}: {
  challenge: WeeklyChallenge & {
    userProgress: { currentProgress: number; targetProgress: number; status: string } | null;
    progressPercentage: number;
    isCompleted: boolean;
    isStarted: boolean;
  };
  isSwahili: boolean;
  onPhotoUpload: () => void;
}) {
  const { t } = useTranslation();
  const typeInfo = getChallengeTypeInfo(challenge.challengeType);
  const timeRemaining = calculateChallengeTimeRemaining(challenge.endDate);
  const progress = challenge.userProgress?.currentProgress || 0;
  const target = challenge.targetCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-start gap-3">
        <div className={`w-12 h-12 rounded-xl bg-${typeInfo.color}-100 dark:bg-${typeInfo.color}-900/30 flex items-center justify-center text-2xl`}>
          {typeInfo.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {isSwahili && challenge.nameSw ? challenge.nameSw : challenge.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {isSwahili && challenge.descriptionSw
                  ? challenge.descriptionSw
                  : challenge.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">+{challenge.xpReward} XP</p>
              <p className="text-xs text-gray-500">+{challenge.pointsReward} pts</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                {progress}/{target} {t('challenges.completed', 'completed')}
              </span>
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeRemaining}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${challenge.progressPercentage}%` }}
                className="h-full bg-amber-500 rounded-full"
              />
            </div>
          </div>

          {/* Action Button */}
          {challenge.challengeType === 'photo' && (
            <button
              onClick={onPhotoUpload}
              className="mt-3 w-full py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
            >
              <Camera className="w-4 h-4" />
              {t('challenges.uploadPhoto', 'Upload Photo')}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Completed Challenge Card
function CompletedChallengeCard({
  challenge,
  isSwahili,
}: {
  challenge: {
    challengeName?: string;
    challengeNameSw?: string;
    challengeType?: string;
    xpAwarded: number;
    pointsAwarded: number;
    completedAt?: string;
  };
  isSwahili: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {isSwahili && challenge.challengeNameSw
              ? challenge.challengeNameSw
              : challenge.challengeName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {challenge.completedAt && new Date(challenge.completedAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
            +{challenge.xpAwarded} XP
          </span>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            +{challenge.pointsAwarded} pts
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Photo Upload Modal
function PhotoUploadModal({
  isOpen,
  onClose,
  challenge,
  userId,
  onSubmit,
  isSwahili,
}: {
  isOpen: boolean;
  onClose: () => void;
  challenge: WeeklyChallenge | null;
  userId: string | undefined;
  onSubmit: ReturnType<typeof useSubmitPhoto>;
  isSwahili: boolean;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<PhotoType>('crop');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const photoTypes: PhotoType[] = ['pest', 'crop', 'soil', 'harvest', 'field', 'other'];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        return;
      }
      setSelectedFile(file);
      // Create preview
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  };

  const removePhoto = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setSelectedFile(null);
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!userId || !selectedFile) return;

    setUploading(true);
    try {
      // Convert file to base64 data URL for storage
      const reader = new FileReader();
      const photoUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      await onSubmit.mutateAsync({
        userId,
        photoUrl,
        photoType: selectedType,
        challengeId: challenge?.id,
      });

      // Cleanup and close
      removePhoto();
      onClose();
    } catch (error) {
      console.error('Failed to submit photo:', error);
    } finally {
      setUploading(false);
    }
  };

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  if (!isOpen) return null;

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
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {t('challenges.uploadPhoto', 'Upload Photo')}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Photo Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('challenges.photoType', 'Photo Type')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {photoTypes.map((type) => {
                const info = getPhotoTypeInfo(type);
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedType(type)}
                    className={`p-3 rounded-lg text-center transition-colors ${
                      selectedType === type
                        ? 'bg-amber-100 dark:bg-amber-900/30 border-2 border-amber-500'
                        : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent'
                    }`}
                  >
                    <span className="text-xl">{info.icon}</span>
                    <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                      {isSwahili ? info.nameSw : info.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isSwahili ? 'Pakia Picha' : 'Upload Photo'}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />

            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded-xl border-2 border-amber-500"
                />
                <button
                  onClick={removePhoto}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  {selectedFile?.name}
                </div>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors"
              >
                <Camera className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {isSwahili ? 'Bofya kupiga picha' : 'Tap to take photo'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {isSwahili ? 'au chagua kutoka galari' : 'or choose from gallery'}
                </p>
              </button>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!selectedFile || uploading}
            className="w-full py-3 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
            {isSwahili ? 'Wasilisha Picha' : t('challenges.submit', 'Submit Photo')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Compact widget for dashboard
export function ChallengesWidget({ userId, onClick }: { userId: string | undefined; onClick?: () => void }) {
  const { t } = useTranslation();
  const { data: challenges } = useActiveChallengesWithProgress(userId);

  const activeCount = challenges?.filter((c) => !c.isCompleted).length || 0;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="w-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-3 text-white text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">{t('challenges.weeklyTitle', 'Weekly Challenges')}</p>
            <p className="text-xs text-amber-100">
              {activeCount} {t('challenges.active', 'active')}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" />
      </div>
    </motion.button>
  );
}
