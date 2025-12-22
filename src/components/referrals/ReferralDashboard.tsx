import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Share2,
  Gift,
  Trophy,
  Copy,
  Check,
  ChevronRight,
  Crown,
  Target,
  MessageCircle,
  Phone,
  Sun,
  CreditCard,
  Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useReferralCode,
  useReferralStats,
  useReferralHistory,
  useReferralLeaderboard,
  useCheckReferralMilestones,
  useRecordReferralShare,
  getReferralTierInfo,
  getEnhancedMilestoneInfo,
  getReferrerBadgeInfo,
  generateReferralLink,
  getShareMessage,
} from '../../hooks/useReferrals';
import { useMicroWinStore } from '../../hooks/useMicroWins';

interface ReferralDashboardProps {
  userId: string | undefined;
}

export default function ReferralDashboard({ userId }: ReferralDashboardProps) {
  const { t, i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const { data: referralCode, isLoading: codeLoading } = useReferralCode(userId);
  const { data: stats, isLoading: statsLoading } = useReferralStats(userId);
  const { data: history } = useReferralHistory(userId);
  const { data: leaderboard } = useReferralLeaderboard(10);
  const checkMilestones = useCheckReferralMilestones();
  const recordShare = useRecordReferralShare();
  const { addToast } = useMicroWinStore();

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'leaderboard'>('overview');

  // Show instant gratification toast after recording share
  const showInstantGratificationToast = (result: {
    message: string;
    messageSw: string;
    shareCount: number;
    badgeAwarded?: string;
    referrerBadge: string;
  }) => {
    const badgeInfo = getReferrerBadgeInfo(result.referrerBadge);

    addToast({
      type: 'badge',
      message: result.badgeAwarded
        ? `${result.message} ${badgeInfo.icon} ${badgeInfo.name} unlocked!`
        : result.message,
      messageSw: result.badgeAwarded
        ? `${result.messageSw} ${badgeInfo.icon} ${badgeInfo.nameSw} imefunguliwa!`
        : result.messageSw,
      xp: result.badgeAwarded ? 5 : 0,
      badgeProgress: {
        badgeType: 'referrer',
        currentProgress: result.shareCount,
        targetProgress: result.shareCount < 5 ? 5 : result.shareCount < 15 ? 15 : result.shareCount < 30 ? 30 : 50,
        justCompleted: !!result.badgeAwarded,
      },
    });
  };

  const handleCopyCode = () => {
    if (referralCode?.code) {
      navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralCode?.code || !userId) return;

    const shareData = {
      title: 'Join AgroAfrica',
      text: getShareMessage(referralCode.code, isSwahili ? 'sw' : 'en'),
      url: generateReferralLink(referralCode.code),
    };

    // Record the share for instant gratification BEFORE actual share
    try {
      const result = await recordShare.mutateAsync({
        userId,
        shareMethod: 'native_share',
      });
      if (result.success) {
        showInstantGratificationToast(result);
      }
    } catch (err) {
      // Continue with share even if recording fails
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or error
      }
    } else {
      // Fallback to copy link
      navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleWhatsAppShare = async () => {
    if (!referralCode?.code || !userId) return;

    // Record the share for instant gratification BEFORE actual share
    try {
      const result = await recordShare.mutateAsync({
        userId,
        shareMethod: 'whatsapp',
      });
      if (result.success) {
        showInstantGratificationToast(result);
      }
    } catch (err) {
      // Continue with share even if recording fails
    }

    const message = encodeURIComponent(getShareMessage(referralCode.code, isSwahili ? 'sw' : 'en'));
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (codeLoading || statsLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />
      </div>
    );
  }

  const tierInfo = getReferralTierInfo(stats?.currentTier || 'starter');
  const enhancedMilestones = getEnhancedMilestoneInfo();
  const activatedCount = stats?.activatedReferrals || 0;

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />

        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{t('referrals.title', 'Invite Friends')}</h2>
              <p className="text-emerald-100 text-sm">
                {t('referrals.subtitle', 'Earn rewards for every friend who joins')}
              </p>
            </div>
          </div>

          {/* Referral Code */}
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 mb-4">
            <p className="text-emerald-100 text-xs mb-2">{t('referrals.yourCode', 'Your Referral Code')}</p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-bold tracking-wider flex-1">
                {referralCode?.code || '--------'}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleShare}
              className="flex-1 flex items-center justify-center gap-2 bg-white text-emerald-600 font-medium py-3 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              <Share2 className="w-5 h-5" />
              {t('referrals.share', 'Share Link')}
            </button>
            <button
              onClick={handleWhatsAppShare}
              className="p-3 bg-[#25D366] rounded-xl hover:bg-[#22c55e] transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700"
        >
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats?.totalReferrals || 0}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('referrals.invited', 'Invited')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700"
        >
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {activatedCount}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('referrals.activated', 'Activated')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-center gap-1">
            <span className="text-xl">{tierInfo.icon}</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isSwahili ? tierInfo.nameSw : tierInfo.name}
          </p>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        {(['overview', 'referrals', 'leaderboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t(`referrals.tab.${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Enhanced Milestones with Physical Rewards */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                {t('referrals.milestones', 'Milestones')}
              </h3>

              <div className="space-y-4">
                {enhancedMilestones.map((milestone, index) => {
                  const isComplete = activatedCount >= milestone.count;
                  const isClaimed =
                    (milestone.count === 3 && stats?.milestone3Claimed) ||
                    (milestone.count === 10 && stats?.milestone10Claimed) ||
                    (milestone.count === 25 && stats?.milestone25Claimed) ||
                    (milestone.count === 50 && stats?.milestone50Claimed) ||
                    (milestone.count === 100 && stats?.milestone100Claimed);
                  const progress = Math.min((activatedCount / milestone.count) * 100, 100);

                  // Get icon for physical reward
                  const getPhysicalRewardIcon = (reward: string | null) => {
                    if (!reward) return null;
                    if (reward.includes('airtime')) return <Phone className="w-3.5 h-3.5" />;
                    if (reward.includes('voucher') || reward.includes('Input')) return <Gift className="w-3.5 h-3.5" />;
                    if (reward.includes('Solar') || reward.includes('light')) return <Sun className="w-3.5 h-3.5" />;
                    if (reward.includes('credit') || reward.includes('Agro')) return <CreditCard className="w-3.5 h-3.5" />;
                    if (reward.includes('VIP') || reward.includes('Premium')) return <Star className="w-3.5 h-3.5" />;
                    return <Gift className="w-3.5 h-3.5" />;
                  };

                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`relative p-3 rounded-lg border ${
                        isComplete
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                          : 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xl ${isComplete ? '' : 'grayscale opacity-50'}`}>
                            {isComplete ? '🎉' : '🎯'}
                          </span>
                          <div>
                            <span className={`text-sm font-semibold ${
                              isComplete ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-700 dark:text-gray-300'
                            }`}>
                              {milestone.count} {t('referrals.friends', 'Friends')}
                            </span>
                            {milestone.title && (
                              <span className="ml-2 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">
                                {milestone.title}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isComplete && !isClaimed && (
                            <motion.button
                              initial={{ scale: 0.9 }}
                              animate={{ scale: [1, 1.05, 1] }}
                              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                              onClick={() => userId && checkMilestones.mutate(userId)}
                              className="text-xs bg-emerald-500 text-white px-3 py-1.5 rounded-full font-medium shadow-sm hover:bg-emerald-600 transition-colors"
                            >
                              {t('referrals.claim', 'Claim')}
                            </motion.button>
                          )}
                          {isClaimed && (
                            <div className="flex items-center gap-1 text-emerald-500">
                              <Check className="w-4 h-4" />
                              <span className="text-xs font-medium">{t('referrals.claimed', 'Claimed')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Rewards row */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                          +{milestone.points} pts
                        </span>
                        {milestone.xp > 0 && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                            +{milestone.xp} XP
                          </span>
                        )}
                        {milestone.physicalReward && (
                          <span className="flex items-center gap-1 text-xs bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 px-2 py-0.5 rounded-full font-medium">
                            {getPhysicalRewardIcon(milestone.physicalReward)}
                            {milestone.physicalReward}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                          className={`h-full rounded-full ${
                            isComplete ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {activatedCount}/{milestone.count} {t('referrals.activated', 'activated')}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* 3-Tier Rewards Info */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                {t('referrals.rewards', 'How Rewards Work')}
              </h3>
              <div className="space-y-3 text-sm">
                {/* Layer A - Instant */}
                <div className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    A
                  </div>
                  <div>
                    <p className="font-medium text-emerald-700 dark:text-emerald-400">
                      {isSwahili ? 'Tuzo ya Papo Hapo' : 'Instant Reward'}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs">
                      {isSwahili
                        ? 'Shiriki na upate beji mara moja!'
                        : 'Share and get a badge immediately!'}
                    </p>
                  </div>
                </div>

                {/* Layer B - Activation */}
                <div className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    B
                  </div>
                  <div>
                    <p className="font-medium text-blue-700 dark:text-blue-400">
                      {isSwahili ? 'Tuzo ya Uanzishaji' : 'Activation Reward'}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs">
                      {isSwahili
                        ? 'Wewe: +3 XP & +5 pts | Rafiki: +5 XP & +10 pts'
                        : 'You: +3 XP & +5 pts | Friend: +5 XP & +10 pts'}
                    </p>
                  </div>
                </div>

                {/* Layer C - Milestones */}
                <div className="flex items-start gap-3 p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                  <div className="w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    C
                  </div>
                  <div>
                    <p className="font-medium text-purple-700 dark:text-purple-400">
                      {isSwahili ? 'Tuzo za Hatua' : 'Milestone Rewards'}
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 text-xs">
                      {isSwahili
                        ? 'Zawadi za kipekee: Airtime, Vocha, Taa ya jua!'
                        : 'Real rewards: Airtime, Vouchers, Solar light!'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'referrals' && (
          <motion.div
            key="referrals"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
          >
            {history && history.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {history.map((referral) => (
                  <div key={referral.id} className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {referral.referredAvatar ? (
                        <img
                          src={referral.referredAvatar}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {referral.referredName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        referral.status === 'activated'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                          : referral.status === 'rewarded'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {referral.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('referrals.noReferrals', 'No referrals yet')}</p>
                <p className="text-sm">{t('referrals.startSharing', 'Start sharing your code!')}</p>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'leaderboard' && (
          <motion.div
            key="leaderboard"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
          >
            {leaderboard && leaderboard.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.userId}
                    className={`p-3 flex items-center gap-3 ${
                      entry.userId === userId ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                    }`}
                  >
                    <div className="w-8 text-center">
                      {index === 0 ? (
                        <Crown className="w-6 h-6 text-amber-500 mx-auto" />
                      ) : index === 1 ? (
                        <span className="text-xl">🥈</span>
                      ) : index === 2 ? (
                        <span className="text-xl">🥉</span>
                      ) : (
                        <span className="text-sm font-medium text-gray-500">#{entry.rank}</span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt=""
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Users className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {entry.fullName}
                        {entry.userId === userId && (
                          <span className="text-emerald-500 ml-1">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {getReferralTierInfo(entry.currentTier).icon} {entry.currentTier}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {entry.activatedReferrals}
                      </p>
                      <p className="text-xs text-gray-500">{t('referrals.referrals', 'referrals')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Trophy className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{t('referrals.noLeaderboard', 'Leaderboard is empty')}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact widget for dashboard
export function ReferralWidget({ userId, onClick }: { userId: string | undefined; onClick?: () => void }) {
  const { t } = useTranslation();
  const { data: stats } = useReferralStats(userId);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-lg p-3 text-white text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">{t('referrals.inviteFriends', 'Invite Friends')}</p>
            <p className="text-xs text-emerald-100">
              {stats?.activatedReferrals || 0} {t('referrals.joined', 'joined')}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" />
      </div>
    </motion.button>
  );
}
