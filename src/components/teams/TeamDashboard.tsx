import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Trophy,
  Target,
  Copy,
  Check,
  LogOut,
  Crown,
  Medal,
  Award,
  BookOpen,
  Camera,
  UserPlus,
  ChevronRight,
  ChevronDown,
  MessageCircle,
  Send,
  Loader2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTeamChat } from '../../hooks/useTeamChat';
import {
  useUserTeams,
  useTeamChallenges,
  useTeamLeaderboard,
  useCreateTeam,
  useJoinTeam,
  useLeaveTeam,
  getTeamTypeIcon,
  getTeamTypeLabel,
  getChallengeTypeIcon,
  type UserTeamDetails,
} from '../../hooks/useTeams';
import type { TeamType, TeamChallenge, TeamDetails } from '../../types';

interface TeamDashboardProps {
  userId: string | undefined;
}

export default function TeamDashboard({ userId }: TeamDashboardProps) {
  const { t, i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const { data: userTeams, isLoading: teamsLoading } = useUserTeams(userId);
  const { data: leaderboard } = useTeamLeaderboard(10);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [activeTab, setActiveTab] = useState<'team' | 'chat' | 'challenges' | 'leaderboard'>('team');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Get the selected team or first team
  const selectedTeam = userTeams?.find(t => t.id === selectedTeamId) || userTeams?.[0] || null;
  const { data: challenges } = useTeamChallenges(selectedTeam?.id);

  // Set initial selected team when teams load
  useEffect(() => {
    if (userTeams && userTeams.length > 0 && !selectedTeamId) {
      setSelectedTeamId(userTeams[0].id);
    }
  }, [userTeams, selectedTeamId]);

  if (teamsLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // No teams - show join/create options
  if (!userTeams || userTeams.length === 0) {
    return (
      <div className="space-y-6">
        <NoTeamView
          onCreateTeam={() => setShowCreateModal(true)}
          onJoinTeam={() => setShowJoinModal(true)}
          leaderboard={leaderboard || []}
          isSwahili={isSwahili}
        />

        {showCreateModal && (
          <CreateTeamModal
            userId={userId!}
            onClose={() => setShowCreateModal(false)}
            isSwahili={isSwahili}
          />
        )}

        {showJoinModal && (
          <JoinTeamModal
            userId={userId!}
            onClose={() => setShowJoinModal(false)}
            isSwahili={isSwahili}
          />
        )}
      </div>
    );
  }

  // Has teams - show dashboard
  return (
    <div className="space-y-4 pb-6">
      {/* Team Selector Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg"
      >
        {/* Team Selector Dropdown */}
        <div className="relative mb-4">
          <button
            onClick={() => setShowTeamSelector(!showTeamSelector)}
            className="w-full flex items-center justify-between bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center text-xl">
                {selectedTeam && getTeamTypeIcon(selectedTeam.teamType)}
              </div>
              <div className="text-left">
                <p className="font-semibold">
                  {selectedTeam && (isSwahili && selectedTeam.nameSw ? selectedTeam.nameSw : selectedTeam.name)}
                </p>
                <p className="text-xs text-indigo-200">
                  {userTeams.length} {userTeams.length === 1 ? t('teams.team', 'team') : t('teams.teamsPlural', 'teams')} {t('teams.joined', 'joined')}
                </p>
              </div>
            </div>
            <ChevronDown className={`w-5 h-5 transition-transform ${showTeamSelector ? 'rotate-180' : ''}`} />
          </button>

          {/* Dropdown Menu */}
          {showTeamSelector && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-20"
            >
              <div className="max-h-64 overflow-y-auto">
                {userTeams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => {
                      setSelectedTeamId(team.id);
                      setShowTeamSelector(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                      selectedTeamId === team.id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-xl">
                      {getTeamTypeIcon(team.teamType)}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {isSwahili && team.nameSw ? team.nameSw : team.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {team.stats.totalMembers} {t('teams.members', 'members')} • {team.stats.totalXp.toLocaleString()} XP
                      </p>
                    </div>
                    {team.userRole === 'leader' && (
                      <Crown className="w-4 h-4 text-yellow-500" />
                    )}
                    {selectedTeamId === team.id && (
                      <Check className="w-5 h-5 text-indigo-600" />
                    )}
                  </button>
                ))}
              </div>
              {/* Join Another Team Button */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-2">
                <button
                  onClick={() => {
                    setShowTeamSelector(false);
                    setShowJoinModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('teams.joinAnotherTeam', 'Join Another Team')}
                </button>
                <button
                  onClick={() => {
                    setShowTeamSelector(false);
                    setShowCreateModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                >
                  <UserPlus className="w-4 h-4" />
                  {t('teams.createNewTeam', 'Create New Team')}
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Selected Team Stats */}
        {selectedTeam && (
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
              {getTeamTypeIcon(selectedTeam.teamType)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold truncate">
                {isSwahili && selectedTeam.nameSw ? selectedTeam.nameSw : selectedTeam.name}
              </h2>
              <p className="text-indigo-100 text-sm">
                {getTeamTypeLabel(selectedTeam.teamType, isSwahili)}
                {selectedTeam.location && ` • ${selectedTeam.location}`}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  <span>{selectedTeam.stats.totalMembers} {t('teams.members', 'members')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy className="w-4 h-4" />
                  <span>{selectedTeam.stats.totalXp.toLocaleString()} XP</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 overflow-x-auto">
        {(['team', 'chat', 'challenges', 'leaderboard'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {tab === 'team' && t('teams.team', 'Team')}
            {tab === 'chat' && (
              <span className="flex items-center justify-center gap-1">
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">{t('teams.chat', 'Chat')}</span>
              </span>
            )}
            {tab === 'challenges' && t('teams.challenges', 'Challenges')}
            {tab === 'leaderboard' && t('teams.leaderboard', 'Leaderboard')}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {selectedTeam && activeTab === 'team' && (
        <TeamDetailsTab
          team={selectedTeam}
          userId={userId!}
          isSwahili={isSwahili}
        />
      )}

      {selectedTeam && activeTab === 'chat' && (
        <TeamChatTab
          teamId={selectedTeam.id}
          isSwahili={isSwahili}
        />
      )}

      {selectedTeam && activeTab === 'challenges' && (
        <TeamChallengesTab
          challenges={challenges || []}
          teamId={selectedTeam.id}
          isSwahili={isSwahili}
        />
      )}

      {selectedTeam && activeTab === 'leaderboard' && (
        <TeamLeaderboardTab
          leaderboard={leaderboard || []}
          userTeamId={selectedTeam.id}
          isSwahili={isSwahili}
        />
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateTeamModal
          userId={userId!}
          onClose={() => setShowCreateModal(false)}
          isSwahili={isSwahili}
        />
      )}

      {showJoinModal && (
        <JoinTeamModal
          userId={userId!}
          onClose={() => setShowJoinModal(false)}
          isSwahili={isSwahili}
        />
      )}
    </div>
  );
}

// ============================================
// NO TEAM VIEW
// ============================================

interface NoTeamViewProps {
  onCreateTeam: () => void;
  onJoinTeam: () => void;
  leaderboard: { teamId: string; name: string; totalXp: number; totalMembers: number; rank: number }[];
  isSwahili: boolean;
}

function NoTeamView({ onCreateTeam, onJoinTeam, leaderboard, isSwahili }: NoTeamViewProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center"
      >
        <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
          <Users className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold mb-2">
          {t('teams.joinTeam', 'Join a Team!')}
        </h2>
        <p className="text-indigo-100 mb-6">
          {t('teams.joinTeamDesc', 'Team up with your community to complete challenges together and win rewards!')}
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={onJoinTeam}
            className="px-6 py-3 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors"
          >
            {t('teams.joinWithCode', 'Join with Code')}
          </button>
          <button
            onClick={onCreateTeam}
            className="px-6 py-3 bg-indigo-700 text-white rounded-lg font-semibold hover:bg-indigo-800 transition-colors"
          >
            {t('teams.createTeam', 'Create Team')}
          </button>
        </div>
      </motion.div>

      {/* Benefits */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          {t('teams.benefits', 'Team Benefits')}
        </h3>
        <div className="space-y-3">
          {[
            { icon: Trophy, text: isSwahili ? 'Kushinda changamoto za timu' : 'Win team challenges together' },
            { icon: Target, text: isSwahili ? 'Malengo ya pamoja' : 'Collective goals (50 referrals, 100 crop plans)' },
            { icon: Award, text: isSwahili ? 'Tuzo za timu (T-shirts, Voucher)' : 'Team rewards (T-shirts, Vouchers)' },
            { icon: Users, text: isSwahili ? 'Ziara ya mtaalamu wa kilimo' : 'Agronomist visits for top teams' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-gray-600 dark:text-gray-300">
              <item.icon className="w-5 h-5 text-indigo-500" />
              <span className="text-sm">{item.text}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Top Teams Preview */}
      {leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            {t('teams.topTeams', 'Top Teams')}
          </h3>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((team, index) => (
              <div
                key={team.teamId}
                className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  index === 0 ? 'bg-yellow-100 text-yellow-600' :
                  index === 1 ? 'bg-gray-100 text-gray-500' :
                  index === 2 ? 'bg-amber-100 text-amber-600' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {index < 3 ? (
                    index === 0 ? <Trophy className="w-4 h-4" /> :
                    index === 1 ? <Medal className="w-4 h-4" /> :
                    <Award className="w-4 h-4" />
                  ) : (
                    <span className="text-sm font-bold">{team.rank}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{team.name}</p>
                  <p className="text-xs text-gray-500">{team.totalMembers} members</p>
                </div>
                <p className="font-bold text-gray-900 dark:text-white">{team.totalXp.toLocaleString()} XP</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ============================================
// TEAM DETAILS TAB
// ============================================

interface TeamDetailsTabProps {
  team: UserTeamDetails | TeamDetails;
  userId: string;
  isSwahili: boolean;
}

function TeamDetailsTab({ team, userId, isSwahili }: TeamDetailsTabProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const leaveTeamMutation = useLeaveTeam();

  const isLeader = team.leaderId === userId;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(team.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveTeam = () => {
    if (confirm(t('teams.confirmLeave', 'Are you sure you want to leave this team?'))) {
      leaveTeamMutation.mutate({ userId, teamId: team.id });
    }
  };

  return (
    <div className="space-y-4">
      {/* Invite Code */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-700"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-indigo-600 dark:text-indigo-300 font-medium">
              {t('teams.inviteCode', 'Invite Code')}
            </p>
            <p className="text-2xl font-mono font-bold text-indigo-700 dark:text-indigo-200">
              {team.inviteCode}
            </p>
          </div>
          <button
            onClick={copyInviteCode}
            className="p-3 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
          >
            {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-2">
          {t('teams.shareCode', 'Share this code with friends to invite them to your team')}
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: UserPlus, label: isSwahili ? 'Rufaa' : 'Referrals', value: team.stats.totalReferrals },
          { icon: BookOpen, label: isSwahili ? 'Masomo' : 'Lessons', value: team.stats.lessonsCompleted },
          { icon: Target, label: isSwahili ? 'Misheni' : 'Missions', value: team.stats.missionsCompleted },
          { icon: Camera, label: isSwahili ? 'Picha' : 'Photos', value: team.stats.photosSubmitted },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <stat.icon className="w-5 h-5 text-indigo-500 mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
            <p className="text-xs text-gray-500">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Members */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          {t('teams.members', 'Members')} ({team.members.length})
        </h3>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {team.members.map((member) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                {member.role === 'leader' ? (
                  <Crown className="w-4 h-4 text-yellow-500" />
                ) : (
                  <Users className="w-4 h-4 text-indigo-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white truncate">
                  {member.fullName || 'Farmer'}
                  {member.userId === userId && (
                    <span className="ml-2 text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded">
                      {t('teams.you', 'You')}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 capitalize">{member.role}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Achievements */}
      {team.achievements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            {t('teams.achievements', 'Achievements')}
          </h3>
          <div className="flex flex-wrap gap-2">
            {team.achievements.map((achievement, i) => (
              <div
                key={i}
                className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-center gap-2"
              >
                <span className="text-xl">{achievement.icon}</span>
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                  {isSwahili && achievement.nameSw ? achievement.nameSw : achievement.name}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Leave Team */}
      <button
        onClick={handleLeaveTeam}
        disabled={leaveTeamMutation.isPending}
        className="w-full py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        {isLeader
          ? t('teams.deleteTeam', 'Delete Team')
          : t('teams.leaveTeam', 'Leave Team')}
      </button>
    </div>
  );
}

// ============================================
// TEAM CHAT TAB
// ============================================

interface TeamChatTabProps {
  teamId: string;
  isSwahili: boolean;
}

function TeamChatTab({ teamId, isSwahili }: TeamChatTabProps) {
  const { t } = useTranslation();
  const { messages, isLoading, sendMessage, isSending, currentUserId, refetch } = useTeamChat(teamId);
  const [newMessage, setNewMessage] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);

  // Scroll to bottom only when new messages are added
  useEffect(() => {
    if (messages.length > prevMessageCount.current && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessageCount.current = messages.length;
  }, [messages.length]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  }, [refetch]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const messageToSend = newMessage;
    setNewMessage('');
    await sendMessage(messageToSend);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return isSwahili ? 'Jana' : 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col"
      style={{ height: '60vh', minHeight: '400px' }}
    >
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
        <MessageCircle className="w-5 h-5 text-indigo-500" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {t('teams.groupChat', 'Group Chat')}
        </h3>
        <span className="text-xs text-gray-500 ml-auto">
          {messages.length} {isSwahili ? 'ujumbe' : 'messages'}
        </span>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-gray-500 hover:text-indigo-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          title={isSwahili ? 'Sasisha' : 'Refresh'}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
      >
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {isSwahili
                ? 'Hakuna ujumbe bado. Kuwa wa kwanza kusema habari!'
                : 'No messages yet. Be the first to say hello!'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOwnMessage = msg.senderId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isOwnMessage
                      ? 'bg-indigo-500 text-white rounded-br-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md'
                  }`}
                >
                  {!isOwnMessage && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        {msg.senderName}
                      </span>
                      {msg.senderRole === 'leader' && (
                        <Crown className="w-3 h-3 text-yellow-500" />
                      )}
                    </div>
                  )}
                  <p className="text-sm break-words">{msg.content}</p>
                  <p
                    className={`text-[10px] mt-1 ${
                      isOwnMessage ? 'text-indigo-200' : 'text-gray-400'
                    }`}
                  >
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        onSubmit={handleSend}
        className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={isSwahili ? 'Andika ujumbe...' : 'Type a message...'}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-full bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || isSending}
          className="p-2 bg-indigo-500 text-white rounded-full hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </motion.div>
  );
}

// ============================================
// TEAM CHALLENGES TAB
// ============================================

interface TeamChallengesTabProps {
  challenges: TeamChallenge[];
  teamId: string;
  isSwahili: boolean;
}

function TeamChallengesTab({ challenges, isSwahili }: TeamChallengesTabProps) {
  const { t } = useTranslation();

  if (challenges.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{t('teams.noChallenges', 'No active team challenges')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {challenges.map((challenge) => {
        const progress = (challenge.currentProgress / challenge.targetCount) * 100;
        const isCompleted = challenge.status === 'completed';
        const daysLeft = Math.ceil(
          (new Date(challenge.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );

        return (
          <motion.div
            key={challenge.challengeId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border ${
              isCompleted
                ? 'border-green-200 dark:border-green-700'
                : 'border-gray-100 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                isCompleted
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : 'bg-indigo-100 dark:bg-indigo-900/30'
              }`}>
                {isCompleted ? '✅' : getChallengeTypeIcon(challenge.challengeType)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {isSwahili && challenge.nameSw ? challenge.nameSw : challenge.name}
                </h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {isSwahili && challenge.descriptionSw ? challenge.descriptionSw : challenge.description}
                </p>

                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{challenge.currentProgress} / {challenge.targetCount}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Rewards & Time */}
                <div className="flex items-center gap-4 mt-3 text-xs">
                  <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                    +{challenge.xpReward} XP
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-medium">
                    +{challenge.pointsReward} pts
                  </span>
                  {!isCompleted && daysLeft > 0 && (
                    <span className="text-gray-500">
                      {daysLeft} {t('teams.daysLeft', 'days left')}
                    </span>
                  )}
                  {isCompleted && (
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {t('teams.completed', 'Completed!')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// TEAM LEADERBOARD TAB
// ============================================

interface TeamLeaderboardTabProps {
  leaderboard: { teamId: string; name: string; nameSw?: string; totalXp: number; totalMembers: number; challengesCompleted: number; rank: number }[];
  userTeamId: string;
  isSwahili: boolean;
}

function TeamLeaderboardTab({ leaderboard, userTeamId, isSwahili }: TeamLeaderboardTabProps) {
  const { t } = useTranslation();

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>{t('teams.noLeaderboard', 'No teams yet')}</p>
      </div>
    );
  }

  const rankIcons = [
    { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
    { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-100 dark:bg-gray-800' },
    { icon: Award, color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  ];

  return (
    <div className="space-y-2">
      {leaderboard.map((team, index) => {
        const isUserTeam = team.teamId === userTeamId;
        const RankIcon = index < 3 ? rankIcons[index] : null;

        return (
          <motion.div
            key={team.teamId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              isUserTeam
                ? 'bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700'
                : 'bg-gray-50 dark:bg-gray-700/50'
            }`}
          >
            {/* Rank */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              RankIcon ? RankIcon.bg : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {RankIcon ? (
                <RankIcon.icon className={`w-4 h-4 ${RankIcon.color}`} />
              ) : (
                <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                  {team.rank}
                </span>
              )}
            </div>

            {/* Team Info */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium truncate ${
                isUserTeam
                  ? 'text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {isSwahili && team.nameSw ? team.nameSw : team.name}
                {isUserTeam && (
                  <span className="ml-2 text-xs bg-indigo-500 text-white px-1.5 py-0.5 rounded">
                    {t('teams.yourTeam', 'Your Team')}
                  </span>
                )}
              </p>
              <p className="text-xs text-gray-500">
                {team.totalMembers} {t('teams.members', 'members')} • {team.challengesCompleted} {t('teams.challenges', 'challenges')}
              </p>
            </div>

            {/* XP */}
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">
                {team.totalXp.toLocaleString()} XP
              </p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================
// CREATE TEAM MODAL
// ============================================

interface CreateTeamModalProps {
  userId: string;
  onClose: () => void;
  isSwahili: boolean;
}

function CreateTeamModal({ userId, onClose, isSwahili }: CreateTeamModalProps) {
  const { t } = useTranslation();
  const createTeamMutation = useCreateTeam();

  const [name, setName] = useState('');
  const [teamType, setTeamType] = useState<TeamType>('other');
  const [location, setLocation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await createTeamMutation.mutateAsync({
        userId,
        name: name.trim(),
        teamType,
        location: location.trim() || undefined,
      });
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  const teamTypes: TeamType[] = ['church', 'coop', 'youth_group', 'village', 'school', 'other'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('teams.createTeam', 'Create Team')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('teams.teamName', 'Team Name')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isSwahili ? 'Jina la timu' : 'Enter team name'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('teams.teamType', 'Team Type')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {teamTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTeamType(type)}
                  className={`p-2 rounded-lg text-center transition-colors ${
                    teamType === type
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-2 border-indigo-500'
                      : 'bg-gray-50 dark:bg-gray-700 border-2 border-transparent'
                  }`}
                >
                  <span className="text-xl block mb-1">{getTeamTypeIcon(type)}</span>
                  <span className="text-xs">{getTeamTypeLabel(type, isSwahili)}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('teams.location', 'Location')} ({t('common.optional', 'optional')})
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={isSwahili ? 'Mfano: Arusha, Tanzania' : 'e.g. Arusha, Tanzania'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createTeamMutation.isPending}
              className="flex-1 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createTeamMutation.isPending ? t('common.creating', 'Creating...') : t('teams.create', 'Create')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================
// JOIN TEAM MODAL
// ============================================

interface JoinTeamModalProps {
  userId: string;
  onClose: () => void;
  isSwahili: boolean;
}

function JoinTeamModal({ userId, onClose, isSwahili }: JoinTeamModalProps) {
  const { t } = useTranslation();
  const joinTeamMutation = useJoinTeam();

  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;

    setError('');
    try {
      await joinTeamMutation.mutateAsync({
        userId,
        inviteCode: inviteCode.trim().toUpperCase(),
      });
      onClose();
    } catch (err) {
      setError((err as Error).message || t('teams.joinError', 'Failed to join team'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          {t('teams.joinTeam', 'Join Team')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('teams.inviteCode', 'Invite Code')}
            </label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder={isSwahili ? 'Ingiza msimbo' : 'Enter 6-character code'}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 focus:border-transparent uppercase"
              maxLength={6}
              required
            />
            <p className="text-xs text-gray-500 mt-1 text-center">
              {t('teams.codeHint', 'Get this code from your team leader')}
            </p>
          </div>

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={inviteCode.length !== 6 || joinTeamMutation.isPending}
              className="flex-1 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {joinTeamMutation.isPending ? t('common.joining', 'Joining...') : t('teams.join', 'Join')}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================
// TEAM WIDGET (for RewardsOverview)
// ============================================

interface TeamWidgetProps {
  userId: string | undefined;
  onClick?: () => void;
}

export function TeamWidget({ userId, onClick }: TeamWidgetProps) {
  const { t, i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const { data: userTeams, isLoading } = useUserTeams(userId);

  if (isLoading) {
    return (
      <div className="h-24 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
    );
  }

  if (!userTeams || userTeams.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={onClick}
        className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="font-semibold">{t('teams.joinTeam', 'Join a Team!')}</p>
              <p className="text-sm text-indigo-100">
                {t('teams.teamUpDesc', 'Team up for rewards')}
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" />
        </div>
      </motion.div>
    );
  }

  // Show first team with count if multiple
  const firstTeam = userTeams[0];
  const teamCount = userTeams.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl relative">
            {getTeamTypeIcon(firstTeam.teamType)}
            {teamCount > 1 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full flex items-center justify-center">
                {teamCount}
              </span>
            )}
          </div>
          <div>
            <p className="font-semibold">
              {isSwahili && firstTeam.nameSw ? firstTeam.nameSw : firstTeam.name}
            </p>
            <p className="text-sm text-indigo-100">
              {teamCount > 1
                ? `${teamCount} ${t('teams.teamsPlural', 'teams')} ${t('teams.joined', 'joined')}`
                : `${firstTeam.stats.totalMembers} ${t('teams.members', 'members')} • ${firstTeam.stats.totalXp.toLocaleString()} XP`
              }
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" />
      </div>
    </motion.div>
  );
}
