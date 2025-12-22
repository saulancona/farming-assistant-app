import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Clock,
  ChevronRight,
  Play,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Trophy,
  Loader2,
  ArrowLeft,
  Check,
  Camera,
  Image,
  X,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from 'react-i18next';
import {
  useAvailableMissions,
  useUserMissions,
  useStartMission,
  useMissionStepProgress,
  useCompleteMissionStep,
  getMissionDifficultyInfo,
  getSeasonInfo,
  calculateDaysRemaining,
  getMissionRewardInfo,
  getWeatherTriggerInfo,
} from '../../hooks/useMissions';
import type { SeasonalMission, UserMission, MissionStepProgress, WeatherTrigger } from '../../types';

interface MissionHubProps {
  userId: string | undefined;
  userFields?: Array<{ id: string; name: string; cropType: string }>;
}

export default function MissionHub({ userId, userFields = [] }: MissionHubProps) {
  const { t, i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const { data: availableMissions, isLoading: missionsLoading } = useAvailableMissions();
  const { data: userMissions, isLoading: userMissionsLoading } = useUserMissions(userId, 'all');
  const startMission = useStartMission();

  const [selectedMission, setSelectedMission] = useState<SeasonalMission | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'available' | 'active' | 'completed'>('available');
  const [error, setError] = useState<string | null>(null);
  const [viewingMission, setViewingMission] = useState<UserMission | null>(null);

  const activeMissions = userMissions?.filter((m) => m.status === 'active') || [];
  const completedMissions = userMissions?.filter((m) => m.status === 'completed') || [];

  // Filter out missions user already has active
  const activeMissionIds = activeMissions.map((m) => m.missionId);
  const filteredAvailable = availableMissions?.filter((m) => !activeMissionIds.includes(m.id)) || [];

  const handleStartMission = async () => {
    if (!userId || !selectedMission) {
      setError('Missing user ID or mission');
      return;
    }

    setError(null);
    try {
      const result = await startMission.mutateAsync({
        userId,
        missionId: selectedMission.id,
        fieldId: selectedFieldId || undefined,
      });

      if (result && !result.success) {
        setError(result.error || 'Failed to start mission');
        return;
      }

      setSelectedMission(null);
      setSelectedFieldId('');
      setActiveTab('active');
    } catch (err: unknown) {
      // Handle various error types from Supabase
      let errorMessage = 'Unknown error occurred';
      if (err && typeof err === 'object') {
        if ('message' in err && typeof err.message === 'string') {
          errorMessage = err.message;
        } else if ('error_description' in err && typeof err.error_description === 'string') {
          errorMessage = err.error_description;
        } else if ('details' in err && typeof err.details === 'string') {
          errorMessage = err.details;
        } else {
          // Try to stringify the error for debugging
          try {
            errorMessage = JSON.stringify(err);
          } catch {
            errorMessage = 'Failed to start mission';
          }
        }
      }
      setError(errorMessage);
    }
  };

  if (missionsLoading || userMissionsLoading) {
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
        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('missions.title', 'Seasonal Missions')}</h2>
              <p className="text-indigo-100 text-sm">
                {t('missions.subtitle', 'Follow crop plans step by step')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{activeMissions.length}</p>
              <p className="text-indigo-100 text-xs">{t('missions.active', 'Active')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{completedMissions.length}</p>
              <p className="text-indigo-100 text-xs">{t('missions.completed', 'Completed')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{filteredAvailable.length}</p>
              <p className="text-indigo-100 text-xs">{t('missions.available', 'Available')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        {(['available', 'active', 'completed'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t(`missions.tab.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
            {tab === 'active' && activeMissions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-indigo-500 text-white text-xs rounded-full">
                {activeMissions.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'available' && (
          <motion.div
            key="available"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {filteredAvailable.length > 0 ? (
              filteredAvailable.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  isSwahili={isSwahili}
                  onClick={() => setSelectedMission(mission)}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('missions.noAvailable', 'No available missions')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('missions.checkBack', 'Check back later for new missions')}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'active' && (
          <motion.div
            key="active"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {activeMissions.length > 0 ? (
              activeMissions.map((mission) => (
                <ActiveMissionCard
                  key={mission.id}
                  mission={mission}
                  isSwahili={isSwahili}
                  onClick={() => setViewingMission(mission)}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Play className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('missions.noActive', 'No active missions')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('missions.startOne', 'Start a mission from the Available tab')}
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
            {completedMissions.length > 0 ? (
              completedMissions.map((mission) => (
                <CompletedMissionCard
                  key={mission.id}
                  mission={mission}
                  isSwahili={isSwahili}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('missions.noCompleted', 'No completed missions yet')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('missions.completeFirst', 'Complete your first mission!')}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Start Mission Modal */}
      <AnimatePresence>
        {selectedMission && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedMission(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mission Header */}
              <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 text-white rounded-t-2xl sm:rounded-t-2xl">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-3xl">
                    {getMissionDifficultyInfo(selectedMission.difficulty).icon}
                  </span>
                  <div>
                    <h3 className="text-xl font-bold">
                      {isSwahili && selectedMission.nameSw
                        ? selectedMission.nameSw
                        : selectedMission.name}
                    </h3>
                    <p className="text-indigo-100 text-sm">
                      {selectedMission.cropType && `🌾 ${selectedMission.cropType}`}
                      {selectedMission.season && ` • ${getSeasonInfo(selectedMission.season).icon} ${getSeasonInfo(selectedMission.season).name}`}
                    </p>
                  </div>
                </div>
                <p className="text-indigo-100 text-sm">
                  {isSwahili && selectedMission.descriptionSw
                    ? selectedMission.descriptionSw
                    : selectedMission.description}
                </p>
              </div>

              <div className="p-4 space-y-4">
                {/* Rewards */}
                <div className="flex gap-4">
                  <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      +{selectedMission.xpReward}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">XP</p>
                  </div>
                  <div className="flex-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                      +{selectedMission.pointsReward}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">{t('missions.points', 'Points')}</p>
                  </div>
                  <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {selectedMission.durationDays}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('missions.days', 'Days')}</p>
                  </div>
                </div>

                {/* Completion Bonus Rewards */}
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-300 mb-2">
                    {t('missions.completionBonuses', 'Completion Bonuses')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">
                      <span>🏅</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('missions.seasonalBadge', 'Seasonal Badge')}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">
                      <span>🏪</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('missions.priorityMarket', 'Priority Market (30 days)')}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-full text-xs">
                      <span>✨</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {t('missions.doubleReferral', '2x Referral Points (7 days)')}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Steps Preview */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {t('missions.steps', 'Mission Steps')} ({selectedMission.steps.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {selectedMission.steps.map((step, index) => {
                      const weatherInfo = step.weather_trigger ? getWeatherTriggerInfo(step.weather_trigger as WeatherTrigger) : null;
                      return (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 dark:text-gray-300 flex-1">
                            {isSwahili && step.name_sw ? step.name_sw : step.name}
                          </span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {weatherInfo && (
                              <span className="text-xs" title={isSwahili ? weatherInfo.nameSw : weatherInfo.name}>
                                {weatherInfo.icon}
                              </span>
                            )}
                            {step.photo_required && (
                              <span className="text-xs" title={t('missions.photoRequired', 'Photo required')}>
                                📷
                              </span>
                            )}
                            <span className="text-xs text-gray-400">
                              Day {step.day_offset}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Field Selection */}
                {userFields.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('missions.selectField', 'Link to Field (Optional)')}
                    </label>
                    <select
                      value={selectedFieldId}
                      onChange={(e) => setSelectedFieldId(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">{t('missions.noField', 'No field linked')}</option>
                      {userFields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name} ({field.cropType})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-5 h-5 flex-shrink-0" />
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setSelectedMission(null);
                      setError(null);
                    }}
                    className="flex-1 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('common.cancel', 'Cancel')}
                  </button>
                  <button
                    onClick={handleStartMission}
                    disabled={startMission.isPending}
                    className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {startMission.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    {t('missions.startMission', 'Start Mission')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mission Progress Modal */}
      <AnimatePresence>
        {viewingMission && (
          <MissionProgressModal
            mission={viewingMission}
            isSwahili={isSwahili}
            onClose={() => setViewingMission(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Mission Progress Modal Component
function MissionProgressModal({
  mission,
  isSwahili,
  onClose,
}: {
  mission: UserMission;
  isSwahili: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: stepProgress, isLoading: stepsLoading } = useMissionStepProgress(mission.id);
  const completeMissionStep = useCompleteMissionStep();
  const [completingStep, setCompletingStep] = useState<number | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<number | null>(null);
  const [stepPhotos, setStepPhotos] = useState<Record<number, { file: File; preview: string; url?: string }>>({});

  const daysRemaining = calculateDaysRemaining(mission.targetDate);
  const isOverdue = daysRemaining < 0;

  const handlePhotoUpload = async (stepIndex: number, file: File) => {
    setUploadingPhoto(stepIndex);
    setStepError(null);

    try {
      // Create a preview immediately
      const preview = URL.createObjectURL(file);
      setStepPhotos((prev) => ({ ...prev, [stepIndex]: { file, preview } }));

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `mission_${mission.id}_step_${stepIndex}_${Date.now()}.${fileExt}`;
      const filePath = `mission-evidence/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('photos').getPublicUrl(filePath);

      setStepPhotos((prev) => ({
        ...prev,
        [stepIndex]: { ...prev[stepIndex], url: urlData.publicUrl },
      }));
    } catch (err: unknown) {
      let errorMessage = 'Failed to upload photo';
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }
      setStepError(errorMessage);
      // Remove the failed photo
      setStepPhotos((prev) => {
        const newPhotos = { ...prev };
        delete newPhotos[stepIndex];
        return newPhotos;
      });
    } finally {
      setUploadingPhoto(null);
    }
  };

  const removePhoto = (stepIndex: number) => {
    const photo = stepPhotos[stepIndex];
    if (photo?.preview) {
      URL.revokeObjectURL(photo.preview);
    }
    setStepPhotos((prev) => {
      const newPhotos = { ...prev };
      delete newPhotos[stepIndex];
      return newPhotos;
    });
  };

  const handleCompleteStep = async (stepIndex: number) => {
    const photo = stepPhotos[stepIndex];
    if (!photo?.url) {
      setStepError(t('missions.photoRequired', 'Please upload a photo to complete this step'));
      return;
    }

    setCompletingStep(stepIndex);
    setStepError(null);
    try {
      const result = await completeMissionStep.mutateAsync({
        userMissionId: mission.id,
        stepIndex,
        evidencePhotoUrl: photo.url,
      });

      if (result && !result.success) {
        setStepError(result.error || 'Failed to complete step');
      } else {
        // Clear the photo from state after successful completion
        removePhoto(stepIndex);
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to complete step';
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }
      setStepError(errorMessage);
    } finally {
      setCompletingStep(null);
    }
  };

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
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-br from-indigo-500 to-purple-600 p-4 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h3 className="font-bold">
                {isSwahili && mission.missionNameSw ? mission.missionNameSw : mission.missionName}
              </h3>
              <div className="flex items-center gap-2 text-sm text-indigo-100">
                {mission.fieldName && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {mission.fieldName}
                  </span>
                )}
                <span className={isOverdue ? 'text-red-200' : ''}>
                  {isOverdue
                    ? t('missions.overdue', 'Overdue')
                    : `${daysRemaining} ${t('missions.daysLeft', 'days left')}`}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span>
                {t('missions.step', 'Step')} {mission.currentStep}/{mission.totalSteps}
              </span>
              <span>{Math.round(mission.progressPercentage)}%</span>
            </div>
            <div className="h-2 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${mission.progressPercentage}%` }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Steps List */}
        <div className="p-4 space-y-3">
          {stepError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{stepError}</p>
              </div>
            </div>
          )}

          {stepsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            stepProgress?.map((step, index) => (
              <MissionStepCard
                key={step.id}
                step={step}
                stepNumber={index + 1}
                isCompleting={completingStep === step.stepIndex}
                isUploadingPhoto={uploadingPhoto === step.stepIndex}
                uploadedPhoto={stepPhotos[step.stepIndex]}
                onPhotoUpload={(file) => handlePhotoUpload(step.stepIndex, file)}
                onRemovePhoto={() => removePhoto(step.stepIndex)}
                onComplete={() => handleCompleteStep(step.stepIndex)}
              />
            ))
          )}

          {stepProgress?.length === 0 && !stepsLoading && (
            <div className="text-center py-8 text-gray-500">
              <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p>{t('missions.noSteps', 'No steps found')}</p>
            </div>
          )}
        </div>

        {/* Rewards Preview */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('missions.completionRewards', 'Completion Rewards')}:
          </p>
          <div className="flex gap-4 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⭐</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                +{mission.missionXpReward} XP
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg">🪙</span>
              <span className="font-medium text-amber-600 dark:text-amber-400">
                +{mission.missionPointsReward} {t('missions.points', 'pts')}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs">
              <span>🏅</span>
              <span>{t('missions.seasonalBadge', 'Seasonal Badge')}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-xs">
              <span>🏪</span>
              <span>{t('missions.priorityMarket30', 'Priority Market 30d')}</span>
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-xs">
              <span>✨</span>
              <span>{t('missions.doubleReferral7', '2x Referrals 7d')}</span>
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Mission Step Card Component
function MissionStepCard({
  step,
  stepNumber,
  isCompleting,
  isUploadingPhoto,
  uploadedPhoto,
  onPhotoUpload,
  onRemovePhoto,
  onComplete,
}: {
  step: MissionStepProgress;
  stepNumber: number;
  isCompleting: boolean;
  isUploadingPhoto: boolean;
  uploadedPhoto?: { file: File; preview: string; url?: string };
  onPhotoUpload: (file: File) => void;
  onRemovePhoto: () => void;
  onComplete: () => void;
}) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isCompleted = step.status === 'completed';
  const isInProgress = step.status === 'in_progress';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        return;
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return;
      }
      onPhotoUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const hasPhotoUploaded = uploadedPhoto?.url;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: stepNumber * 0.05 }}
      className={`p-4 rounded-xl border ${
        isCompleted
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
          : isInProgress
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Step Number / Status Icon */}
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            isCompleted
              ? 'bg-emerald-500 text-white'
              : isInProgress
              ? 'bg-blue-500 text-white'
              : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
          }`}
        >
          {isCompleted ? (
            <Check className="w-5 h-5" />
          ) : (
            <span className="text-sm font-medium">{stepNumber}</span>
          )}
        </div>

        {/* Step Content */}
        <div className="flex-1">
          <h4
            className={`font-medium ${
              isCompleted
                ? 'text-emerald-800 dark:text-emerald-300'
                : isInProgress
                ? 'text-blue-800 dark:text-blue-300'
                : 'text-gray-700 dark:text-gray-300'
            }`}
          >
            {step.stepName}
          </h4>
          {step.stepDescription && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {step.stepDescription}
            </p>
          )}

          {/* Due Date and Weather Trigger */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {step.dueDate && (
              <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('missions.dueBy', 'Due')}: {new Date(step.dueDate).toLocaleDateString()}
              </p>
            )}
            {step.weatherTrigger && (() => {
              const weatherInfo = getWeatherTriggerInfo(step.weatherTrigger);
              if (!weatherInfo) return null;
              return (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-${weatherInfo.color}-100 dark:bg-${weatherInfo.color}-900/30 text-${weatherInfo.color}-700 dark:text-${weatherInfo.color}-300`}>
                  <span>{weatherInfo.icon}</span>
                  <span>{weatherInfo.name}</span>
                </span>
              );
            })()}
          </div>

          {/* Completed Info with Evidence Photo */}
          {isCompleted && step.completedAt && (
            <div className="mt-2">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {t('missions.completedOn', 'Completed')}: {new Date(step.completedAt).toLocaleDateString()}
                {step.xpAwarded > 0 && ` (+${step.xpAwarded} XP)`}
              </p>
              {step.evidencePhotoUrl && (
                <div className="mt-2">
                  <img
                    src={step.evidencePhotoUrl}
                    alt="Evidence"
                    className="w-16 h-16 rounded-lg object-cover border border-emerald-200 dark:border-emerald-700"
                  />
                </div>
              )}
            </div>
          )}

          {/* Photo Upload Section for In-Progress Steps */}
          {isInProgress && (
            <div className="mt-3">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              {uploadedPhoto ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={uploadedPhoto.preview}
                      alt="Evidence preview"
                      className="w-20 h-20 rounded-lg object-cover border-2 border-blue-300 dark:border-blue-600"
                    />
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                    {uploadedPhoto.url && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    )}
                    <button
                      onClick={onRemovePhoto}
                      className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {uploadedPhoto.url ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('missions.photoReady', 'Photo ready')}
                      </span>
                    ) : isUploadingPhoto ? (
                      <span>{t('missions.uploading', 'Uploading...')}</span>
                    ) : (
                      <span>{t('missions.uploadFailed', 'Upload failed')}</span>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50"
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                  {t('missions.uploadPhoto', 'Upload Photo Evidence')}
                </button>
              )}

              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                <Image className="w-3 h-3" />
                {t('missions.photoRequiredHint', 'Photo required to complete step')}
              </p>
            </div>
          )}
        </div>

        {/* Complete Button - Only show when photo is uploaded */}
        {isInProgress && hasPhotoUploaded && (
          <button
            onClick={onComplete}
            disabled={isCompleting || !hasPhotoUploaded}
            className="px-3 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 self-end"
          >
            {isCompleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Check className="w-4 h-4" />
            )}
            {t('missions.complete', 'Complete')}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Mission Card Component
function MissionCard({
  mission,
  isSwahili,
  onClick,
}: {
  mission: SeasonalMission;
  isSwahili: boolean;
  onClick: () => void;
}) {
  const difficultyInfo = getMissionDifficultyInfo(mission.difficulty);
  const seasonInfo = getSeasonInfo(mission.season);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 text-left hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{difficultyInfo.icon}</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {isSwahili && mission.nameSw ? mission.nameSw : mission.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
            {isSwahili && mission.descriptionSw ? mission.descriptionSw : mission.description}
          </p>
          <div className="flex items-center gap-3 mt-2 text-xs">
            {mission.cropType && (
              <span className="text-gray-500 dark:text-gray-400">🌾 {mission.cropType}</span>
            )}
            <span className="text-gray-500 dark:text-gray-400">
              {seasonInfo.icon} {seasonInfo.name}
            </span>
            <span className={`px-2 py-0.5 rounded-full bg-${difficultyInfo.color}-100 dark:bg-${difficultyInfo.color}-900/30 text-${difficultyInfo.color}-600 dark:text-${difficultyInfo.color}-400`}>
              {isSwahili ? difficultyInfo.nameSw : difficultyInfo.name}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">+{mission.xpReward}</p>
          <p className="text-xs text-gray-500">XP</p>
        </div>
      </div>
    </motion.button>
  );
}

// Active Mission Card Component
function ActiveMissionCard({
  mission,
  isSwahili,
  onClick,
}: {
  mission: UserMission;
  isSwahili: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const daysRemaining = calculateDaysRemaining(mission.targetDate);
  const isOverdue = daysRemaining < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {isSwahili && mission.missionNameSw ? mission.missionNameSw : mission.missionName}
          </h3>
          {mission.fieldName && (
            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {mission.fieldName}
            </p>
          )}
        </div>
        <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
          {isOverdue ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          {isOverdue
            ? t('missions.overdue', 'Overdue')
            : `${daysRemaining} ${t('missions.daysLeft', 'days left')}`}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">
            {t('missions.step', 'Step')} {mission.currentStep}/{mission.totalSteps}
          </span>
          <span className="font-medium text-indigo-600 dark:text-indigo-400">
            {Math.round(mission.progressPercentage)}%
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${mission.progressPercentage}%` }}
            className="h-full bg-indigo-500 rounded-full"
          />
        </div>
      </div>

      <button className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
        {t('missions.continue', 'Continue Mission')}
        <ChevronRight className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

// Completed Mission Card Component
function CompletedMissionCard({ mission, isSwahili }: { mission: UserMission; isSwahili: boolean }) {
  const { t } = useTranslation();
  const rewards = getMissionRewardInfo(mission);

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
          <h3 className="font-semibold text-gray-900 dark:text-white">
            {isSwahili && mission.missionNameSw ? mission.missionNameSw : mission.missionName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('missions.completedOn', 'Completed')}: {new Date(mission.completedAt!).toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">+{mission.xpEarned} XP</span>
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">+{mission.pointsEarned} pts</span>
          </div>
        </div>
      </div>

      {/* Earned Rewards Indicators */}
      {rewards.length > 0 && (
        <div className="mt-3 pt-3 border-t border-emerald-100 dark:border-emerald-900">
          <div className="flex flex-wrap gap-2">
            {rewards.map((reward, idx) => (
              <span
                key={idx}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                  reward.isActive === false
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                }`}
              >
                <span>{reward.icon}</span>
                <span>{isSwahili ? reward.nameSw : reward.name}</span>
                {reward.isActive !== undefined && (
                  <span className="text-[10px]">
                    ({isSwahili ? reward.descriptionSw : reward.description})
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Compact widget for dashboard
export function MissionWidget({ userId, onClick }: { userId: string | undefined; onClick?: () => void }) {
  const { t } = useTranslation();
  const { data: userMissions } = useUserMissions(userId, 'active');

  const activeMission = userMissions?.[0];

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="w-full bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-100 dark:border-gray-700 text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {activeMission
                ? activeMission.missionName
                : t('missions.noActive', 'No Active Mission')}
            </p>
            {activeMission && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {Math.round(activeMission.progressPercentage)}% {t('missions.complete', 'complete')}
              </p>
            )}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>
      {activeMission && (
        <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${activeMission.progressPercentage}%` }}
            className="h-full bg-indigo-500 rounded-full"
          />
        </div>
      )}
    </motion.button>
  );
}
