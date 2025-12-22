import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  StreakStatus,
  StreakActivityType,
  RecordActivityResult,
  SaveStreakResult,
  StreakMilestone,
  StreakVoiceTip,
} from '../types';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: unknown): unknown {
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj as Record<string, unknown>).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase((obj as Record<string, unknown>)[key]);
      return acc;
    }, {} as Record<string, unknown>);
  }
  return obj;
}

// ============================================
// GET STREAK STATUS
// ============================================
export function useStreakStatus(userId: string | undefined) {
  return useQuery({
    queryKey: ['streakStatus', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_streak_status', {
        p_user_id: userId,
      });

      if (error) throw error;

      return toCamelCase(data) as StreakStatus;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

// ============================================
// RECORD DAILY ACTIVITY
// ============================================
export function useRecordActivity() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      activityType,
      activityName,
      activityNameSw,
    }: {
      userId: string;
      activityType: StreakActivityType;
      activityName?: string;
      activityNameSw?: string;
    }): Promise<RecordActivityResult> => {
      const { data, error } = await supabase.rpc('record_daily_activity', {
        p_user_id: userId,
        p_activity_type: activityType,
        p_activity_name: activityName || null,
        p_activity_name_sw: activityNameSw || null,
      });

      if (error) throw error;

      return toCamelCase(data) as RecordActivityResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['streakStatus', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['dailyStreak', variables.userId] });
    },
  });
}

// ============================================
// SAVE STREAK WITH CHALLENGE
// ============================================
export function useSaveStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      challengeType,
      evidenceUrl,
    }: {
      userId: string;
      challengeType: 'photo_upload' | 'price_check' | 'complete_task';
      evidenceUrl?: string;
    }): Promise<SaveStreakResult> => {
      const { data, error } = await supabase.rpc('save_streak_with_challenge', {
        p_user_id: userId,
        p_challenge_type: challengeType,
        p_evidence_url: evidenceUrl || null,
      });

      if (error) throw error;

      return toCamelCase(data) as SaveStreakResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['streakStatus', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['dailyStreak', variables.userId] });
    },
  });
}

// ============================================
// GET STREAK MILESTONES
// ============================================
export function useStreakMilestones() {
  return useQuery({
    queryKey: ['streakMilestones'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streak_milestones')
        .select('*')
        .order('streak_days', { ascending: true });

      if (error) throw error;

      return (toCamelCase(data) as StreakMilestone[]) || [];
    },
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
}

// ============================================
// GET VOICE TIP
// ============================================
export function useStreakVoiceTip(tipKey: string | undefined) {
  return useQuery({
    queryKey: ['streakVoiceTip', tipKey],
    queryFn: async () => {
      if (!tipKey) return null;

      const { data, error } = await supabase.rpc('get_streak_voice_tip', {
        p_tip_key: tipKey,
      });

      if (error) throw error;

      return toCamelCase(data) as StreakVoiceTip | null;
    },
    enabled: !!tipKey,
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
}

// ============================================
// HELPER: Activity names in both languages
// ============================================
export const ACTIVITY_NAMES: Record<StreakActivityType, { en: string; sw: string }> = {
  weather_check: { en: 'Checked Weather', sw: 'Kuangalia Hali ya Hewa' },
  price_check: { en: 'Checked Market Prices', sw: 'Kuangalia Bei za Soko' },
  task_complete: { en: 'Completed a Task', sw: 'Kukamilisha Kazi' },
  photo_upload: { en: 'Uploaded Photo', sw: 'Kupakia Picha' },
  field_update: { en: 'Updated Field', sw: 'Kusasisha Shamba' },
  expense_logged: { en: 'Logged Expense', sw: 'Kurekodi Gharama' },
  income_logged: { en: 'Logged Income', sw: 'Kurekodi Mapato' },
  community_post: { en: 'Posted in Community', sw: 'Kuchapisha Jamii' },
  learning_complete: { en: 'Completed Learning', sw: 'Kukamilisha Kujifunza' },
  mission_step: { en: 'Completed Mission Step', sw: 'Kukamilisha Hatua ya Misheni' },
  streak_save: { en: 'Saved Streak', sw: 'Kuokoa Mfululizo' },
  app_open: { en: 'Opened App', sw: 'Kufungua Programu' },
};

// ============================================
// HELPER: Get streak status message
// ============================================
export function getStreakStatusMessage(
  streak: number,
  isSwahili: boolean
): { emoji: string; message: string } {
  if (streak === 0) {
    return {
      emoji: '🌱',
      message: isSwahili ? 'Anza mfululizo wako leo!' : 'Start your streak today!',
    };
  }
  if (streak < 3) {
    return {
      emoji: '🔥',
      message: isSwahili
        ? `Siku ${streak} - Endelea hivyo!`
        : `Day ${streak} - Keep it up!`,
    };
  }
  if (streak < 7) {
    return {
      emoji: '🔥🔥',
      message: isSwahili
        ? `Siku ${streak} - Unaendelea vizuri!`
        : `Day ${streak} - You're doing great!`,
    };
  }
  if (streak < 14) {
    return {
      emoji: '⭐',
      message: isSwahili
        ? `Siku ${streak} - Wiki nzima!`
        : `Day ${streak} - Full week!`,
    };
  }
  if (streak < 30) {
    return {
      emoji: '🌟',
      message: isSwahili
        ? `Siku ${streak} - Mkulima wa kujitolea!`
        : `Day ${streak} - Dedicated farmer!`,
    };
  }
  return {
    emoji: '🏆',
    message: isSwahili
      ? `Siku ${streak} - Bingwa wa mfululizo!`
      : `Day ${streak} - Streak champion!`,
  };
}

// ============================================
// HELPER: Get streak fire emoji based on count
// ============================================
export function getStreakFireEmoji(streak: number): string {
  if (streak === 0) return '❄️';
  if (streak < 3) return '🔥';
  if (streak < 7) return '🔥🔥';
  if (streak < 14) return '🔥🔥🔥';
  if (streak < 30) return '⭐';
  return '🏆';
}

// ============================================
// HELPER: Check if streak needs attention
// ============================================
export function streakNeedsAttention(status: StreakStatus | null): {
  needsAction: boolean;
  type: 'at_risk' | 'can_recover' | 'milestone_nearby' | null;
  message?: string;
} {
  if (!status) return { needsAction: false, type: null };

  if (status.canSaveStreak) {
    return {
      needsAction: true,
      type: 'can_recover',
      message: 'Your streak can be saved!',
    };
  }

  if (status.streakAtRisk) {
    return {
      needsAction: true,
      type: 'at_risk',
      message: 'Complete an activity to keep your streak!',
    };
  }

  if (status.nextMilestone && status.nextMilestone.daysRemaining <= 2) {
    return {
      needsAction: true,
      type: 'milestone_nearby',
      message: `${status.nextMilestone.daysRemaining} days to ${status.nextMilestone.name}!`,
    };
  }

  return { needsAction: false, type: null };
}
