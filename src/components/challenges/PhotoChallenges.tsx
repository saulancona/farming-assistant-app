import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CheckCircle2,
  Clock,
  ChevronRight,
  Trophy,
  Upload,
  X,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
  Eye,
  Zap,
  Shield,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useActivePhotoChallenges,
  useUserPhotoStats,
  usePhotoChallengeLeaderboard,
  useSubmitChallengePhoto,
  useUserCropCoverage,
  getPhotoTypeIcon,
  getPhotoTypeLabel,
  getChallengeThemeIcon,
  getPhotoBonusInfo,
  getChallengeProgress,
  hasHealthyFarmBadge,
  getCropsNeedingPhotos,
} from '../../hooks/usePhotoChallenges';
import type {
  ActivePhotoChallenge,
  ChallengePhotoType,
  AISeverity,
} from '../../types';
import { supabase } from '../../lib/supabase';

interface PhotoChallengesProps {
  userId: string | undefined;
}

export default function PhotoChallenges({ userId }: PhotoChallengesProps) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const { data: challenges, isLoading } = useActivePhotoChallenges(userId);
  const { data: stats } = useUserPhotoStats(userId || '');
  const { data: leaderboard } = usePhotoChallengeLeaderboard(5);
  const { data: coverage } = useUserCropCoverage(userId || '');

  const [activeTab, setActiveTab] = useState<'challenges' | 'progress' | 'leaderboard'>('challenges');
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState<ActivePhotoChallenge | null>(null);

  const activeCount = challenges?.filter((c) => c.userStatus !== 'completed').length || 0;
  const completedCount = stats?.challengesCompleted || 0;

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Photo Stats */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-24 -mt-24" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-white/10 rounded-full -ml-18 -mb-18" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isSwahili ? 'Changamoto za Picha' : 'Photo Challenges'}
              </h2>
              <p className="text-violet-100 text-sm">
                {isSwahili
                  ? 'Pakia picha za mazao, pata zawadi!'
                  : 'Upload crop photos, earn rewards!'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats?.totalPhotos || 0}</p>
              <p className="text-violet-100 text-xs">{isSwahili ? 'Picha' : 'Photos'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{activeCount}</p>
              <p className="text-violet-100 text-xs">{isSwahili ? 'Hai' : 'Active'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{completedCount}</p>
              <p className="text-violet-100 text-xs">{isSwahili ? 'Kamilika' : 'Done'}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 text-center">
              <p className="text-xl font-bold">{stats?.bestStreak || 0}</p>
              <p className="text-violet-100 text-xs">{isSwahili ? 'Mfuatano' : 'Streak'}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Healthy Farm Badge Progress */}
      {userId && coverage && coverage.length > 0 && (
        <HealthyFarmProgress
          coverage={coverage}
          hasEarnedBadge={hasHealthyFarmBadge(stats || { totalPhotos: 0, cropsCovered: 0, cropsComplete: 0, cropCoverage: [], challengesCompleted: 0, challengesActive: 0, totalChallengeXp: 0, totalChallengePoints: 0, bestStreak: 0 })}
          isSwahili={isSwahili}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('challenges')}
          className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'challenges'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {isSwahili ? 'Changamoto' : 'Challenges'}
          {activeCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-violet-500 text-white text-xs rounded-full">
              {activeCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'progress'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {isSwahili ? 'Maendeleo' : 'Progress'}
        </button>
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 px-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'leaderboard'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          {isSwahili ? 'Orodha' : 'Top'}
        </button>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'challenges' && (
          <motion.div
            key="challenges"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {challenges && challenges.length > 0 ? (
              challenges.map((challenge) => (
                <PhotoChallengeCard
                  key={challenge.challengeId}
                  challenge={challenge}
                  isSwahili={isSwahili}
                  onUploadPhoto={() => {
                    setSelectedChallenge(challenge);
                    setPhotoModalOpen(true);
                  }}
                />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {isSwahili ? 'Hakuna changamoto za picha kwa sasa' : 'No photo challenges right now'}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {isSwahili ? 'Angalia tena baadaye!' : 'Check back soon!'}
                </p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'progress' && (
          <motion.div
            key="progress"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            <PhotoStatsCard stats={stats} isSwahili={isSwahili} />
            {coverage && coverage.length > 0 && (
              <CropCoverageCard coverage={coverage} isSwahili={isSwahili} />
            )}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <PhotoLeaderboard leaderboard={leaderboard} userId={userId} isSwahili={isSwahili} />
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
        isSwahili={isSwahili}
      />
    </div>
  );
}

// Photo Challenge Card
function PhotoChallengeCard({
  challenge,
  isSwahili,
  onUploadPhoto,
}: {
  challenge: ActivePhotoChallenge;
  isSwahili: boolean;
  onUploadPhoto: () => void;
}) {
  const progress = getChallengeProgress(challenge);
  const bonuses = getPhotoBonusInfo(challenge);
  const themeIcon = getChallengeThemeIcon(challenge.themeType);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-2xl">
          {themeIcon}
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {isSwahili ? challenge.themeNameSw : challenge.themeName}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">
                {isSwahili ? challenge.themeDescriptionSw : challenge.themeDescription}
              </p>
            </div>
            <div className="text-right ml-2">
              <p className="text-sm font-bold text-violet-600 dark:text-violet-400">
                +{challenge.xpPerPhoto} XP
              </p>
              <p className="text-xs text-gray-500">/photo</p>
            </div>
          </div>

          {/* Bonus XP indicators */}
          <div className="flex flex-wrap gap-1 mt-2">
            {bonuses.map((bonus) => (
              <span
                key={bonus.type}
                className="inline-flex items-center gap-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full"
              >
                {bonus.icon} +{bonus.xpBonus} XP
              </span>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                {challenge.userPhotosSubmitted}/{challenge.userPhotosTarget}{' '}
                {isSwahili ? 'picha' : 'photos'}
              </span>
              <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {challenge.daysRemaining} {isSwahili ? 'siku' : 'days'}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className={`h-full rounded-full ${
                  challenge.userStatus === 'completed'
                    ? 'bg-emerald-500'
                    : 'bg-violet-500'
                }`}
              />
            </div>
          </div>

          {/* Daily target reminder */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              <Target className="w-3 h-3 inline mr-1" />
              {challenge.targetPhotosPerDay} {isSwahili ? 'picha/siku' : 'photo/day'}
            </span>
            {challenge.userStreakDays > 0 && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                <Zap className="w-3 h-3 inline mr-1" />
                {challenge.userStreakDays} {isSwahili ? 'siku mfuatano' : 'day streak'}
              </span>
            )}
          </div>

          {/* Action Button */}
          {challenge.userStatus !== 'completed' && (
            <button
              onClick={onUploadPhoto}
              className="mt-3 w-full py-2.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
            >
              <Camera className="w-4 h-4" />
              {isSwahili ? 'Pakia Picha' : 'Upload Photo'}
            </button>
          )}

          {challenge.userStatus === 'completed' && (
            <div className="mt-3 w-full py-2.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-lg font-medium flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {isSwahili ? 'Imekamilika!' : 'Completed!'}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Healthy Farm Badge Progress
function HealthyFarmProgress({
  coverage,
  hasEarnedBadge,
  isSwahili,
}: {
  coverage: ReturnType<typeof useUserCropCoverage>['data'];
  hasEarnedBadge: boolean;
  isSwahili: boolean;
}) {
  const cropsNeeding = getCropsNeedingPhotos(coverage || []);
  const totalCrops = coverage?.length || 0;
  const completeCrops = coverage?.filter((c) => c.coverageComplete).length || 0;
  const progress = totalCrops > 0 ? Math.round((completeCrops / totalCrops) * 100) : 0;

  if (hasEarnedBadge) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl p-4 text-white"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold flex items-center gap-2">
              {isSwahili ? 'Mlezi wa Shamba Lenye Afya' : 'Healthy Farm Guardian'}
              <span className="text-lg">🏥</span>
            </h3>
            <p className="text-emerald-100 text-sm">
              {isSwahili
                ? 'Umepata beji hii! Hongera!'
                : "You've earned this badge! Congratulations!"}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            {isSwahili ? 'Mlezi wa Shamba Lenye Afya' : 'Healthy Farm Guardian'}
            <span className="text-sm">🏥</span>
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isSwahili
              ? 'Pakia picha za aina zote kwa mazao yako yote'
              : 'Upload all photo types for all your crops'}
          </p>
        </div>
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
          +100 XP
        </span>
      </div>

      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600 dark:text-gray-400">
            {completeCrops}/{totalCrops} {isSwahili ? 'mazao yamekamilika' : 'crops complete'}
          </span>
          <span className="text-gray-500">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Crops needing photos */}
      {cropsNeeding.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
            {isSwahili ? 'Picha zinazohitajika:' : 'Photos needed:'}
          </p>
          <div className="flex flex-wrap gap-2">
            {cropsNeeding.slice(0, 3).map((crop) => (
              <div
                key={crop.cropType}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-2 py-1"
              >
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  {crop.cropType}:
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                  {crop.missing.map((m) => getPhotoTypeIcon(m)).join(' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Photo Stats Card
function PhotoStatsCard({
  stats,
  isSwahili,
}: {
  stats: ReturnType<typeof useUserPhotoStats>['data'];
  isSwahili: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-violet-500" />
        {isSwahili ? 'Takwimu za Picha' : 'Photo Statistics'}
      </h3>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-violet-50 dark:bg-violet-900/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
            {stats?.totalPhotos || 0}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {isSwahili ? 'Jumla ya Picha' : 'Total Photos'}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats?.challengesCompleted || 0}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {isSwahili ? 'Changamoto' : 'Challenges'}
          </p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats?.totalChallengeXp || 0}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {isSwahili ? 'XP Iliyopatikana' : 'XP Earned'}
          </p>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {stats?.totalChallengePoints || 0}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {isSwahili ? 'Pointi' : 'Points'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Crop Coverage Card
function CropCoverageCard({
  coverage,
  isSwahili,
}: {
  coverage: NonNullable<ReturnType<typeof useUserCropCoverage>['data']>;
  isSwahili: boolean;
}) {
  const photoTypes: ChallengePhotoType[] = ['pest', 'disease', 'nutrient', 'growth'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Eye className="w-5 h-5 text-emerald-500" />
        {isSwahili ? 'Ufuatiliaji wa Mazao' : 'Crop Coverage'}
      </h3>

      <div className="space-y-3">
        {coverage.map((crop) => (
          <div key={crop.cropType} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 dark:text-white capitalize">
                {crop.cropType}
              </span>
              {crop.coverageComplete ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              ) : (
                <span className="text-xs text-gray-500">
                  {crop.totalPhotos} {isSwahili ? 'picha' : 'photos'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              {photoTypes.map((type) => {
                const hasPhoto =
                  (type === 'pest' && crop.hasPestPhoto) ||
                  (type === 'disease' && crop.hasDiseasePhoto) ||
                  (type === 'nutrient' && crop.hasNutrientPhoto) ||
                  (type === 'growth' && crop.hasGrowthPhoto);

                return (
                  <div
                    key={type}
                    className={`flex-1 text-center py-1.5 rounded-lg text-xs ${
                      hasPhoto
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-100 dark:bg-gray-600 text-gray-400'
                    }`}
                  >
                    <span className="block text-base">{getPhotoTypeIcon(type)}</span>
                    <span className="text-[10px]">{getPhotoTypeLabel(type, isSwahili ? 'sw' : 'en').split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Photo Leaderboard
function PhotoLeaderboard({
  leaderboard,
  userId,
  isSwahili,
}: {
  leaderboard: ReturnType<typeof usePhotoChallengeLeaderboard>['data'];
  userId: string | undefined;
  isSwahili: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-500" />
        {isSwahili ? 'Wapiga Picha Bora' : 'Top Photographers'}
      </h3>

      {leaderboard && leaderboard.length > 0 ? (
        <div className="space-y-2">
          {leaderboard.map((entry, index) => (
            <div
              key={entry.userId}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                entry.userId === userId
                  ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                  : 'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? 'bg-amber-100 text-amber-600'
                    : index === 1
                    ? 'bg-gray-200 text-gray-600'
                    : index === 2
                    ? 'bg-orange-100 text-orange-600'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {entry.fullName || 'Anonymous'}
                </p>
                <p className="text-xs text-gray-500">
                  {entry.totalPhotos} {isSwahili ? 'picha' : 'photos'}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-violet-600 dark:text-violet-400 text-sm">
                  {entry.totalXp} XP
                </p>
                <p className="text-xs text-gray-500">
                  {entry.earlyDetections} {isSwahili ? 'mapema' : 'early'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Trophy className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">
            {isSwahili ? 'Hakuna data bado' : 'No data yet'}
          </p>
        </div>
      )}
    </div>
  );
}

// Photo Upload Modal
function PhotoUploadModal({
  isOpen,
  onClose,
  challenge,
  userId,
  isSwahili,
}: {
  isOpen: boolean;
  onClose: () => void;
  challenge: ActivePhotoChallenge | null;
  userId: string | undefined;
  isSwahili: boolean;
}) {
  const submitPhoto = useSubmitChallengePhoto();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedType, setSelectedType] = useState<ChallengePhotoType>('pest');
  const [photoUrl, setPhotoUrl] = useState('');
  const [cropType, setCropType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    totalXp: number;
    bonuses: { clearPhoto: boolean; earlyDetection: boolean; correctIdentification: boolean };
  } | null>(null);

  const photoTypes: ChallengePhotoType[] = ['pest', 'disease', 'nutrient', 'growth', 'harvest', 'general'];

  // Simulate AI analysis
  const simulateAIAnalysis = () => {
    const confidence = 70 + Math.random() * 30; // 70-100
    const issues = ['Fall armyworm detected', 'Leaf rust spotted', 'Nitrogen deficiency', 'Healthy growth', null];
    const severities: AISeverity[] = ['none', 'low', 'medium', 'high'];

    return {
      confidence,
      issue: Math.random() > 0.4 ? issues[Math.floor(Math.random() * (issues.length - 1))] : null,
      severity: severities[Math.floor(Math.random() * severities.length)] as AISeverity,
    };
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      // Upload to Supabase Storage
      const fileName = `${userId}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('challenge-photos')
        .upload(fileName, file);

      clearInterval(progressInterval);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('challenge-photos')
        .getPublicUrl(fileName);

      setPhotoUrl(urlData.publicUrl);
      setUploadProgress(100);
    } catch (error) {
      console.error('Upload failed:', error);
      // Fallback to preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!userId || !photoUrl || !challenge) return;

    setUploading(true);
    try {
      // Simulate AI analysis
      const aiResult = simulateAIAnalysis();

      const response = await submitPhoto.mutateAsync({
        userId,
        challengeId: challenge.challengeId,
        cropType: cropType || 'unknown',
        photoUrl,
        photoType: selectedType,
        aiConfidence: aiResult.confidence,
        aiIssue: aiResult.issue || undefined,
        aiSeverity: aiResult.severity,
      });

      if (response.success) {
        setResult({
          success: true,
          totalXp: response.totalXp,
          bonuses: response.bonuses,
        });
      }
    } catch (error) {
      console.error('Failed to submit photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setPhotoUrl('');
    setCropType('');
    setResult(null);
    setUploadProgress(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {isSwahili ? 'Pakia Picha' : 'Upload Photo'}
            </h3>
            {challenge && (
              <p className="text-xs text-gray-500">
                {isSwahili ? challenge.themeNameSw : challenge.themeName}
              </p>
            )}
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Success Result */}
          {result?.success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center"
            >
              <div className="w-16 h-16 mx-auto mb-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <h4 className="text-lg font-bold text-emerald-700 dark:text-emerald-300 mb-2">
                {isSwahili ? 'Picha Imekubaliwa!' : 'Photo Submitted!'}
              </h4>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                +{result.totalXp} XP
              </p>
              {(result.bonuses.clearPhoto || result.bonuses.earlyDetection || result.bonuses.correctIdentification) && (
                <div className="flex justify-center gap-2 flex-wrap">
                  {result.bonuses.clearPhoto && (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-1 rounded-full text-xs">
                      ✨ {isSwahili ? 'Picha Wazi' : 'Clear Photo'}
                    </span>
                  )}
                  {result.bonuses.earlyDetection && (
                    <span className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2 py-1 rounded-full text-xs">
                      🎯 {isSwahili ? 'Kugundua Mapema' : 'Early Detection'}
                    </span>
                  )}
                  {result.bonuses.correctIdentification && (
                    <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full text-xs">
                      🏅 {isSwahili ? 'Utambuzi Sahihi' : 'Correct ID'}
                    </span>
                  )}
                </div>
              )}
              <button
                onClick={handleClose}
                className="mt-4 w-full py-2 bg-emerald-500 text-white rounded-lg font-medium"
              >
                {isSwahili ? 'Endelea' : 'Continue'}
              </button>
            </motion.div>
          )}

          {!result && (
            <>
              {/* Photo Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isSwahili ? 'Aina ya Picha' : 'Photo Type'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {photoTypes.map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`p-3 rounded-lg text-center transition-colors ${
                        selectedType === type
                          ? 'bg-violet-100 dark:bg-violet-900/30 border-2 border-violet-500'
                          : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent'
                      }`}
                    >
                      <span className="text-xl block">{getPhotoTypeIcon(type)}</span>
                      <p className="text-xs mt-1 text-gray-700 dark:text-gray-300">
                        {getPhotoTypeLabel(type, isSwahili ? 'sw' : 'en')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crop Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isSwahili ? 'Aina ya Zao' : 'Crop Type'}
                </label>
                <input
                  type="text"
                  value={cropType}
                  onChange={(e) => setCropType(e.target.value)}
                  placeholder={isSwahili ? 'mfano: Mahindi, Nyanya...' : 'e.g., Maize, Tomato...'}
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              </div>

              {/* Photo Upload Area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {isSwahili ? 'Pakia Picha' : 'Upload Photo'}
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-violet-500 transition-colors"
                >
                  {photoUrl ? (
                    <div className="relative">
                      <img
                        src={photoUrl}
                        alt="Preview"
                        className="max-h-48 mx-auto rounded-lg object-cover"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPhotoUrl('');
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : uploading ? (
                    <div>
                      <Loader2 className="w-10 h-10 mx-auto text-violet-500 animate-spin mb-2" />
                      <p className="text-sm text-gray-500">{uploadProgress}%</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {isSwahili ? 'Bofya kupakia picha' : 'Click to upload photo'}
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Bonus Info */}
              {challenge && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    {isSwahili ? 'Bonasi Zinazowezekana' : 'Possible Bonuses'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded">
                      ✨ +{challenge.bonusXpClear} XP {isSwahili ? 'picha wazi' : 'clear photo'}
                    </span>
                    <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded">
                      🎯 +{challenge.bonusXpEarly} XP {isSwahili ? 'kugundua mapema' : 'early detection'}
                    </span>
                    <span className="text-xs bg-white dark:bg-gray-700 px-2 py-1 rounded">
                      🏅 +{challenge.bonusXpCorrect} XP {isSwahili ? 'utambuzi sahihi' : 'correct ID'}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!photoUrl || uploading}
                className="w-full py-3 bg-violet-500 text-white rounded-xl font-medium hover:bg-violet-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
                {isSwahili ? 'Wasilisha Picha' : 'Submit Photo'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Compact widget for Dashboard
export function PhotoChallengesWidget({
  userId,
  onClick,
}: {
  userId: string | undefined;
  onClick?: () => void;
}) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const { data: challenges } = useActivePhotoChallenges(userId);
  const { data: stats } = useUserPhotoStats(userId || '');

  const activeChallenge = challenges?.[0];

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="w-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg p-3 text-white text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">
              {isSwahili ? 'Changamoto za Picha' : 'Photo Challenges'}
            </p>
            {activeChallenge && (
              <p className="text-xs text-violet-100 truncate max-w-[150px]">
                {isSwahili ? activeChallenge.themeNameSw : activeChallenge.themeName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {stats && stats.totalPhotos > 0 && (
            <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
              {stats.totalPhotos} 📷
            </span>
          )}
          <ChevronRight className="w-5 h-5" />
        </div>
      </div>
    </motion.button>
  );
}
