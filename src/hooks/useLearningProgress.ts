import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { VideoProgress, ArticleProgress, LearningStats } from '../types';

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
      }

      return toCamelCase(data) as VideoProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['videoProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
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
      }

      return toCamelCase(data) as ArticleProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articleProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
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

      return toCamelCase(data) as VideoProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['videoProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
    },
  });
}

export function useMarkArticleComplete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, articleId }: { userId: string; articleId: string }) => {
      const { data, error } = await supabase
        .from('article_progress')
        .upsert(
          {
            user_id: userId,
            article_id: articleId,
            scroll_percentage: 100,
            completed: true,
            completed_at: new Date().toISOString(),
            last_read_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,article_id' }
        )
        .select()
        .single();

      if (error) throw error;

      // Award XP
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

      return toCamelCase(data) as ArticleProgress;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['articleProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['learningStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userAchievements', variables.userId] });
    },
  });
}
