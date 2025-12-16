import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  UserRewardsProfile,
  UserXPLog,
  DailyStreak,
  Achievement,
  UserAchievement,
  UserLevel,
  LeaderboardEntry,
  XPAwardResult,
  StreakUpdateResult,
} from '../types';

// Helper function to convert snake_case to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      acc[camelKey] = toCamelCase(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
}

// ============================================
// REWARDS PROFILE HOOKS
// ============================================

export function useRewardsProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ['rewardsProfile', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_rewards_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // If no profile exists, create one
      if (!data) {
        const { data: newProfile, error: createError } = await supabase
          .from('user_rewards_profiles')
          .insert({ user_id: userId })
          .select()
          .single();

        if (createError) throw createError;
        return toCamelCase(newProfile) as UserRewardsProfile;
      }

      return toCamelCase(data) as UserRewardsProfile;
    },
    enabled: !!userId,
  });
}

// ============================================
// XP HISTORY HOOK
// ============================================

export function useXPHistory(userId: string | undefined, limit: number = 50) {
  return useQuery({
    queryKey: ['xpHistory', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('xp_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return toCamelCase(data) as UserXPLog[];
    },
    enabled: !!userId,
  });
}

// ============================================
// DAILY STREAK HOOKS
// ============================================

export function useDailyStreak(userId: string | undefined) {
  return useQuery({
    queryKey: ['dailyStreak', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('daily_streaks')
        .select('*')
        .eq('user_id', userId)
        .order('streak_date', { ascending: false })
        .limit(30); // Last 30 days

      if (error) throw error;
      return toCamelCase(data) as DailyStreak[];
    },
    enabled: !!userId,
  });
}

export function useUpdateStreak() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<StreakUpdateResult> => {
      const { data, error } = await supabase.rpc('update_daily_streak', {
        p_user_id: userId
      });

      if (error) throw error;

      // Data comes back as an array with one row
      const result = data?.[0] || data;
      return {
        currentStreak: result.current_streak,
        streakXp: result.streak_xp,
        isNewDay: result.is_new_day,
      };
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['dailyStreak', userId] });
      queryClient.invalidateQueries({ queryKey: ['xpHistory', userId] });
    },
  });
}

// ============================================
// ACHIEVEMENTS HOOKS
// ============================================

export function useAchievements() {
  return useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .order('category', { ascending: true })
        .order('requirement_value', { ascending: true });

      if (error) throw error;
      return toCamelCase(data) as Achievement[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour since achievements rarely change
  });
}

export function useUserAchievements(userId: string | undefined) {
  return useQuery({
    queryKey: ['userAchievements', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          achievement:achievements(*)
        `)
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      return toCamelCase(data) as UserAchievement[];
    },
    enabled: !!userId,
  });
}

// ============================================
// LEVEL DEFINITIONS HOOK
// ============================================

export function useLevelDefinitions() {
  return useQuery({
    queryKey: ['levelDefinitions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('level_definitions')
        .select('*')
        .order('level', { ascending: true });

      if (error) throw error;
      return toCamelCase(data) as UserLevel[];
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });
}

export function useCurrentLevel(currentLevel: number) {
  const { data: levels } = useLevelDefinitions();
  return levels?.find(l => l.level === currentLevel) || null;
}

export function useNextLevel(currentLevel: number) {
  const { data: levels } = useLevelDefinitions();
  return levels?.find(l => l.level === currentLevel + 1) || null;
}

// ============================================
// LEADERBOARD HOOK
// ============================================

export function useLeaderboard(limit: number = 100) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard', {
        p_limit: limit
      });

      if (error) throw error;
      return toCamelCase(data) as LeaderboardEntry[];
    },
    refetchInterval: 60000, // Refresh every minute
  });
}

// ============================================
// AWARD XP HOOK
// ============================================

export function useAwardXP() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      action,
      actionSw,
      xpAmount,
      metadata = {},
    }: {
      userId: string;
      action: string;
      actionSw: string;
      xpAmount: number;
      metadata?: Record<string, unknown>;
    }): Promise<XPAwardResult> => {
      const { data, error } = await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_action: action,
        p_action_sw: actionSw,
        p_xp_amount: xpAmount,
        p_metadata: metadata
      });

      if (error) throw error;

      const result = data?.[0] || data;
      return {
        newTotalXp: result.new_total_xp,
        newLevel: result.new_level,
        levelUp: result.level_up,
        xpAwarded: xpAmount,
        action,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['xpHistory', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] });
    },
  });
}

// ============================================
// INCREMENT STAT HOOK (for tracking achievements)
// ============================================

export function useIncrementStat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      statField,
      increment = 1,
    }: {
      userId: string;
      statField: string;
      increment?: number;
    }) => {
      const { error } = await supabase.rpc('increment_stat_and_check_achievements', {
        p_user_id: userId,
        p_stat_field: statField,
        p_increment: increment
      });

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
    },
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

// Get XP progress to next level
export function useXPProgress(userId: string | undefined) {
  const { data: profile } = useRewardsProfile(userId);
  const { data: levels } = useLevelDefinitions();

  if (!profile || !levels) {
    return {
      currentXP: 0,
      currentLevelXP: 0,
      nextLevelXP: 100,
      progressPercentage: 0,
      xpToNextLevel: 100,
    };
  }

  const currentLevel = levels.find(l => l.level === profile.currentLevel);
  const nextLevel = levels.find(l => l.level === profile.currentLevel + 1);

  const currentLevelXP = currentLevel?.xpRequired || 0;
  const nextLevelXP = nextLevel?.xpRequired || currentLevelXP + 1000;

  const xpInCurrentLevel = profile.totalXp - currentLevelXP;
  const xpNeededForLevel = nextLevelXP - currentLevelXP;
  const progressPercentage = Math.min(100, (xpInCurrentLevel / xpNeededForLevel) * 100);

  return {
    currentXP: profile.totalXp,
    currentLevelXP,
    nextLevelXP,
    progressPercentage,
    xpToNextLevel: nextLevelXP - profile.totalXp,
  };
}

// Get achievement progress for a specific achievement
export function useAchievementProgress(userId: string | undefined, achievementId: string) {
  const { data: userAchievements } = useUserAchievements(userId);
  const { data: achievements } = useAchievements();

  const achievement = achievements?.find(a => a.id === achievementId);
  const userAchievement = userAchievements?.find(ua => ua.achievementId === achievementId);

  if (!achievement) {
    return {
      achievement: null,
      progress: 0,
      progressPercentage: 0,
      completed: false,
      completedAt: null,
    };
  }

  const progress = userAchievement?.progress || 0;
  const progressPercentage = Math.min(100, (progress / achievement.requirementValue) * 100);

  return {
    achievement,
    progress,
    progressPercentage,
    completed: userAchievement?.completed || false,
    completedAt: userAchievement?.completedAt || null,
  };
}

// Get user's rank in leaderboard
export function useUserRank(userId: string | undefined) {
  const { data: leaderboard } = useLeaderboard(1000); // Get larger list to find rank

  if (!userId || !leaderboard) {
    return { rank: null, totalUsers: 0 };
  }

  const userEntry = leaderboard.find(entry => entry.userId === userId);
  return {
    rank: userEntry?.rank || null,
    totalUsers: leaderboard.length,
  };
}

// ============================================
// SYNC STATS HOOK
// ============================================

export function useSyncRewardsStats() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc('sync_user_rewards_stats', {
        p_user_id: userId,
      });

      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', userId] });
      queryClient.invalidateQueries({ queryKey: ['farmerScore', userId] });
    },
  });
}

// ============================================
// REAL-TIME STATS HOOK (fetches actual counts)
// ============================================

export function useRealTimeStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['realTimeStats', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Fetch actual counts from tables in parallel
      const [fieldsResult, tasksResult, postsResult, listingsResult, expensesResult, incomeResult] = await Promise.all([
        supabase.from('fields').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('user_id', userId).not('completed_at', 'is', null),
        supabase.from('community_posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('marketplace_listings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('income').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      return {
        fieldsCount: fieldsResult.count || 0,
        tasksCompleted: tasksResult.count || 0,
        postsCount: postsResult.count || 0,
        listingsCount: listingsResult.count || 0,
        expensesCount: expensesResult.count || 0,
        incomeCount: incomeResult.count || 0,
      };
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}
