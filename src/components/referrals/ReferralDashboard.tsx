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
  Sparkles,
  MessageCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useReferralCode,
  useReferralStats,
  useReferralHistory,
  useReferralLeaderboard,
  useCheckReferralMilestones,
  getReferralTierInfo,
  getMilestoneInfo,
  generateReferralLink,
  getShareMessage,
} from '../../hooks/useReferrals';

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

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'leaderboard'>('overview');

  const handleCopyCode = () => {
    if (referralCode?.code) {
      navigator.clipboard.writeText(referralCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralCode?.code) return;

    const shareData = {
      title: 'Join AgroAfrica',
      text: getShareMessage(referralCode.code, isSwahili ? 'sw' : 'en'),
      url: generateReferralLink(referralCode.code),
    };

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

  const handleWhatsAppShare = () => {
    if (!referralCode?.code) return;
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
  const milestones = getMilestoneInfo();
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
            {/* Milestones */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-emerald-500" />
                {t('referrals.milestones', 'Milestones')}
              </h3>

              <div className="space-y-3">
                {milestones.map((milestone, index) => {
                  const isComplete = activatedCount >= milestone.count;
                  const isClaimed =
                    (milestone.count === 3 && stats?.milestone3Claimed) ||
                    (milestone.count === 10 && stats?.milestone10Claimed) ||
                    (milestone.count === 25 && stats?.milestone25Claimed) ||
                    (milestone.count === 50 && stats?.milestone50Claimed) ||
                    (milestone.count === 100 && stats?.milestone100Claimed);
                  const progress = Math.min((activatedCount / milestone.count) * 100, 100);

                  return (
                    <div key={index} className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${isComplete ? '' : 'grayscale opacity-50'}`}>
                            {isComplete ? '🎉' : '🎯'}
                          </span>
                          <span className={`text-sm font-medium ${
                            isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {milestone.count} {t('referrals.friends', 'Friends')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-amber-500">
                            +{milestone.points} pts
                          </span>
                          {isComplete && !isClaimed && (
                            <button
                              onClick={() => userId && checkMilestones.mutate(userId)}
                              className="text-xs bg-emerald-500 text-white px-2 py-1 rounded-full"
                            >
                              {t('referrals.claim', 'Claim')}
                            </button>
                          )}
                          {isClaimed && (
                            <Check className="w-4 h-4 text-emerald-500" />
                          )}
                        </div>
                      </div>
                      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          className={`h-full rounded-full ${
                            isComplete ? 'bg-emerald-500' : 'bg-gray-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rewards Info */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <h3 className="font-semibold text-amber-900 dark:text-amber-200 mb-3 flex items-center gap-2">
                <Gift className="w-5 h-5" />
                {t('referrals.rewards', 'Referral Rewards')}
              </h3>
              <div className="space-y-2 text-sm text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{t('referrals.reward1', 'You get: +3 XP & +5 points per activation')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{t('referrals.reward2', 'Friend gets: +5 XP & +10 points')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  <span>{t('referrals.reward3', 'Milestone bonuses up to 2,500 points!')}</span>
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
