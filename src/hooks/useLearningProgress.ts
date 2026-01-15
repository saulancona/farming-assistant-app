import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { VideoProgress, ArticleProgress, LearningStats, LearningLeaderboardEntry } from '../types';

// Helper to update challenge progress for learning completions
async function updateLearningChallengeProgress(userId: string) {
  try {
    await supabase.rpc('update_challenge_progress', {
      p_user_id: userId,
      p_action: 'complete_lesson',
      p_increment: 1,
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
  }
}

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
// VIDEO PROGRESS HOOKS
// ============================================

export function useVideoProgress(userId: string | undefined, videoId?: string) {
  return useQuery({
    queryKey: ['videoProgress', userId, videoId],
    queryFn: async () => {
      if (!userId) return videoId ? null : [];

      let query = supabase
        .from('video_progress')
        .select('*')
        .eq('user_id', userId);

      if (videoId) {
        query = query.eq('video_id', videoId).single();
        const { data, error } = await query;
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
        return data ? toCamelCase(data) as VideoProgress : null;
      }

      const { data, error } = await query.order('last_watched_at', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as VideoProgress[];
    },
    enabled: !!userId,
  });
}

export function useUpdateVideoProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      videoId,
      watchTimeSeconds,
      totalDurationSeconds,
      resumePositionSeconds,
    }: {
      userId: string;
      videoId: string;
      watchTimeSeconds: number;
      totalDurationSeconds: number;
      resumePositionSeconds: number;
    }) => {
      const percentageWatched = Math.min(100, (watchTimeSeconds / totalDurationSeconds) * 100);
      const completed = percentageWatched >= 90; // Consider complete at 90%

      const { data, error } = await supabase
        .from('video_progress')
        .upsert(
          {
            user_id: userId,
            video_id: videoId,
            watch_time_seconds: watchTimeSeconds,
            total_duration_seconds: totalDurationSeconds,
            percentage_watched: percentageWatched,
            resume_position_seconds: resumePositionSeconds,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            last_watched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,video_id' }
        )
        .select()
        .single();

      if (error) throw error;

      // If just completed, award XP
      if (completed) {
        await supabase.rpc('award_xp', {
          p_user_id: userId,
          p_action: 'Video Completed',
          p_action_sw: 'Video Imekamilika',
          p_xp_amount: 30,
          p_metadata: { video_id: videoId }
        });

        // Increment stat and check achievements
        await supabase.rpc('increment_stat_and_check_achievements', {
          p_user_id: userId,
          p_stat_field: 'videos_completed',
          p_increment: 1
        });

        // Update weekly challenge progress (target_action: 'complete_lesson')
        await updateLearningChallengeProgress(userId);
      }

      return toCamelCase(data) as VideoProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['videoProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userChallengeProgress', variables.userId] });
    },
  });
}

// ============================================
// ARTICLE PROGRESS HOOKS
// ============================================

export function useArticleProgress(userId: string | undefined, articleId?: string) {
  return useQuery({
    queryKey: ['articleProgress', userId, articleId],
    queryFn: async () => {
      if (!userId) return articleId ? null : [];

      let query = supabase
        .from('article_progress')
        .select('*')
        .eq('user_id', userId);

      if (articleId) {
        query = query.eq('article_id', articleId).single();
        const { data, error } = await query;
        if (error && error.code !== 'PGRST116') throw error;
        return data ? toCamelCase(data) as ArticleProgress : null;
      }

      const { data, error } = await query.order('last_read_at', { ascending: false });
      if (error) throw error;
      return toCamelCase(data) as ArticleProgress[];
    },
    enabled: !!userId,
  });
}

export function useUpdateArticleProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      articleId,
      readingTimeSeconds,
      scrollPercentage,
    }: {
      userId: string;
      articleId: string;
      readingTimeSeconds: number;
      scrollPercentage: number;
    }) => {
      const completed = scrollPercentage >= 90; // Consider complete at 90% scroll

      const { data, error } = await supabase
        .from('article_progress')
        .upsert(
          {
            user_id: userId,
            article_id: articleId,
            reading_time_seconds: readingTimeSeconds,
            scroll_percentage: scrollPercentage,
            completed,
            completed_at: completed ? new Date().toISOString() : null,
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,article_id' }
        )
        .select()
        .single();

      if (error) throw error;

      // If just completed, award XP
      if (completed) {
        await supabase.rpc('award_xp', {
          p_user_id: userId,
          p_action: 'Article Completed',
          p_action_sw: 'Makala Imekamilika',
          p_xp_amount: 20,
          p_metadata: { article_id: articleId }
        });

        // Increment stat and check achievements
        await supabase.rpc('increment_stat_and_check_achievements', {
          p_user_id: userId,
          p_stat_field: 'articles_completed',
          p_increment: 1
        });

        // Update weekly challenge progress (target_action: 'complete_lesson')
        await updateLearningChallengeProgress(userId);
      }

      return toCamelCase(data) as ArticleProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articleProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userChallengeProgress', variables.userId] });
    },
  });
}

// ============================================
// LEARNING STATS HOOK
// ============================================

export function useLearningStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['learningStats', userId],
    queryFn: async (): Promise<LearningStats> => {
      if (!userId) {
        return {
          totalArticlesStarted: 0,
          articlesCompleted: 0,
          totalVideosStarted: 0,
          videosCompleted: 0,
          totalReadingTimeMinutes: 0,
          totalWatchTimeMinutes: 0,
          articleCompletionRate: 0,
          videoCompletionRate: 0,
        };
      }

      // Fetch article progress
      const { data: articles, error: articlesError } = await supabase
        .from('article_progress')
        .select('reading_time_seconds, completed')
        .eq('user_id', userId);

      if (articlesError) throw articlesError;

      // Fetch video progress
      const { data: videos, error: videosError } = await supabase
        .from('video_progress')
        .select('watch_time_seconds, completed')
        .eq('user_id', userId);

      if (videosError) throw videosError;

      const totalArticlesStarted = articles?.length || 0;
      const articlesCompleted = articles?.filter((a: { completed: boolean }) => a.completed).length || 0;
      const totalReadingTimeSeconds = articles?.reduce((sum: number, a: { reading_time_seconds?: number }) => sum + (a.reading_time_seconds || 0), 0) || 0;

      const totalVideosStarted = videos?.length || 0;
      const videosCompleted = videos?.filter((v: { completed: boolean }) => v.completed).length || 0;
      const totalWatchTimeSeconds = videos?.reduce((sum: number, v: { watch_time_seconds?: number }) => sum + (v.watch_time_seconds || 0), 0) || 0;

      return {
        totalArticlesStarted,
        articlesCompleted,
        totalVideosStarted,
        videosCompleted,
        totalReadingTimeMinutes: Math.round(totalReadingTimeSeconds / 60),
        totalWatchTimeMinutes: Math.round(totalWatchTimeSeconds / 60),
        articleCompletionRate: totalArticlesStarted > 0
          ? Math.round((articlesCompleted / totalArticlesStarted) * 100)
          : 0,
        videoCompletionRate: totalVideosStarted > 0
          ? Math.round((videosCompleted / totalVideosStarted) * 100)
          : 0,
      };
    },
    enabled: !!userId,
  });
}

// ============================================
// MARK VIDEO/ARTICLE AS COMPLETE (manual)
// ============================================

export function useMarkVideoComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, videoId, totalDurationSeconds }: {
      userId: string;
      videoId: string;
      totalDurationSeconds: number;
    }) => {
      const { data, error } = await supabase
        .from('video_progress')
        .upsert(
          {
            user_id: userId,
            video_id: videoId,
            watch_time_seconds: totalDurationSeconds,
            total_duration_seconds: totalDurationSeconds,
            percentage_watched: 100,
            resume_position_seconds: totalDurationSeconds,
            completed: true,
            completed_at: new Date().toISOString(),
            last_watched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,video_id' }
        )
        .select()
        .single();

      if (error) throw error;

      // Award XP
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_action: 'Video Completed',
        p_action_sw: 'Video Imekamilika',
        p_xp_amount: 30,
        p_metadata: { video_id: videoId }
      });

      // Increment stat and check achievements
      await supabase.rpc('increment_stat_and_check_achievements', {
        p_user_id: userId,
        p_stat_field: 'videos_completed',
        p_increment: 1
      });

      // Update weekly challenge progress (target_action: 'complete_lesson')
      await updateLearningChallengeProgress(userId);

      return toCamelCase(data) as VideoProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['videoProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userChallengeProgress', variables.userId] });
    },
  });
}

export function useMarkArticleComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: string }) => {
      console.log('Starting article completion for:', { userId, articleId });

      // Try using the new RPC function first (handles everything server-side)
      try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('mark_article_complete', {
          p_user_id: userId,
          p_article_id: articleId,
        });

        console.log('RPC result:', rpcResult, 'error:', rpcError);

        // If RPC succeeded, return the result
        if (!rpcError && rpcResult?.success) {
          console.log('RPC succeeded, returning result');
          return toCamelCase(rpcResult.article_progress) as ArticleProgress;
        }

        // Log the RPC error for debugging
        if (rpcError) {
          console.warn('RPC mark_article_complete error:', rpcError.message, rpcError.code, rpcError.details);
        }
      } catch (rpcException) {
        console.warn('RPC mark_article_complete exception:', rpcException);
      }

      // Fallback: If RPC doesn't exist or failed, do it directly
      console.log('Using fallback method for article completion');

      const now = new Date().toISOString();

      // Use upsert for simplicity - include created_at for new rows
      const { data, error } = await supabase
        .from('article_progress')
        .upsert(
          {
            user_id: userId,
            article_id: articleId,
            reading_time_seconds: 0,
            scroll_percentage: 100,
            completed: true,
            completed_at: now,
            last_read_at: now,
            created_at: now,
            updated_at: now,
          },
          { onConflict: 'user_id,article_id', ignoreDuplicates: false }
        )
        .select()
        .single();

      if (error) {
        console.error('Error saving article progress:', error.message, error.code, error.details, error.hint);
        throw new Error(`Failed to save article progress: ${error.message}`);
      }

      console.log('Fallback upsert succeeded:', data);

      // Try to award XP (don't fail if this fails)
      try {
        await supabase.rpc('award_xp', {
          p_user_id: userId,
          p_action: 'Article Completed',
          p_action_sw: 'Makala Imekamilika',
          p_xp_amount: 20,
          p_metadata: { article_id: articleId }
        });
      } catch (xpError) {
        console.warn('Failed to award XP:', xpError);
      }

      // Try to increment stat (don't fail if this fails)
      try {
        await supabase.rpc('increment_stat_and_check_achievements', {
          p_user_id: userId,
          p_stat_field: 'articles_completed',
          p_increment: 1
        });
      } catch (statError) {
        console.warn('Failed to increment stat:', statError);
      }

      // Try to update weekly challenge progress (don't fail if this fails)
      try {
        await updateLearningChallengeProgress(userId);
      } catch (challengeError) {
        console.warn('Failed to update challenge progress:', challengeError);
      }

      return toCamelCase(data) as ArticleProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articleProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userChallengeProgress', variables.userId] });
    },
  });
}

// ============================================
// LEARNING LEADERBOARD HOOKS
// ============================================

/**
 * Get learning leaderboard - top learners by XP and lessons completed
 */
export function useLearningLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: ['learningLeaderboard', limit],
    queryFn: async (): Promise<LearningLeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('get_learning_leaderboard', {
        p_limit: limit,
      });

      if (error) {
        // Fallback to direct view query if function doesn't exist yet
        const { data: viewData, error: viewError } = await supabase
          .from('learning_leaderboard')
          .select('*')
          .limit(limit);

        if (viewError) throw viewError;

        return (viewData || []).map((row: Record<string, unknown>, index: number) => ({
          userId: row.user_id as string,
          fullName: row.full_name as string | undefined,
          avatarUrl: row.avatar_url as string | undefined,
          articlesCompleted: (row.articles_completed as number) || 0,
          videosCompleted: (row.videos_completed as number) || 0,
          totalLessons: (row.total_lessons as number) || 0,
          totalXp: (row.total_xp as number) || 0,
          quizzesPassed: (row.quizzes_passed as number) || 0,
          currentStreak: (row.current_streak as number) || 0,
          lastActivityDate: row.last_activity_date as string | undefined,
          rank: index + 1,
        }));
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        fullName: row.full_name as string | undefined,
        avatarUrl: row.avatar_url as string | undefined,
        articlesCompleted: (row.articles_completed as number) || 0,
        videosCompleted: (row.videos_completed as number) || 0,
        totalLessons: (row.total_lessons as number) || 0,
        totalXp: (row.total_xp as number) || 0,
        quizzesPassed: (row.quizzes_passed as number) || 0,
        currentStreak: (row.current_streak as number) || 0,
        lastActivityDate: row.last_activity_date as string | undefined,
        rank: (row.rank as number) || 0,
      }));
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get user's learning rank
 */
export function useUserLearningRank(userId: string | undefined) {
  return useQuery({
    queryKey: ['userLearningRank', userId],
    queryFn: async () => {
      if (!userId) return { rank: null, totalUsers: 0 };

      const { data, error } = await supabase.rpc('get_user_learning_rank', {
        p_user_id: userId,
      });

      if (error) {
        // Fallback: calculate rank from view
        const { data: leaderboard, error: lbError } = await supabase
          .from('learning_leaderboard')
          .select('user_id, total_xp');

        if (lbError) throw lbError;

        const userIndex = leaderboard?.findIndex(
          (entry: { user_id: string }) => entry.user_id === userId
        );

        return {
          rank: userIndex !== undefined && userIndex >= 0 ? userIndex + 1 : null,
          totalUsers: leaderboard?.length || 0,
        };
      }

      const result = data?.[0] || { rank: null, total_users: 0 };
      return {
        rank: result.rank as number | null,
        totalUsers: (result.total_users as number) || 0,
      };
    },
    enabled: !!userId,
  });
}
