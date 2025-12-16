import { useState } from 'react';
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
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useAvailableMissions,
  useUserMissions,
  useStartMission,
  getMissionDifficultyInfo,
  getSeasonInfo,
  calculateDaysRemaining,
} from '../../hooks/useMissions';
import type { SeasonalMission, UserMission } from '../../types';

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

  const activeMissions = userMissions?.filter((m) => m.status === 'active') || [];
  const completedMissions = userMissions?.filter((m) => m.status === 'completed') || [];

  // Filter out missions user already has active
  const activeMissionIds = activeMissions.map((m) => m.missionId);
  const filteredAvailable = availableMissions?.filter((m) => !activeMissionIds.includes(m.id)) || [];

  const handleStartMission = async () => {
    if (!userId || !selectedMission) return;

    try {
      await startMission.mutateAsync({
        userId,
        missionId: selectedMission.id,
        fieldId: selectedFieldId || undefined,
      });
      setSelectedMission(null);
      setSelectedFieldId('');
      setActiveTab('active');
    } catch (error) {
      console.error('Failed to start mission:', error);
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

                {/* Steps Preview */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    {t('missions.steps', 'Mission Steps')} ({selectedMission.steps.length})
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {selectedMission.steps.map((step, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {isSwahili && step.name_sw ? step.name_sw : step.name}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          Day {step.day_offset}
                        </span>
                      </div>
                    ))}
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

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedMission(null)}
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
    </div>
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
function ActiveMissionCard({ mission, isSwahili }: { mission: UserMission; isSwahili: boolean }) {
  const { t } = useTranslation();
  const daysRemaining = calculateDaysRemaining(mission.targetDate);
  const isOverdue = daysRemaining < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
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
