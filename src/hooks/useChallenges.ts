import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  WeeklyChallenge,
  UserChallengeProgress,
  PhotoSubmission,
  PhotoType,
} from '../types';

// Get active challenges for current week
export function useActiveChallenges() {
  return useQuery({
    queryKey: ['activeChallenges'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('weekly_challenges')
        .select('*')
        .eq('is_active', true)
        .or(`start_date.is.null,start_date.lte.${today}`)
        .or(`end_date.is.null,end_date.gte.${today}`)
        .order('xp_reward', { ascending: false });

      if (error) throw error;

      return data.map((c: Record<string, unknown>) => ({
        id: c.id,
        name: c.name,
        nameSw: c.name_sw,
        description: c.description,
        descriptionSw: c.description_sw,
        challengeType: c.challenge_type,
        targetAction: c.target_action,
        targetCount: c.target_count,
        xpReward: c.xp_reward,
        pointsReward: c.points_reward,
        badgeId: c.badge_id,
        startDate: c.start_date,
        endDate: c.end_date,
        isRecurring: c.is_recurring,
        recurrencePattern: c.recurrence_pattern,
        isActive: c.is_active,
        createdAt: c.created_at,
      })) as WeeklyChallenge[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get user's challenge progress
export function useUserChallengeProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['userChallengeProgress', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_challenges_with_details')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (error) throw error;

      return data.map((p: Record<string, unknown>) => ({
        id: p.id,
        userId: p.user_id,
        challengeId: p.challenge_id,
        currentProgress: p.current_progress,
        targetProgress: p.target_progress,
        status: p.status,
        startedAt: p.started_at,
        completedAt: p.completed_at,
        xpAwarded: p.xp_awarded,
        pointsAwarded: p.points_awarded,
        challengeName: p.challenge_name,
        challengeNameSw: p.challenge_name_sw,
        challengeDescription: p.challenge_description,
        challengeType: p.challenge_type,
        challengeXpReward: p.challenge_xp_reward,
        challengePointsReward: p.challenge_points_reward,
        startDate: p.start_date,
        endDate: p.end_date,
      })) as UserChallengeProgress[];
    },
    enabled: !!userId,
  });
}

// Get active challenges with user progress
export function useActiveChallengesWithProgress(userId: string | undefined) {
  const { data: challenges, isLoading: challengesLoading } = useActiveChallenges();
  const { data: progress, isLoading: progressLoading } = useUserChallengeProgress(userId);

  const isLoading = challengesLoading || progressLoading;

  const challengesWithProgress = challenges?.map((challenge) => {
    const userProgress = progress?.find((p) => p.challengeId === challenge.id);
    return {
      ...challenge,
      userProgress: userProgress || null,
      progressPercentage: userProgress
        ? Math.round((userProgress.currentProgress / userProgress.targetProgress) * 100)
        : 0,
      isCompleted: userProgress?.status === 'completed',
      isStarted: !!userProgress,
    };
  });

  return {
    data: challengesWithProgress,
    isLoading,
  };
}

// Update challenge progress (called when user completes an action)
export function useUpdateChallengeProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, action, increment = 1 }: { userId: string; action: string; increment?: number }) => {
      const { data, error } = await supabase.rpc('update_challenge_progress', {
        p_user_id: userId,
        p_action: action,
        p_increment: increment,
      });

      if (error) throw error;
      return data as { success: boolean; challenges_completed: number };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userChallengeProgress', variables.userId] });

      if (data.challenges_completed > 0) {
        queryClient.invalidateQueries({ queryKey: ['userPoints', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      }
    },
  });
}

// Submit a photo for challenge
export function useSubmitPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      photoUrl,
      photoType,
      challengeId,
      fieldId,
      aiConfidenceScore,
      aiDetectedIssue,
      aiRecommendations,
    }: {
      userId: string;
      photoUrl: string;
      photoType: PhotoType;
      challengeId?: string;
      fieldId?: string;
      aiConfidenceScore?: number;
      aiDetectedIssue?: string;
      aiRecommendations?: Record<string, unknown>;
    }) => {
      // Insert photo submission
      const { data, error } = await supabase
        .from('photo_submissions')
        .insert({
          user_id: userId,
          photo_url: photoUrl,
          photo_type: photoType,
          challenge_id: challengeId,
          field_id: fieldId,
          ai_confidence_score: aiConfidenceScore,
          ai_detected_issue: aiDetectedIssue,
          ai_recommendations: aiRecommendations,
          xp_awarded: 5, // Base XP for photo upload
          points_awarded: 2,
        })
        .select()
        .single();

      if (error) throw error;

      // Update challenge progress if linked to a challenge
      if (challengeId) {
        await supabase.rpc('update_challenge_progress', {
          p_user_id: userId,
          p_action: 'upload_photo',
          p_increment: 1,
        });
      }

      // Award XP and points for photo
      await supabase.rpc('award_xp', {
        p_user_id: userId,
        p_action: 'photo_upload',
        p_action_sw: `Kupakia picha ya ${photoType}`,
        p_xp_amount: 5,
        p_metadata: { photo_type: photoType, challenge_id: challengeId },
      });

      await supabase.rpc('award_points', {
        p_user_id: userId,
        p_amount: 2,
        p_source: 'photo',
        p_reference_id: data.id,
        p_description: 'Photo upload reward',
      });

      return {
        id: data.id,
        userId: data.user_id,
        photoUrl: data.photo_url,
        photoType: data.photo_type,
        xpAwarded: data.xp_awarded,
        pointsAwarded: data.points_awarded,
      } as PhotoSubmission;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['photoSubmissions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userChallengeProgress', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userPoints', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['farmerScore', variables.userId] });
    },
  });
}

// Get user's photo submissions
export function usePhotoSubmissions(userId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: ['photoSubmissions', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('photo_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((p: Record<string, unknown>) => ({
        id: p.id,
        userId: p.user_id,
        challengeId: p.challenge_id,
        fieldId: p.field_id,
        photoUrl: p.photo_url,
        photoType: p.photo_type,
        aiConfidenceScore: p.ai_confidence_score,
        aiDetectedIssue: p.ai_detected_issue,
        aiRecommendations: p.ai_recommendations,
        xpAwarded: p.xp_awarded,
        pointsAwarded: p.points_awarded,
        submittedAt: p.submitted_at,
        reviewedAt: p.reviewed_at,
        isVerified: p.is_verified,
      })) as PhotoSubmission[];
    },
    enabled: !!userId,
  });
}

// Get challenge history (completed challenges)
export function useChallengeHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['challengeHistory', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_challenges_with_details')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      return data.map((p: Record<string, unknown>) => ({
        id: p.id,
        userId: p.user_id,
        challengeId: p.challenge_id,
        currentProgress: p.current_progress,
        targetProgress: p.target_progress,
        status: p.status,
        startedAt: p.started_at,
        completedAt: p.completed_at,
        xpAwarded: p.xp_awarded,
        pointsAwarded: p.points_awarded,
        challengeName: p.challenge_name,
        challengeNameSw: p.challenge_name_sw,
        challengeDescription: p.challenge_description,
        challengeType: p.challenge_type,
        challengeXpReward: p.challenge_xp_reward,
        challengePointsReward: p.challenge_points_reward,
      })) as UserChallengeProgress[];
    },
    enabled: !!userId,
  });
}

// Get challenge type info
export function getChallengeTypeInfo(type: WeeklyChallenge['challengeType']) {
  const types = {
    photo: {
      name: 'Photo',
      nameSw: 'Picha',
      icon: '📷',
      color: 'purple',
      description: 'Upload photos of your farm',
      descriptionSw: 'Pakia picha za shamba lako',
    },
    activity: {
      name: 'Activity',
      nameSw: 'Shughuli',
      icon: '✅',
      color: 'blue',
      description: 'Complete farm activities',
      descriptionSw: 'Kamilisha shughuli za shamba',
    },
    learning: {
      name: 'Learning',
      nameSw: 'Kujifunza',
      icon: '📚',
      color: 'emerald',
      description: 'Complete learning content',
      descriptionSw: 'Kamilisha maudhui ya kujifunza',
    },
    marketplace: {
      name: 'Marketplace',
      nameSw: 'Soko',
      icon: '🏪',
      color: 'amber',
      description: 'Marketplace activities',
      descriptionSw: 'Shughuli za soko',
    },
    community: {
      name: 'Community',
      nameSw: 'Jamii',
      icon: '👥',
      color: 'pink',
      description: 'Community engagement',
      descriptionSw: 'Ushiriki wa jamii',
    },
  };

  return types[type] || types.activity;
}

// Get photo type info
export function getPhotoTypeInfo(type: PhotoType) {
  const types = {
    pest: {
      name: 'Pest/Disease',
      nameSw: 'Wadudu/Ugonjwa',
      icon: '🐛',
      description: 'Photos of pests or diseases',
    },
    crop: {
      name: 'Crop',
      nameSw: 'Mazao',
      icon: '🌾',
      description: 'Photos of your crops',
    },
    soil: {
      name: 'Soil',
      nameSw: 'Udongo',
      icon: '🪴',
      description: 'Photos of soil conditions',
    },
    harvest: {
      name: 'Harvest',
      nameSw: 'Mavuno',
      icon: '🧺',
      description: 'Photos of harvested produce',
    },
    field: {
      name: 'Field',
      nameSw: 'Shamba',
      icon: '🏞️',
      description: 'General field photos',
    },
    other: {
      name: 'Other',
      nameSw: 'Nyingine',
      icon: '📸',
      description: 'Other farm photos',
    },
  };

  return types[type] || types.other;
}

// Calculate days remaining for challenge
export function calculateChallengeTimeRemaining(endDate: string | undefined): string {
  if (!endDate) return 'Ongoing';

  const end = new Date(endDate);
  const now = new Date();
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Expired';
  if (diffDays === 0) return 'Ends today';
  if (diffDays === 1) return '1 day left';
  return `${diffDays} days left`;
}
