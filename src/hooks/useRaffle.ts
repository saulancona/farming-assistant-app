import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  UserRaffleStatus,
  RaffleLeaderboardEntry,
  RafflePastWinner,
  AwardRaffleEntryResult,
} from '../types';

/**
 * Hook to get the current user's raffle status for this month
 */
export function useUserRaffleStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['raffleStatus', userId],
    queryFn: async (): Promise<UserRaffleStatus | null> => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_user_raffle_status', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[Raffle] Error fetching raffle status:', error);
        return null;
      }

      // Convert snake_case to camelCase
      return {
        raffleId: data.raffleId,
        month: data.month,
        year: data.year,
        status: data.status,
        drawDate: data.drawDate,
        daysRemaining: data.daysRemaining,
        userEntries: data.userEntries,
        totalEntries: data.totalEntries,
        totalParticipants: data.totalParticipants,
        entrySources: (data.entrySources || []).map((source: any) => ({
          source: source.source,
          entries: source.entries,
          earnedAt: source.earnedAt,
        })),
        prize: data.prize ? {
          id: data.prize.id,
          name: data.prize.name,
          nameSw: data.prize.nameSw,
          description: data.prize.description,
          descriptionSw: data.prize.descriptionSw,
          imageUrl: data.prize.imageUrl,
          valueUsd: data.prize.valueUsd,
          sponsor: data.prize.sponsor,
        } : undefined,
        winnerId: data.winnerId,
        winnerName: data.winnerName,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to get the raffle leaderboard for current month
 */
export function useRaffleLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: ['raffleLeaderboard', limit],
    queryFn: async (): Promise<RaffleLeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('get_raffle_leaderboard', {
        p_limit: limit,
      });

      if (error) {
        console.error('[Raffle] Error fetching leaderboard:', error);
        return [];
      }

      return (data || []).map((entry: any) => ({
        rank: entry.rank,
        userId: entry.user_id,
        fullName: entry.full_name,
        totalEntries: entry.total_entries,
        entryCount: entry.entry_count,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to get past raffle winners
 */
export function useRafflePastWinners(limit: number = 12) {
  return useQuery({
    queryKey: ['rafflePastWinners', limit],
    queryFn: async (): Promise<RafflePastWinner[]> => {
      const { data, error } = await supabase.rpc('get_raffle_past_winners', {
        p_limit: limit,
      });

      if (error) {
        console.error('[Raffle] Error fetching past winners:', error);
        return [];
      }

      return (data || []).map((winner: any) => ({
        raffleId: winner.raffle_id,
        month: winner.month,
        year: winner.year,
        winnerId: winner.winner_id,
        winnerName: winner.winner_name,
        prizeName: winner.prize_name,
        prizeImageUrl: winner.prize_image_url,
        totalEntries: winner.total_entries,
        totalParticipants: winner.total_participants,
        drawnAt: winner.drawn_at,
      }));
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to manually award a raffle entry (for testing or special events)
 */
export function useAwardRaffleEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      source,
      sourceId,
      entryCount = 1,
    }: {
      userId: string;
      source: string;
      sourceId?: string;
      entryCount?: number;
    }): Promise<AwardRaffleEntryResult> => {
      const { data, error } = await supabase.rpc('award_raffle_entry', {
        p_user_id: userId,
        p_source: source,
        p_source_id: sourceId || null,
        p_entry_count: entryCount,
      });

      if (error) {
        console.error('[Raffle] Error awarding entry:', error);
        throw error;
      }

      return {
        success: data.success,
        entryId: data.entryId,
        raffleId: data.raffleId,
        totalUserEntries: data.totalUserEntries,
        source: data.source,
        alreadyAwarded: data.alreadyAwarded,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate raffle queries
      queryClient.invalidateQueries({ queryKey: ['raffleStatus', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['raffleLeaderboard'] });
    },
  });
}

/**
 * Get the display name for a raffle entry source
 */
export function getRaffleSourceDisplay(source: string, isSwahili: boolean = false): { icon: string; label: string } {
  // Handle dynamic streak sources (streak_5, streak_10, streak_15, etc.)
  const streakMatch = source.match(/^streak_(\d+)$/);
  if (streakMatch) {
    const days = parseInt(streakMatch[1], 10);
    return {
      icon: '🔥',
      label: isSwahili ? `Mfululizo wa Siku ${days}` : `${days}-Day Streak`,
    };
  }

  const sources: Record<string, { icon: string; en: string; sw: string }> = {
    mission_complete: { icon: '🎯', en: 'Mission Complete', sw: 'Misheni Imekamilika' },
    achievement: { icon: '🏆', en: 'Achievement Unlocked', sw: 'Mafanikio Yamefunguliwa' },
    photo_challenge: { icon: '📸', en: 'Photo Challenge', sw: 'Changamoto ya Picha' },
    referral: { icon: '👥', en: 'Referral Bonus', sw: 'Bonasi ya Rufaa' },
    special_event: { icon: '🎉', en: 'Special Event', sw: 'Tukio Maalum' },
  };

  const info = sources[source] || { icon: '🎟️', en: source, sw: source };
  return {
    icon: info.icon,
    label: isSwahili ? info.sw : info.en,
  };
}

/**
 * Get the month name
 */
export function getMonthName(month: number, isSwahili: boolean = false): string {
  const monthsEn = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const monthsSw = [
    'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
    'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba'
  ];

  return isSwahili ? monthsSw[month - 1] : monthsEn[month - 1];
}

export default useUserRaffleStatus;
