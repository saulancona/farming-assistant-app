import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  ActivePhotoChallenge,
  UserPhotoStats,
  PhotoChallengeLeaderboardEntry,
  ChallengePhotoSubmission,
  SubmitPhotoResult,
  ChallengePhotoType,
  AISeverity,
  PhotoBonusInfo,
  UserCropPhotoCoverage,
} from '../types';

// ==========================================
// Query Keys
// ==========================================
const photoChallengeKeys = {
  all: ['photoChallenges'] as const,
  active: (userId?: string) => [...photoChallengeKeys.all, 'active', userId] as const,
  stats: (userId: string) => [...photoChallengeKeys.all, 'stats', userId] as const,
  leaderboard: () => [...photoChallengeKeys.all, 'leaderboard'] as const,
  submissions: (userId: string, challengeId?: string) =>
    [...photoChallengeKeys.all, 'submissions', userId, challengeId] as const,
  coverage: (userId: string) => [...photoChallengeKeys.all, 'coverage', userId] as const,
};

// ==========================================
// Hooks
// ==========================================

/**
 * Get active photo challenges with user progress
 */
export function useActivePhotoChallenges(userId?: string) {
  return useQuery({
    queryKey: photoChallengeKeys.active(userId),
    queryFn: async (): Promise<ActivePhotoChallenge[]> => {
      const { data, error } = await supabase.rpc('get_active_photo_challenges', {
        p_user_id: userId || null,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        challengeId: row.challenge_id as string,
        themeName: row.theme_name as string,
        themeNameSw: row.theme_name_sw as string,
        themeDescription: row.theme_description as string,
        themeDescriptionSw: row.theme_description_sw as string,
        themeType: row.theme_type as ActivePhotoChallenge['themeType'],
        targetPhotosPerDay: row.target_photos_per_day as number,
        durationDays: row.duration_days as number,
        xpPerPhoto: row.xp_per_photo as number,
        bonusXpClear: row.bonus_xp_clear as number,
        bonusXpEarly: row.bonus_xp_early as number,
        bonusXpCorrect: row.bonus_xp_correct as number,
        pointsPerPhoto: row.points_per_photo as number,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        daysRemaining: row.days_remaining as number,
        totalParticipants: row.total_participants as number,
        userPhotosSubmitted: row.user_photos_submitted as number,
        userPhotosTarget: row.user_photos_target as number,
        userStreakDays: row.user_streak_days as number,
        userTotalXp: row.user_total_xp as number,
        userStatus: row.user_status as ActivePhotoChallenge['userStatus'],
      }));
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get user's photo stats
 */
export function useUserPhotoStats(userId: string) {
  return useQuery({
    queryKey: photoChallengeKeys.stats(userId),
    queryFn: async (): Promise<UserPhotoStats> => {
      const { data, error } = await supabase.rpc('get_user_photo_stats', {
        p_user_id: userId,
      });

      if (error) throw error;

      const stats = data || {};
      return {
        totalPhotos: stats.total_photos || 0,
        cropsCovered: stats.crops_covered || 0,
        cropsComplete: stats.crops_complete || 0,
        cropCoverage: (stats.crop_coverage || []).map((c: Record<string, unknown>) => ({
          cropType: c.crop_type as string,
          totalPhotos: c.total_photos as number,
          hasPestPhoto: c.has_pest as boolean,
          hasDiseasePhoto: c.has_disease as boolean,
          hasNutrientPhoto: c.has_nutrient as boolean,
          hasGrowthPhoto: c.has_growth as boolean,
          coverageComplete: c.complete as boolean,
        })),
        challengesCompleted: stats.challenges_completed || 0,
        challengesActive: stats.challenges_active || 0,
        totalChallengeXp: stats.total_challenge_xp || 0,
        totalChallengePoints: stats.total_challenge_points || 0,
        bestStreak: stats.best_streak || 0,
      };
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get user's crop photo coverage
 */
export function useUserCropCoverage(userId: string) {
  return useQuery({
    queryKey: photoChallengeKeys.coverage(userId),
    queryFn: async (): Promise<UserCropPhotoCoverage[]> => {
      const { data, error } = await supabase
        .from('user_crop_photo_coverage')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        userId: row.user_id as string,
        cropType: row.crop_type as string,
        totalPhotos: row.total_photos as number,
        lastPhotoDate: row.last_photo_date as string | undefined,
        hasPestPhoto: row.has_pest_photo as boolean,
        hasDiseasePhoto: row.has_disease_photo as boolean,
        hasNutrientPhoto: row.has_nutrient_photo as boolean,
        hasGrowthPhoto: row.has_growth_photo as boolean,
        coverageComplete: row.coverage_complete as boolean,
        updatedAt: row.updated_at as string,
      }));
    },
    enabled: !!userId,
  });
}

/**
 * Get photo challenge leaderboard
 */
export function usePhotoChallengeLeaderboard(limit = 20) {
  return useQuery({
    queryKey: photoChallengeKeys.leaderboard(),
    queryFn: async (): Promise<PhotoChallengeLeaderboardEntry[]> => {
      const { data, error } = await supabase
        .from('photo_challenge_leaderboard')
        .select('*')
        .limit(limit);

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>, index: number) => ({
        userId: row.user_id as string,
        fullName: row.full_name as string | undefined,
        avatarUrl: row.avatar_url as string | undefined,
        totalPhotos: row.total_photos as number,
        totalXp: row.total_xp as number,
        totalPoints: row.total_points as number,
        earlyDetections: row.early_detections as number,
        correctIds: row.correct_ids as number,
        lastSubmission: row.last_submission as string | undefined,
        rank: index + 1,
      }));
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get user's photo submissions
 */
export function useUserPhotoSubmissions(userId: string, challengeId?: string) {
  return useQuery({
    queryKey: photoChallengeKeys.submissions(userId, challengeId),
    queryFn: async (): Promise<ChallengePhotoSubmission[]> => {
      let query = supabase
        .from('challenge_photo_submissions')
        .select('*')
        .eq('user_id', userId)
        .order('submitted_at', { ascending: false });

      if (challengeId) {
        query = query.eq('challenge_id', challengeId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        userId: row.user_id as string,
        challengeId: row.challenge_id as string,
        fieldId: row.field_id as string | undefined,
        cropType: row.crop_type as string | undefined,
        photoUrl: row.photo_url as string,
        photoType: row.photo_type as ChallengePhotoSubmission['photoType'],
        aiConfidenceScore: row.ai_confidence_score as number,
        aiDetectedIssue: row.ai_detected_issue as string | undefined,
        aiSeverity: row.ai_severity as ChallengePhotoSubmission['aiSeverity'],
        isEarlyDetection: row.is_early_detection as boolean,
        isClearPhoto: row.is_clear_photo as boolean,
        isCorrectIdentification: row.is_correct_identification as boolean,
        baseXpAwarded: row.base_xp_awarded as number,
        bonusXpAwarded: row.bonus_xp_awarded as number,
        pointsAwarded: row.points_awarded as number,
        submittedAt: row.submitted_at as string,
        reviewedAt: row.reviewed_at as string | undefined,
      }));
    },
    enabled: !!userId,
  });
}

/**
 * Submit a photo to a challenge
 */
export function useSubmitChallengePhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      challengeId,
      fieldId,
      cropType,
      photoUrl,
      photoType,
      aiConfidence = 0,
      aiIssue,
      aiSeverity = 'none',
    }: {
      userId: string;
      challengeId: string;
      fieldId?: string;
      cropType: string;
      photoUrl: string;
      photoType: ChallengePhotoType;
      aiConfidence?: number;
      aiIssue?: string;
      aiSeverity?: AISeverity;
    }): Promise<SubmitPhotoResult> => {
      const { data, error } = await supabase.rpc('submit_challenge_photo', {
        p_user_id: userId,
        p_challenge_id: challengeId,
        p_field_id: fieldId || null,
        p_crop_type: cropType,
        p_photo_url: photoUrl,
        p_photo_type: photoType,
        p_ai_confidence: aiConfidence,
        p_ai_issue: aiIssue || null,
        p_ai_severity: aiSeverity,
      });

      if (error) throw error;

      return {
        success: data?.success || false,
        submissionId: data?.submission_id,
        baseXp: data?.base_xp || 0,
        bonusXp: data?.bonus_xp || 0,
        totalXp: data?.total_xp || 0,
        points: data?.points || 0,
        bonuses: {
          clearPhoto: data?.bonuses?.clear_photo || false,
          earlyDetection: data?.bonuses?.early_detection || false,
          correctIdentification: data?.bonuses?.correct_identification || false,
        },
        error: data?.error,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: photoChallengeKeys.active(variables.userId) });
      queryClient.invalidateQueries({ queryKey: photoChallengeKeys.stats(variables.userId) });
      queryClient.invalidateQueries({ queryKey: photoChallengeKeys.submissions(variables.userId) });
      queryClient.invalidateQueries({ queryKey: photoChallengeKeys.coverage(variables.userId) });
      queryClient.invalidateQueries({ queryKey: photoChallengeKeys.leaderboard() });
      // Also invalidate rewards profile for XP update
      queryClient.invalidateQueries({ queryKey: ['rewards', 'profile', variables.userId] });
    },
  });
}

// ==========================================
// Helper Functions
// ==========================================

/**
 * Get icon for photo type
 */
export function getPhotoTypeIcon(type: ChallengePhotoType): string {
  const icons: Record<ChallengePhotoType, string> = {
    pest: '🐛',
    disease: '🦠',
    nutrient: '🌿',
    growth: '📈',
    harvest: '🌾',
    general: '📷',
  };
  return icons[type] || '📷';
}

/**
 * Get label for photo type
 */
export function getPhotoTypeLabel(type: ChallengePhotoType, lang: 'en' | 'sw' = 'en'): string {
  const labels: Record<ChallengePhotoType, { en: string; sw: string }> = {
    pest: { en: 'Pest Check', sw: 'Ukaguzi wa Wadudu' },
    disease: { en: 'Disease Check', sw: 'Ukaguzi wa Magonjwa' },
    nutrient: { en: 'Nutrient Check', sw: 'Ukaguzi wa Virutubisho' },
    growth: { en: 'Growth Tracking', sw: 'Ufuatiliaji wa Ukuaji' },
    harvest: { en: 'Harvest Quality', sw: 'Ubora wa Mavuno' },
    general: { en: 'General Photo', sw: 'Picha ya Jumla' },
  };
  return labels[type]?.[lang] || type;
}

/**
 * Get challenge theme icon
 */
export function getChallengeThemeIcon(themeType: string): string {
  const icons: Record<string, string> = {
    pest_patrol: '🔍',
    nutrient_deficiency: '🌿',
    disease_detection: '🔬',
    growth_tracking: '📊',
    harvest_quality: '🏆',
  };
  return icons[themeType] || '📷';
}

/**
 * Get info about photo bonuses
 */
export function getPhotoBonusInfo(
  challenge: ActivePhotoChallenge
): PhotoBonusInfo[] {
  return [
    {
      type: 'clear_photo',
      name: 'Clear Photo',
      nameSw: 'Picha Wazi',
      description: 'High quality, well-lit photo with AI confidence > 80%',
      descriptionSw: 'Picha bora, yenye mwanga mzuri na uhakika wa AI > 80%',
      xpBonus: challenge.bonusXpClear,
      pointsBonus: 0,
      icon: '✨',
    },
    {
      type: 'early_detection',
      name: 'Early Detection',
      nameSw: 'Kugundua Mapema',
      description: 'Detecting a pest or disease issue before it spreads',
      descriptionSw: 'Kugundua tatizo la wadudu au ugonjwa kabla ya kuenea',
      xpBonus: challenge.bonusXpEarly,
      pointsBonus: 5,
      icon: '🎯',
    },
    {
      type: 'correct_identification',
      name: 'Correct ID',
      nameSw: 'Utambuzi Sahihi',
      description: 'AI correctly identifies the issue with high confidence',
      descriptionSw: 'AI inatambua tatizo kwa usahihi na uhakika mkubwa',
      xpBonus: challenge.bonusXpCorrect,
      pointsBonus: 3,
      icon: '🏅',
    },
  ];
}

/**
 * Calculate progress percentage for a challenge
 */
export function getChallengeProgress(challenge: ActivePhotoChallenge): number {
  if (challenge.userPhotosTarget === 0) return 0;
  return Math.min(100, Math.round((challenge.userPhotosSubmitted / challenge.userPhotosTarget) * 100));
}

/**
 * Get severity color
 */
export function getSeverityColor(severity: AISeverity): string {
  const colors: Record<AISeverity, string> = {
    none: 'text-green-600',
    low: 'text-yellow-600',
    medium: 'text-orange-500',
    high: 'text-red-500',
    critical: 'text-red-700',
  };
  return colors[severity] || 'text-gray-500';
}

/**
 * Get severity label
 */
export function getSeverityLabel(severity: AISeverity, lang: 'en' | 'sw' = 'en'): string {
  const labels: Record<AISeverity, { en: string; sw: string }> = {
    none: { en: 'No Issues', sw: 'Hakuna Matatizo' },
    low: { en: 'Low Severity', sw: 'Ukali Mdogo' },
    medium: { en: 'Medium Severity', sw: 'Ukali wa Wastani' },
    high: { en: 'High Severity', sw: 'Ukali Mkubwa' },
    critical: { en: 'Critical', sw: 'Hatari Kubwa' },
  };
  return labels[severity]?.[lang] || severity;
}

/**
 * Check if user has earned Healthy Farm badge
 */
export function hasHealthyFarmBadge(stats: UserPhotoStats): boolean {
  return stats.cropsComplete > 0 && stats.cropsCovered > 0 &&
         stats.cropsComplete >= stats.cropsCovered;
}

/**
 * Get crops needing photos for Healthy Farm badge
 */
export function getCropsNeedingPhotos(coverage: UserCropPhotoCoverage[]): {
  cropType: string;
  missing: ChallengePhotoType[];
}[] {
  return coverage
    .filter(c => !c.coverageComplete)
    .map(c => ({
      cropType: c.cropType,
      missing: [
        !c.hasPestPhoto && 'pest',
        !c.hasDiseasePhoto && 'disease',
        !c.hasNutrientPhoto && 'nutrient',
        !c.hasGrowthPhoto && 'growth',
      ].filter(Boolean) as ChallengePhotoType[],
    }));
}
