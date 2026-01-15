import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Trophy,
  Star,
  Clock,
  CheckCircle,
  ChevronRight,
  X,
  Sparkles,
  Crown,
  Eye,
  Heart,
  MapPin,
  Calendar,
  Target,
  Award,
  AlertTriangle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useUserStoryQuests,
  useStoryQuestTemplates,
  useStartStoryQuest,
  useUploadMilestonePhoto,
  useFeaturedStories,
  usePriorityBuyerAccess,
  MILESTONE_CONFIG,
  getMilestoneLabel,
  getMilestoneIcon,
  getNextMilestone,
  calculateQuestProgress,
  getCropIcon,
  getCropLabel,
} from '../../hooks/useStoryQuests';
import { uploadStoryPhoto, compressImage, fileToDataUrl } from '../../services/storage';
import { verifyPhoto, getExpectedPhotoDescription, type PhotoVerificationResult } from '../../services/photoVerification';
import type { UserStoryQuest, StoryQuestTemplate, StoryMilestoneType, FeaturedStory } from '../../types';

interface StoryQuestsDashboardProps {
  userId: string;
}

type TabType = 'my-quests' | 'browse' | 'featured';

export default function StoryQuestsDashboard({ userId }: StoryQuestsDashboardProps) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const [activeTab, setActiveTab] = useState<TabType>('my-quests');
  const [selectedQuest, setSelectedQuest] = useState<UserStoryQuest | null>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<StoryQuestTemplate | null>(null);

  const { data: userQuests, isLoading: questsLoading } = useUserStoryQuests(userId);
  const { data: templates } = useStoryQuestTemplates();
  const { data: featuredStories } = useFeaturedStories(10);
  const { data: priorityAccess } = usePriorityBuyerAccess(userId);

  const activeQuests = userQuests?.filter(q => q.status === 'active') || [];
  const completedQuests = userQuests?.filter(q => q.status === 'completed') || [];

  const tabs = [
    { id: 'my-quests' as TabType, label: isSwahili ? 'Safari Zangu' : 'My Journeys', count: activeQuests.length },
    { id: 'browse' as TabType, label: isSwahili ? 'Anza Mpya' : 'Start New', count: templates?.length },
    { id: 'featured' as TabType, label: isSwahili ? 'Hadithi' : 'Stories', count: featuredStories?.length },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 pb-20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Camera className="w-7 h-7" />
              {isSwahili ? 'Safari za Mazao' : 'Story Quests'}
            </h1>
            <p className="text-amber-100 text-sm mt-1">
              {isSwahili
                ? 'Andika safari yako ya kilimo na picha 5'
                : 'Document your crop journey with 5 photos'}
            </p>
          </div>
          {priorityAccess?.hasAccess && (
            <div className="bg-amber-600/50 rounded-lg px-3 py-2 text-center">
              <Crown className="w-5 h-5 mx-auto mb-1" />
              <span className="text-xs">{isSwahili ? 'Ufikiaji wa Kipaumbele' : 'Priority Access'}</span>
            </div>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{activeQuests.length}</div>
            <div className="text-xs text-amber-100">{isSwahili ? 'Zinaendelea' : 'Active'}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{completedQuests.length}</div>
            <div className="text-xs text-amber-100">{isSwahili ? 'Zimekamilika' : 'Completed'}</div>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold flex items-center justify-center gap-1">
              <Trophy className="w-4 h-4" />
              {completedQuests.length > 0 ? completedQuests.length : 0}
            </div>
            <div className="text-xs text-amber-100">{isSwahili ? 'Beji' : 'Badges'}</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation - Floating */}
      <div className="px-4 -mt-12">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-2 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-gray-200 dark:bg-gray-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'my-quests' && (
            <motion.div
              key="my-quests"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {questsLoading ? (
                <LoadingState />
              ) : activeQuests.length === 0 && completedQuests.length === 0 ? (
                <EmptyState isSwahili={isSwahili} onStartNew={() => setActiveTab('browse')} />
              ) : (
                <div className="space-y-4">
                  {/* Active Quests */}
                  {activeQuests.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {isSwahili ? 'Zinaendelea' : 'In Progress'}
                      </h3>
                      <div className="space-y-3">
                        {activeQuests.map(quest => (
                          <ActiveQuestCard
                            key={quest.id}
                            quest={quest}
                            isSwahili={isSwahili}
                            onClick={() => setSelectedQuest(quest)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Completed Quests */}
                  {completedQuests.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {isSwahili ? 'Zimekamilika' : 'Completed'}
                      </h3>
                      <div className="space-y-3">
                        {completedQuests.slice(0, 3).map(quest => (
                          <CompletedQuestCard
                            key={quest.id}
                            quest={quest}
                            isSwahili={isSwahili}
                            onClick={() => setSelectedQuest(quest)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'browse' && (
            <motion.div
              key="browse"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <BrowseTemplates
                templates={templates || []}
                isSwahili={isSwahili}
                onSelect={template => {
                  setSelectedTemplate(template);
                  setShowStartModal(true);
                }}
              />
            </motion.div>
          )}

          {activeTab === 'featured' && (
            <motion.div
              key="featured"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <FeaturedStoriesView stories={featuredStories || []} isSwahili={isSwahili} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quest Detail Modal */}
      <AnimatePresence>
        {selectedQuest && (
          <QuestDetailModal
            quest={selectedQuest}
            userId={userId}
            isSwahili={isSwahili}
            onClose={() => setSelectedQuest(null)}
          />
        )}
      </AnimatePresence>

      {/* Start Quest Modal */}
      <AnimatePresence>
        {showStartModal && selectedTemplate && (
          <StartQuestModal
            template={selectedTemplate}
            userId={userId}
            isSwahili={isSwahili}
            onClose={() => {
              setShowStartModal(false);
              setSelectedTemplate(null);
            }}
            onSuccess={() => {
              setShowStartModal(false);
              setSelectedTemplate(null);
              setActiveTab('my-quests');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// ACTIVE QUEST CARD
// ============================================

function ActiveQuestCard({
  quest,
  isSwahili,
  onClick,
}: {
  quest: UserStoryQuest;
  isSwahili: boolean;
  onClick: () => void;
}) {
  const progress = calculateQuestProgress(quest.milestonesCompleted);
  const completedMilestones = quest.photos.map(p => p.milestoneType);
  const nextMilestone = getNextMilestone(completedMilestones);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="text-3xl">{getCropIcon(quest.template.cropType)}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 dark:text-white truncate">
            {isSwahili ? quest.template.nameSw || quest.template.name : quest.template.name}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {getCropLabel(quest.template.cropType, isSwahili)}
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-500">
            {quest.milestonesCompleted}/5 {isSwahili ? 'hatua' : 'milestones'}
          </span>
          <span className="text-xs font-medium text-amber-600">{progress}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
          />
        </div>
      </div>

      {/* Next Milestone */}
      {nextMilestone && (
        <div className="mt-3 flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
          <span className="text-lg">{getMilestoneIcon(nextMilestone)}</span>
          <span className="text-sm text-amber-700 dark:text-amber-300">
            {isSwahili ? 'Ifuatayo: ' : 'Next: '}
            {getMilestoneLabel(nextMilestone, isSwahili)}
          </span>
        </div>
      )}

      {/* Milestone Dots */}
      <div className="mt-3 flex justify-center gap-2">
        {(['land_before', 'germination', 'flowering', 'pre_harvest', 'storage'] as StoryMilestoneType[]).map(
          milestone => {
            const isComplete = completedMilestones.includes(milestone);
            const isCurrent = milestone === nextMilestone;
            return (
              <div
                key={milestone}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-all ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-amber-500 text-white ring-2 ring-amber-300 ring-offset-2'
                    : 'bg-gray-200 dark:bg-gray-600 text-gray-400'
                }`}
                title={getMilestoneLabel(milestone, isSwahili)}
              >
                {isComplete ? <CheckCircle className="w-4 h-4" /> : getMilestoneIcon(milestone)}
              </div>
            );
          }
        )}
      </div>
    </motion.div>
  );
}

// ============================================
// COMPLETED QUEST CARD
// ============================================

function CompletedQuestCard({
  quest,
  isSwahili,
  onClick,
}: {
  quest: UserStoryQuest;
  isSwahili: boolean;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-green-200 dark:border-green-800 cursor-pointer"
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="text-3xl">{getCropIcon(quest.template.cropType)}</span>
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-0.5">
            <CheckCircle className="w-3 h-3 text-white" />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 dark:text-white">
            {isSwahili ? quest.template.nameSw || quest.template.name : quest.template.name}
          </h4>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-500" />
              {quest.pointsAwarded} pts
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-purple-500" />
              {quest.xpAwarded} XP
            </span>
          </div>
        </div>
        <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-2">
          <Trophy className="w-5 h-5 text-amber-600" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// BROWSE TEMPLATES
// ============================================

function BrowseTemplates({
  templates,
  isSwahili,
  onSelect,
}: {
  templates: StoryQuestTemplate[];
  isSwahili: boolean;
  onSelect: (template: StoryQuestTemplate) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-4">
        <h3 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {isSwahili ? 'Jinsi Inavyofanya Kazi' : 'How It Works'}
        </h3>
        <ol className="mt-2 space-y-1 text-sm text-amber-700 dark:text-amber-300">
          <li>1. {isSwahili ? 'Chagua mazao yako' : 'Choose your crop'}</li>
          <li>2. {isSwahili ? 'Pakia picha 5 za hatua' : 'Upload 5 milestone photos'}</li>
          <li>3. {isSwahili ? 'Pata pointi 30 + beji + ufikiaji wa wanunuzi' : 'Earn 30 pts + badge + buyer access'}</li>
        </ol>
      </div>

      <div className="grid gap-3">
        {templates.map(template => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(template)}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="text-4xl">{getCropIcon(template.cropType)}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {isSwahili ? template.nameSw || template.name : template.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getCropLabel(template.cropType, isSwahili)} • ~{template.expectedDays}{' '}
                  {isSwahili ? 'siku' : 'days'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-amber-600 font-bold">{template.pointsReward} pts</div>
                <div className="text-xs text-purple-500">+{template.xpReward} XP</div>
              </div>
            </div>

            {/* Rewards Preview */}
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-300">
                <Trophy className="w-3 h-3" />
                {template.badgeIcon} {template.badgeName}
              </span>
              {template.grantsPriorityAccess && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-700 dark:text-purple-300">
                  <Crown className="w-3 h-3" />
                  {isSwahili ? 'Ufikiaji wa Wanunuzi' : 'Buyer Access'}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FEATURED STORIES VIEW
// ============================================

function FeaturedStoriesView({
  stories,
  isSwahili,
}: {
  stories: FeaturedStory[];
  isSwahili: boolean;
}) {
  if (stories.length === 0) {
    return (
      <div className="text-center py-12">
        <Award className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
          {isSwahili ? 'Hakuna hadithi bado' : 'No featured stories yet'}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {isSwahili
            ? 'Kamilisha safari yako kuwa wa kwanza!'
            : 'Complete your journey to be featured!'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stories.map(story => (
        <div
          key={story.id}
          className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700"
        >
          {/* Photo Strip */}
          <div className="flex h-24 overflow-hidden">
            {story.photos.slice(0, 5).map((photo, idx) => (
              <div key={idx} className="flex-1 relative">
                <img
                  src={photo.photoUrl}
                  alt={photo.milestoneType}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-1 left-1 bg-black/50 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs">
                  {getMilestoneIcon(photo.milestoneType)}
                </div>
              </div>
            ))}
          </div>

          {/* Story Info */}
          <div className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
                <span className="text-lg">{getCropIcon(story.quest.cropType)}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {isSwahili ? story.titleSw || story.title : story.title}
                </h4>
                <p className="text-sm text-gray-500">
                  {story.farmer.name}
                  {story.farmer.location && (
                    <span className="inline-flex items-center gap-1 ml-2">
                      <MapPin className="w-3 h-3" />
                      {story.farmer.location}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {story.summary && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {isSwahili ? story.summarySw || story.summary : story.summary}
              </p>
            )}

            <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {story.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {story.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {new Date(story.publishedAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// QUEST DETAIL MODAL
// ============================================

function QuestDetailModal({
  quest,
  userId,
  isSwahili,
  onClose,
}: {
  quest: UserStoryQuest;
  userId: string;
  isSwahili: boolean;
  onClose: () => void;
}) {
  const [uploadingMilestone, setUploadingMilestone] = useState<StoryMilestoneType | null>(null);
  const [verifyingPhoto, setVerifyingPhoto] = useState(false);
  const [verificationResult, setVerificationResult] = useState<PhotoVerificationResult | null>(null);
  const [pendingFile, setPendingFile] = useState<{ file: File; milestone: StoryMilestoneType } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadMilestonePhoto();

  const completedMilestones = quest.photos.map(p => p.milestoneType);
  const milestones: StoryMilestoneType[] = ['land_before', 'germination', 'flowering', 'pre_harvest', 'storage'];

  const handlePhotoSelect = (milestone: StoryMilestoneType) => {
    setUploadingMilestone(milestone);
    setVerificationResult(null);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingMilestone) return;

    // First, verify the photo
    setVerifyingPhoto(true);
    setPendingFile({ file, milestone: uploadingMilestone });

    try {
      const verification = await verifyPhoto(file, uploadingMilestone, {
        cropType: quest.template.cropType,
      });

      setVerificationResult(verification);

      if (verification.isValid) {
        // Photo is valid, proceed with upload
        await processUpload(file, uploadingMilestone);
      }
      // If not valid, show the rejection modal (handled by verificationResult state)
    } catch (error) {
      console.error('Photo verification failed:', error);
      // On verification error, still allow upload (graceful degradation)
      await processUpload(file, uploadingMilestone);
    } finally {
      setVerifyingPhoto(false);
    }
  };

  const processUpload = async (file: File, milestone: StoryMilestoneType) => {
    try {
      // Compress image before upload
      let fileToUpload: File | Blob = file;
      if (file.size > 500000) { // If larger than 500KB, compress
        try {
          fileToUpload = await compressImage(file, 1200, 1200, 0.8);
        } catch (compressError) {
          console.warn('Image compression failed, using original:', compressError);
        }
      }

      // Try to upload to Supabase Storage
      let photoUrl: string;
      try {
        photoUrl = await uploadStoryPhoto(userId, quest.id, milestone, file);
      } catch (uploadError) {
        console.warn('Storage upload failed, using base64 fallback:', uploadError);
        // Fallback to base64 data URL if storage fails
        photoUrl = await fileToDataUrl(fileToUpload);
      }

      // Save the photo reference in the database
      await uploadMutation.mutateAsync({
        userId,
        questId: quest.id,
        milestoneType: milestone,
        photoUrl,
      });

      // Clear states on success
      setVerificationResult(null);
      setPendingFile(null);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      // Show error to user
      alert(isSwahili
        ? 'Imeshindwa kupakia picha. Tafadhali jaribu tena.'
        : 'Failed to upload photo. Please try again.');
    }

    setUploadingMilestone(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRetryPhoto = () => {
    setVerificationResult(null);
    setPendingFile(null);
    fileInputRef.current?.click();
  };

  const handleDismissRejection = () => {
    setVerificationResult(null);
    setPendingFile(null);
    setUploadingMilestone(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-4">
            <span className="text-5xl">{getCropIcon(quest.template.cropType)}</span>
            <div>
              <h2 className="text-xl font-bold">
                {isSwahili ? quest.template.nameSw || quest.template.name : quest.template.name}
              </h2>
              <p className="text-amber-100 text-sm">
                {quest.milestonesCompleted}/5 {isSwahili ? 'hatua zimekamilika' : 'milestones complete'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="h-3 bg-white/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${calculateQuestProgress(quest.milestonesCompleted)}%` }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="p-6 space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            {isSwahili ? 'Hatua za Picha' : 'Photo Milestones'}
          </h3>

          {milestones.map((milestone, index) => {
            const isComplete = completedMilestones.includes(milestone);
            const photo = quest.photos.find(p => p.milestoneType === milestone);
            const config = MILESTONE_CONFIG[milestone];

            return (
              <div
                key={milestone}
                className={`border rounded-xl p-4 transition ${
                  isComplete
                    ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      isComplete
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                    }`}
                  >
                    {isComplete ? <CheckCircle className="w-5 h-5" /> : config.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {index + 1}. {isSwahili ? config.labelSw : config.labelEn}
                      </h4>
                      {isComplete && <span className="text-xs text-green-600">+10 XP</span>}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {config.description}
                    </p>

                    {/* Photo Preview or Upload Button */}
                    {isComplete && photo ? (
                      <div className="mt-3">
                        <img
                          src={photo.photoUrl}
                          alt={milestone}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(photo.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    ) : quest.status === 'active' ? (
                      <div className="mt-3">
                        {/* Expected photo hint */}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 italic">
                          {getExpectedPhotoDescription(milestone, quest.template.cropType, isSwahili)}
                        </p>
                        <button
                          onClick={() => handlePhotoSelect(milestone)}
                          disabled={uploadMutation.isPending || verifyingPhoto}
                          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition disabled:opacity-50"
                        >
                          {verifyingPhoto && uploadingMilestone === milestone ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {isSwahili ? 'Inakagua picha...' : 'Verifying photo...'}
                            </>
                          ) : uploadMutation.isPending && uploadingMilestone === milestone ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              {isSwahili ? 'Inapakia...' : 'Uploading...'}
                            </>
                          ) : (
                            <>
                              <Camera className="w-4 h-4" />
                              {isSwahili ? 'Pakia Picha' : 'Upload Photo'}
                            </>
                          )}
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Photo Rejection Alert */}
          {verificationResult && !verificationResult.isValid && pendingFile && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 dark:text-red-300">
                    {isSwahili ? 'Picha Imekataliwa' : 'Photo Rejected'}
                  </h4>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {isSwahili
                      ? verificationResult.reasonSw || verificationResult.reason
                      : verificationResult.reason}
                  </p>

                  {/* What was detected */}
                  {verificationResult.detectedContent && (
                    <p className="text-xs text-red-500 dark:text-red-500 mt-2">
                      <strong>{isSwahili ? 'Imeonekana:' : 'Detected:'}</strong>{' '}
                      {verificationResult.detectedContent}
                    </p>
                  )}

                  {/* Suggestions */}
                  {verificationResult.suggestions && verificationResult.suggestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-medium text-red-700 dark:text-red-400">
                        {isSwahili ? 'Mapendekezo:' : 'Suggestions:'}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {(isSwahili
                          ? verificationResult.suggestionsSw || verificationResult.suggestions
                          : verificationResult.suggestions
                        ).map((suggestion, idx) => (
                          <li key={idx} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1">
                            <span>•</span>
                            <span>{suggestion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleRetryPhoto}
                      className="flex-1 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white text-sm rounded-lg transition flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-4 h-4" />
                      {isSwahili ? 'Jaribu Tena' : 'Try Again'}
                    </button>
                    <button
                      onClick={handleDismissRejection}
                      className="py-2 px-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      {isSwahili ? 'Funga' : 'Dismiss'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Rewards Section */}
          <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <h3 className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {isSwahili ? 'Zawadi' : 'Rewards'}
            </h3>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-2xl font-bold text-amber-600">{quest.template.pointsReward}</div>
                <div className="text-xs text-gray-500">{isSwahili ? 'Pointi' : 'Points'}</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{quest.template.xpReward}</div>
                <div className="text-xs text-gray-500">XP</div>
              </div>
              <div>
                <div className="text-2xl">{quest.template.badgeIcon}</div>
                <div className="text-xs text-gray-500">{quest.template.badgeName}</div>
              </div>
            </div>
            {quest.template.grantsPriorityAccess && (
              <div className="mt-3 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                <Crown className="w-4 h-4" />
                {isSwahili
                  ? 'Ufikiaji wa kipaumbele kwa wanunuzi siku 30'
                  : '30-day priority buyer access'}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// START QUEST MODAL
// ============================================

function StartQuestModal({
  template,
  userId,
  isSwahili,
  onClose,
  onSuccess,
}: {
  template: StoryQuestTemplate;
  userId: string;
  isSwahili: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const startMutation = useStartStoryQuest();

  const handleStart = async () => {
    try {
      await startMutation.mutateAsync({
        userId,
        templateId: template.id,
      });
      onSuccess();
    } catch (error) {
      console.error('Failed to start quest:', error);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
          <span className="text-6xl">{getCropIcon(template.cropType)}</span>
          <h2 className="text-xl font-bold mt-3">
            {isSwahili ? template.nameSw || template.name : template.name}
          </h2>
          <p className="text-amber-100 text-sm mt-1">
            ~{template.expectedDays} {isSwahili ? 'siku' : 'days'}
          </p>
        </div>

        <div className="p-6">
          {/* Milestones Preview */}
          <div className="space-y-2 mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white">
              {isSwahili ? 'Picha 5 Utakazohitaji:' : '5 Photos You\'ll Need:'}
            </h3>
            {(['land_before', 'germination', 'flowering', 'pre_harvest', 'storage'] as StoryMilestoneType[]).map(
              (milestone, idx) => (
                <div key={milestone} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="w-6 h-6 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-xs">
                    {idx + 1}
                  </span>
                  <span>{getMilestoneIcon(milestone)}</span>
                  <span>{getMilestoneLabel(milestone, isSwahili)}</span>
                </div>
              )
            )}
          </div>

          {/* Rewards */}
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 mb-6">
            <h3 className="font-medium text-amber-800 dark:text-amber-200">
              {isSwahili ? 'Zawadi Ukikamilisha:' : 'Complete to Earn:'}
            </h3>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-lg font-bold text-amber-600">{template.pointsReward} pts</span>
              <span className="text-lg font-bold text-purple-600">+{template.xpReward} XP</span>
              <span className="text-lg">{template.badgeIcon}</span>
            </div>
            {template.grantsPriorityAccess && (
              <p className="text-sm text-purple-600 mt-2 flex items-center gap-1">
                <Crown className="w-4 h-4" />
                {isSwahili ? 'Ufikiaji wa kipaumbele kwa wanunuzi' : 'Priority buyer access'}
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              {isSwahili ? 'Ghairi' : 'Cancel'}
            </button>
            <button
              onClick={handleStart}
              disabled={startMutation.isPending}
              className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {startMutation.isPending ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Camera className="w-5 h-5" />
                  {isSwahili ? 'Anza Safari' : 'Start Journey'}
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================
// EMPTY STATE
// ============================================

function EmptyState({ isSwahili, onStartNew }: { isSwahili: boolean; onStartNew: () => void }) {
  return (
    <div className="text-center py-12">
      <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
        <Camera className="w-10 h-10 text-amber-500" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {isSwahili ? 'Anza Safari Yako ya Kwanza!' : 'Start Your First Journey!'}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs mx-auto">
        {isSwahili
          ? 'Andika safari ya mazao yako na picha 5 na upate zawadi kubwa.'
          : 'Document your crop journey with 5 photos and earn amazing rewards.'}
      </p>
      <button
        onClick={onStartNew}
        className="mt-6 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition flex items-center gap-2 mx-auto"
      >
        <Sparkles className="w-5 h-5" />
        {isSwahili ? 'Anza Sasa' : 'Start Now'}
      </button>
    </div>
  );
}

// ============================================
// LOADING STATE
// ============================================

function LoadingState() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 mt-2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// WIDGET FOR REWARDS OVERVIEW
// ============================================

export function StoryQuestsWidget({
  userId,
  onClick,
}: {
  userId: string;
  onClick?: () => void;
}) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const { data: quests } = useUserStoryQuests(userId);

  const activeQuests = quests?.filter(q => q.status === 'active') || [];
  const completedQuests = quests?.filter(q => q.status === 'completed') || [];

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl p-4 text-white cursor-pointer"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          {isSwahili ? 'Safari za Mazao' : 'Story Quests'}
        </h3>
        <ChevronRight className="w-5 h-5" />
      </div>

      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{activeQuests.length}</div>
          <div className="text-xs text-amber-100">{isSwahili ? 'Zinaendelea' : 'Active'}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{completedQuests.length}</div>
          <div className="text-xs text-amber-100">{isSwahili ? 'Zimekamilika' : 'Done'}</div>
        </div>
        <div className="flex-1 text-right">
          <Trophy className="w-8 h-8 text-amber-200 inline-block" />
        </div>
      </div>

      {activeQuests.length === 0 && (
        <p className="text-xs text-amber-100 mt-2">
          {isSwahili ? 'Anza safari yako ya kwanza!' : 'Start your first journey!'}
        </p>
      )}
    </motion.div>
  );
}
