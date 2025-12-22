import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { create } from 'zustand';

// ============================================
// TYPES
// ============================================

export interface MicroRewardResult {
  success: boolean;
  rewarded: boolean;
  reason?: string;
  actionId?: string;
  pointsAwarded?: number;
  xpAwarded?: number;
  actionName?: string;
  actionNameSw?: string;
  feedbackMessage?: string;
  feedbackMessageSw?: string;
  dailyCount?: number;
  dailyLimit?: number;
  badgeProgress?: BadgeProgressUpdate | null;
}

export interface BadgeProgressUpdate {
  badgeType: string;
  currentProgress: number;
  targetProgress: number;
  stepsRemaining?: number;
  justCompleted: boolean;
  bonusXp?: number;
}

export interface BadgeProgress {
  badgeType: string;
  currentProgress: number;
  targetProgress: number;
  isCompleted: boolean;
  completedAt?: string;
  percentComplete: number;
}

export interface MicroActionStats {
  todayActions: number;
  todayPoints: number;
  totalActions: number;
  totalPoints: number;
}

export type MicroActionType =
  | 'price_check'
  | 'price_compare'
  | 'weather_check'
  | 'weather_forecast'
  | 'task_complete'
  | 'task_create'
  | 'field_visit'
  | 'article_read'
  | 'video_watch'
  | 'quiz_attempt'
  | 'community_post'
  | 'community_comment'
  | 'community_like'
  | 'photo_upload'
  | 'pest_report'
  | 'expense_logged'
  | 'income_logged'
  | 'inventory_update'
  | 'ai_chat'
  | 'ai_diagnosis'
  | 'daily_login'
  | 'streak_bonus';

// ============================================
// TOAST/NOTIFICATION STORE
// ============================================

interface MicroWinToast {
  id: string;
  type: 'reward' | 'badge' | 'streak' | 'limit';
  message: string;
  messageSw?: string;
  points?: number;
  xp?: number;
  badgeProgress?: BadgeProgressUpdate;
  timestamp: number;
}

interface MicroWinStore {
  toasts: MicroWinToast[];
  addToast: (toast: Omit<MicroWinToast, 'id' | 'timestamp'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useMicroWinStore = create<MicroWinStore>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: MicroWinToast = {
      ...toast,
      id,
      timestamp: Date.now(),
    };
    set((state) => ({
      toasts: [...state.toasts, newToast].slice(-5), // Keep max 5 toasts
    }));

    // Auto-remove after 3 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 3000);
  },
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

// ============================================
// SOUND EFFECTS (Optional)
// ============================================

const SOUNDS = {
  coin: '/sounds/coin.mp3',
  success: '/sounds/success.mp3',
  badge: '/sounds/badge.mp3',
  levelUp: '/sounds/levelup.mp3',
};

function playSound(type: keyof typeof SOUNDS) {
  try {
    // Check if sound is enabled in settings
    const soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
    if (!soundEnabled) return;

    const audio = new Audio(SOUNDS[type]);
    audio.volume = 0.3;
    audio.play().catch(() => {
      // Ignore audio play errors (common on mobile)
    });
  } catch {
    // Ignore errors
  }
}

// ============================================
// HOOKS
// ============================================

/**
 * Award a micro-reward for an action
 */
export function useAwardMicroReward() {
  const queryClient = useQueryClient();
  const addToast = useMicroWinStore((state) => state.addToast);

  return useMutation({
    mutationFn: async ({
      userId,
      actionType,
      context,
    }: {
      userId: string;
      actionType: MicroActionType;
      context?: Record<string, unknown>;
    }): Promise<MicroRewardResult> => {
      const { data, error } = await supabase.rpc('award_micro_reward', {
        p_user_id: userId,
        p_action_type: actionType,
        p_context: context || null,
      });

      if (error) throw error;
      return data as MicroRewardResult;
    },
    onSuccess: (result, variables) => {
      if (result.rewarded) {
        // Play sound
        playSound('coin');

        // Show toast
        addToast({
          type: 'reward',
          message: result.feedbackMessage || 'Points earned!',
          messageSw: result.feedbackMessageSw,
          points: result.pointsAwarded,
          xp: result.xpAwarded,
        });

        // Check for badge progress
        if (result.badgeProgress?.justCompleted) {
          playSound('badge');
          addToast({
            type: 'badge',
            message: `Badge unlocked: ${getBadgeLabel(result.badgeProgress.badgeType)}!`,
            messageSw: `Beji imefunguliwa: ${getBadgeLabelSw(result.badgeProgress.badgeType)}!`,
            badgeProgress: result.badgeProgress,
            xp: result.badgeProgress.bonusXp,
          });
        } else if (result.badgeProgress && result.badgeProgress.stepsRemaining !== undefined) {
          // Show progress hint occasionally (every 3 steps)
          if (result.badgeProgress.currentProgress % 3 === 0) {
            addToast({
              type: 'badge',
              message: `${result.badgeProgress.stepsRemaining} more to earn ${getBadgeLabel(result.badgeProgress.badgeType)}!`,
              messageSw: `${result.badgeProgress.stepsRemaining} zaidi kupata ${getBadgeLabelSw(result.badgeProgress.badgeType)}!`,
              badgeProgress: result.badgeProgress,
            });
          }
        }

        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['microActionStats', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['badgeProgress', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['userPoints', variables.userId] });
      } else if (result.reason === 'Daily limit reached') {
        addToast({
          type: 'limit',
          message: 'Daily limit reached for this action',
          messageSw: 'Kikomo cha kila siku kimefikiwa',
        });
      }
    },
  });
}

/**
 * Get user's badge progress
 */
export function useBadgeProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['badgeProgress', userId],
    queryFn: async (): Promise<BadgeProgress[]> => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_user_badge_progress', {
        p_user_id: userId,
      });

      if (error) throw error;
      return (data || []) as BadgeProgress[];
    },
    enabled: !!userId,
  });
}

/**
 * Get user's micro-action stats
 */
export function useMicroActionStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['microActionStats', userId],
    queryFn: async (): Promise<MicroActionStats> => {
      if (!userId) {
        return { todayActions: 0, todayPoints: 0, totalActions: 0, totalPoints: 0 };
      }

      const { data, error } = await supabase.rpc('get_micro_action_stats', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as MicroActionStats;
    },
    enabled: !!userId,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const BADGE_LABELS: Record<string, { en: string; sw: string; icon: string }> = {
  market_watcher: { en: 'Market Watcher', sw: 'Mlinzi wa Soko', icon: '📊' },
  weather_guru: { en: 'Weather Guru', sw: 'Mtaalamu wa Hali ya Hewa', icon: '⛅' },
  task_master: { en: 'Task Master', sw: 'Bingwa wa Kazi', icon: '✅' },
  field_inspector: { en: 'Field Inspector', sw: 'Mkaguzi wa Shamba', icon: '🌾' },
  knowledge_seeker: { en: 'Knowledge Seeker', sw: 'Mtafutaji Maarifa', icon: '📚' },
  video_learner: { en: 'Video Learner', sw: 'Mwanafunzi wa Video', icon: '🎬' },
  community_voice: { en: 'Community Voice', sw: 'Sauti ya Jamii', icon: '💬' },
  photo_journalist: { en: 'Photo Journalist', sw: 'Mpiga Picha', icon: '📸' },
};

export function getBadgeLabel(badgeType: string): string {
  return BADGE_LABELS[badgeType]?.en || badgeType;
}

export function getBadgeLabelSw(badgeType: string): string {
  return BADGE_LABELS[badgeType]?.sw || badgeType;
}

export function getBadgeIcon(badgeType: string): string {
  return BADGE_LABELS[badgeType]?.icon || '🏆';
}

export function getActionLabel(actionType: MicroActionType, isSwahili: boolean = false): string {
  const labels: Record<MicroActionType, { en: string; sw: string }> = {
    price_check: { en: 'Price Check', sw: 'Kuangalia Bei' },
    price_compare: { en: 'Price Compare', sw: 'Kulinganisha Bei' },
    weather_check: { en: 'Weather Check', sw: 'Kuangalia Hewa' },
    weather_forecast: { en: 'Forecast View', sw: 'Utabiri' },
    task_complete: { en: 'Task Done', sw: 'Kazi Imekamilika' },
    task_create: { en: 'Task Created', sw: 'Kazi Imeundwa' },
    field_visit: { en: 'Field Record', sw: 'Rekodi ya Shamba' },
    article_read: { en: 'Article Read', sw: 'Makala Imesomwa' },
    video_watch: { en: 'Video Watched', sw: 'Video Imetazamwa' },
    quiz_attempt: { en: 'Quiz Done', sw: 'Mtihani Umekamilika' },
    community_post: { en: 'Post Created', sw: 'Chapisho' },
    community_comment: { en: 'Comment', sw: 'Maoni' },
    community_like: { en: 'Liked', sw: 'Umependa' },
    photo_upload: { en: 'Photo Upload', sw: 'Picha Imepakiwa' },
    pest_report: { en: 'Pest Report', sw: 'Ripoti ya Wadudu' },
    expense_logged: { en: 'Expense Logged', sw: 'Gharama' },
    income_logged: { en: 'Income Logged', sw: 'Mapato' },
    inventory_update: { en: 'Inventory Update', sw: 'Hesabu' },
    ai_chat: { en: 'AI Chat', sw: 'AI Chat' },
    ai_diagnosis: { en: 'AI Diagnosis', sw: 'Uchunguzi wa AI' },
    daily_login: { en: 'Daily Login', sw: 'Kuingia Kila Siku' },
    streak_bonus: { en: 'Streak Bonus', sw: 'Bonasi ya Mfululizo' },
  };

  return isSwahili ? labels[actionType].sw : labels[actionType].en;
}
