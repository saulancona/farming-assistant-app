import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Ticket, Users, Calendar, Trophy, ChevronRight, Sun, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserRaffleStatus, useRaffleLeaderboard, useRafflePastWinners, getRaffleSourceDisplay, getMonthName } from '../../hooks/useRaffle';

interface RaffleWidgetProps {
  userId: string | undefined;
  compact?: boolean;
}

export default function RaffleWidget({ userId, compact = false }: RaffleWidgetProps) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const [showDetails, setShowDetails] = useState(false);

  const { data: raffleStatus, isLoading } = useUserRaffleStatus(userId);
  const { data: leaderboard } = useRaffleLeaderboard(5);
  const { data: pastWinners } = useRafflePastWinners(3);

  // Calculate fallback values (used when API fails or still loading)
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const drawMonth = currentMonth <= 6 ? 6 : 12;
  const fallbackDrawDate = new Date(now.getFullYear(), drawMonth - 1, drawMonth === 6 ? 30 : 31);
  const fallbackDaysRemaining = Math.max(0, Math.ceil((fallbackDrawDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Use actual data if available, otherwise use fallback values
  const userEntries = raffleStatus?.userEntries ?? 0;
  const daysRemaining = raffleStatus?.daysRemaining ?? fallbackDaysRemaining;

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-xl ${compact ? 'p-3' : 'p-4'} animate-pulse`}>
        <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </div>
    );
  }

  // Get month name and prize name (use defaults if not available)
  const monthName = raffleStatus ? getMonthName(raffleStatus.month, isSwahili) : getMonthName(drawMonth, isSwahili);
  const prizeName = raffleStatus?.prize ? (isSwahili ? raffleStatus.prize.nameSw : raffleStatus.prize.name) : (isSwahili ? 'Paneli ya Jua' : 'Solar Panel');

  // Compact widget for dashboard
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white cursor-pointer hover:shadow-lg transition-shadow"
        onClick={() => setShowDetails(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Sun className="w-7 h-7" />
            </div>
            <div>
              <p className="text-sm opacity-90">
                {isSwahili ? 'Bahati Nasibu' : 'Bi-Annual Raffle'}
              </p>
              <p className="font-bold text-lg">
                {isSwahili ? 'Paneli ya Jua' : 'Solar Panel'}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1">
              <Ticket className="w-4 h-4" />
              <span className="text-2xl font-bold">{userEntries}</span>
            </div>
            <p className="text-xs opacity-80">
              {isSwahili ? 'tiketi zako' : 'your tickets'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-1 opacity-80">
            <Calendar className="w-4 h-4" />
            <span>{daysRemaining} {isSwahili ? 'siku zilizobaki' : 'days left'}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="opacity-80">{isSwahili ? 'Tazama' : 'View'}</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>

        {/* Details Modal */}
        {raffleStatus && (
          <RaffleDetailsModal
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
            raffleStatus={raffleStatus}
            leaderboard={leaderboard || []}
            pastWinners={pastWinners || []}
            isSwahili={isSwahili}
          />
        )}
      </motion.div>
    );
  }

  // Full widget - requires raffleStatus to be available
  if (!raffleStatus) {
    return null; // Full widget requires data
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-6 text-white relative overflow-hidden">
        {/* Decorative sun rays */}
        <div className="absolute -top-10 -right-10 w-40 h-40 opacity-20">
          <Sun className="w-full h-full" />
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Gift className="w-5 h-5" />
                {monthName} {isSwahili ? 'Bahati Nasibu' : 'Raffle'}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {isSwahili ? 'Shinda Paneli ya Jua!' : 'Win a Solar Panel!'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{raffleStatus.daysRemaining}</div>
              <div className="text-white/80 text-sm">
                {isSwahili ? 'siku zilizobaki' : 'days left'}
              </div>
            </div>
          </div>

          {/* Prize Display */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-lg flex items-center justify-center">
              <Sun className="w-10 h-10 text-yellow-200" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg">{prizeName || 'Solar Panel Kit'}</p>
              <p className="text-white/80 text-sm">
                {raffleStatus.prize?.valueUsd && `$${raffleStatus.prize.valueUsd} ${isSwahili ? 'thamani' : 'value'}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Your Entries */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
            <Ticket className="w-4 h-4 text-amber-500" />
            {isSwahili ? 'Tiketi Zako' : 'Your Tickets'}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {raffleStatus.userEntries}
            </span>
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              / {raffleStatus.totalEntries} {isSwahili ? 'jumla' : 'total'}
            </span>
          </div>
        </div>

        {/* Entry Sources */}
        {raffleStatus.entrySources.length > 0 ? (
          <div className="space-y-2">
            {raffleStatus.entrySources.map((source, index) => {
              const display = getRaffleSourceDisplay(source.source, isSwahili);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{display.icon}</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300">{display.label}</span>
                  </div>
                  <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                    +{source.entries} {isSwahili ? 'tiketi' : 'ticket(s)'}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500 dark:text-gray-400">
            <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isSwahili
                ? 'Bado huna tiketi. Fikia mfululizo wa siku 30 kupata tiketi!'
                : "No tickets yet. Reach a 30-day streak to earn tickets!"}
            </p>
          </div>
        )}
      </div>

      {/* How to Earn More */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20">
        <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 text-sm">
          {isSwahili ? 'Jinsi ya Kupata Tiketi Zaidi' : 'How to Earn More Tickets'}
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span>🔥</span>
            <span>{isSwahili ? 'Mfululizo wa siku 30' : '30-day streak'}: 1 {isSwahili ? 'tiketi' : 'ticket'}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span>🔥🔥</span>
            <span>{isSwahili ? 'Mfululizo wa siku 60' : '60-day streak'}: 2 {isSwahili ? 'tiketi' : 'tickets'}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span>🔥🔥🔥</span>
            <span>{isSwahili ? 'Mfululizo wa siku 90' : '90-day streak'}: 3 {isSwahili ? 'tiketi' : 'tickets'}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
            <span>🎯</span>
            <span>{isSwahili ? 'Maliza misheni' : 'Complete missions'}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <Users className="w-4 h-4" />
            {isSwahili ? 'Washiriki' : 'Participants'}
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {raffleStatus.totalParticipants}
          </div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-gray-500 dark:text-gray-400 text-sm mb-1">
            <Ticket className="w-4 h-4" />
            {isSwahili ? 'Tiketi Zote' : 'Total Tickets'}
          </div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">
            {raffleStatus.totalEntries}
          </div>
        </div>
      </div>

      {/* Win Probability */}
      {raffleStatus.userEntries > 0 && raffleStatus.totalEntries > 0 && (
        <div className="px-4 pb-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
            <p className="text-sm text-green-800 dark:text-green-300">
              {isSwahili ? 'Nafasi yako ya kushinda' : 'Your winning chance'}:{' '}
              <span className="font-bold">
                {((raffleStatus.userEntries / raffleStatus.totalEntries) * 100).toFixed(1)}%
              </span>
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Details Modal Component
interface RaffleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  raffleStatus: any;
  leaderboard: any[];
  pastWinners: any[];
  isSwahili: boolean;
}

function RaffleDetailsModal({ isOpen, onClose, raffleStatus, leaderboard, pastWinners, isSwahili }: RaffleDetailsModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 p-4 text-white sticky top-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Sun className="w-5 h-5" />
                {isSwahili ? 'Bahati Nasibu' : 'Bi-Annual Raffle'}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* Prize */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
              <Sun className="w-16 h-16 mx-auto text-amber-500 mb-2" />
              <h4 className="font-bold text-lg text-gray-900 dark:text-white">
                {isSwahili ? 'Paneli ya Jua' : 'Solar Panel Kit'}
              </h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                {isSwahili
                  ? 'Kifurushi kamili cha paneli ya jua ikiwa na betri na taa za LED'
                  : 'Complete kit with panel, battery, and LED lights'}
              </p>
              {raffleStatus.prize?.valueUsd && (
                <p className="text-amber-600 dark:text-amber-400 font-bold mt-2">
                  ${raffleStatus.prize.valueUsd} {isSwahili ? 'thamani' : 'value'}
                </p>
              )}
            </div>

            {/* Your Status */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  {isSwahili ? 'Tiketi zako' : 'Your tickets'}
                </span>
                <span className="text-2xl font-bold text-amber-600">{raffleStatus.userEntries}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {isSwahili ? 'Nafasi ya kushinda' : 'Win chance'}
                </span>
                <span className="font-bold text-green-600">
                  {raffleStatus.totalEntries > 0
                    ? `${((raffleStatus.userEntries / raffleStatus.totalEntries) * 100).toFixed(1)}%`
                    : '0%'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-gray-600 dark:text-gray-400">
                  {isSwahili ? 'Siku zilizobaki' : 'Days remaining'}
                </span>
                <span className="font-bold">{raffleStatus.daysRemaining}</span>
              </div>
            </div>

            {/* Leaderboard */}
            {leaderboard.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  {isSwahili ? 'Viongozi' : 'Leaderboard'}
                </h4>
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          index === 0 ? 'bg-amber-400 text-white' :
                          index === 1 ? 'bg-gray-400 text-white' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                        }`}>
                          {entry.rank}
                        </span>
                        <span className="text-sm text-gray-700 dark:text-gray-300">{entry.fullName}</span>
                      </div>
                      <span className="text-sm font-medium text-amber-600">
                        {entry.totalEntries} 🎟️
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past Winners */}
            {pastWinners.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-green-500" />
                  {isSwahili ? 'Washindi wa Awali' : 'Past Winners'}
                </h4>
                <div className="space-y-2">
                  {pastWinners.map((winner) => (
                    <div
                      key={winner.raffleId}
                      className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2"
                    >
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {winner.winnerName}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {getMonthName(winner.month, isSwahili)} {winner.year}
                        </p>
                      </div>
                      <span className="text-sm text-green-600 dark:text-green-400">
                        🏆 {winner.prizeName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Mini widget for inline display
export function RaffleMiniWidget({ userId }: { userId: string | undefined }) {
  const { i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const { data: raffleStatus, isLoading } = useUserRaffleStatus(userId);

  if (isLoading || !raffleStatus) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2">
      <Sun className="w-5 h-5 text-amber-500" />
      <div className="flex-1">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {isSwahili ? 'Bahati Nasibu' : 'Raffle'}
        </p>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {raffleStatus.userEntries} 🎟️ • {raffleStatus.daysRemaining}d
        </p>
      </div>
    </div>
  );
}
