import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  SeasonalMission,
  UserMission,
  MissionStepProgress,
  StartMissionResult,
  CompleteMissionStepResult,
  RecommendedMission,
  UserRewardBonuses,
  WeatherTrigger,
} from '../types';

// Get available missions (optionally filtered by crop type)
export function useAvailableMissions(cropType?: string) {
  return useQuery({
    queryKey: ['availableMissions', cropType],
    queryFn: async () => {
      let query = supabase
        .from('seasonal_missions')
        .select('*')
        .eq('is_active', true)
        .order('difficulty', { ascending: true });

      if (cropType) {
        query = query.or(`crop_type.eq.${cropType},crop_type.is.null`);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((m: Record<string, unknown>) => ({
        id: m.id,
        name: m.name,
        nameSw: m.name_sw,
        description: m.description,
        descriptionSw: m.description_sw,
        cropType: m.crop_type,
        season: m.season,
        steps: m.steps || [],
        xpReward: m.xp_reward,
        pointsReward: m.points_reward,
        badgeId: m.badge_id,
        durationDays: m.duration_days,
        difficulty: m.difficulty,
        isActive: m.is_active,
        createdAt: m.created_at,
      })) as SeasonalMission[];
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get mission details by ID
export function useMissionDetails(missionId: string | undefined) {
  return useQuery({
    queryKey: ['missionDetails', missionId],
    queryFn: async () => {
      if (!missionId) return null;

      const { data, error } = await supabase
        .from('seasonal_missions')
        .select('*')
        .eq('id', missionId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        name: data.name,
        nameSw: data.name_sw,
        description: data.description,
        descriptionSw: data.description_sw,
        cropType: data.crop_type,
        season: data.season,
        steps: data.steps || [],
        xpReward: data.xp_reward,
        pointsReward: data.points_reward,
        badgeId: data.badge_id,
        durationDays: data.duration_days,
        difficulty: data.difficulty,
        isActive: data.is_active,
        createdAt: data.created_at,
      } as SeasonalMission;
    },
    enabled: !!missionId,
    staleTime: 10 * 60 * 1000,
  });
}

// Get user's missions (active and completed)
export function useUserMissions(userId: string | undefined, status?: 'active' | 'completed' | 'all') {
  return useQuery({
    queryKey: ['userMissions', userId, status],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('user_missions_with_details')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });

      if (status === 'active') {
        query = query.eq('status', 'active');
      } else if (status === 'completed') {
        query = query.eq('status', 'completed');
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((m: Record<string, unknown>) => ({
        id: m.id,
        userId: m.user_id,
        missionId: m.mission_id,
        fieldId: m.field_id,
        status: m.status,
        currentStep: m.current_step,
        totalSteps: m.total_steps,
        progressPercentage: Number(m.progress_percentage) || 0,
        startedAt: m.started_at,
        targetDate: m.target_date,
        completedAt: m.completed_at,
        xpEarned: m.xp_earned,
        pointsEarned: m.points_earned,
        // Completion rewards
        badgeAwarded: m.badge_awarded,
        priorityMarketAccessUntil: m.priority_market_access_until,
        doubleReferralPointsUntil: m.double_referral_points_until,
        missionName: m.mission_name,
        missionNameSw: m.mission_name_sw,
        missionDescription: m.mission_description,
        cropType: m.crop_type,
        season: m.season,
        missionXpReward: m.mission_xp_reward,
        missionPointsReward: m.mission_points_reward,
        difficulty: m.difficulty,
        fieldName: m.field_name,
      })) as UserMission[];
    },
    enabled: !!userId,
  });
}

// Get mission step progress
export function useMissionStepProgress(userMissionId: string | undefined) {
  return useQuery({
    queryKey: ['missionStepProgress', userMissionId],
    queryFn: async () => {
      if (!userMissionId) return [];

      const { data, error } = await supabase
        .from('mission_step_progress')
        .select('*')
        .eq('user_mission_id', userMissionId)
        .order('step_index', { ascending: true });

      if (error) throw error;

      return data.map((s: Record<string, unknown>) => ({
        id: s.id,
        userMissionId: s.user_mission_id,
        stepIndex: s.step_index,
        stepName: s.step_name,
        stepDescription: s.step_description,
        status: s.status,
        dueDate: s.due_date,
        completedAt: s.completed_at,
        evidencePhotoUrl: s.evidence_photo_url,
        notes: s.notes,
        xpAwarded: s.xp_awarded,
        // Weather trigger fields
        weatherTrigger: s.weather_trigger as WeatherTrigger,
        autoReminded: s.auto_reminded,
        reminderSentAt: s.reminder_sent_at,
      })) as MissionStepProgress[];
    },
    enabled: !!userMissionId,
  });
}

// Start a mission
export function useStartMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      missionId,
      fieldId,
    }: {
      userId: string;
      missionId: string;
      fieldId?: string;
    }) => {
      const { data, error } = await supabase.rpc('start_mission', {
        p_user_id: userId,
        p_mission_id: missionId,
        p_field_id: fieldId || null,
      });

      if (error) throw error;
      return data as StartMissionResult;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['userMissions', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['availableMissions'] });
      }
    },
  });
}

// Complete a mission step
export function useCompleteMissionStep() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userMissionId,
      stepIndex,
      evidencePhotoUrl,
      notes,
    }: {
      userMissionId: string;
      stepIndex: number;
      evidencePhotoUrl?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('complete_mission_step', {
        p_user_mission_id: userMissionId,
        p_step_index: stepIndex,
        p_evidence_photo_url: evidencePhotoUrl || null,
        p_notes: notes || null,
      });

      if (error) throw error;
      return data as CompleteMissionStepResult;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['missionStepProgress', variables.userMissionId] });
      queryClient.invalidateQueries({ queryKey: ['userMissions'] });

      if (data.missionCompleted) {
        queryClient.invalidateQueries({ queryKey: ['farmerScore'] });
        queryClient.invalidateQueries({ queryKey: ['userPoints'] });
        queryClient.invalidateQueries({ queryKey: ['rewardsProfile'] });
      }
    },
  });
}

// Abandon a mission
export function useAbandonMission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userMissionId: string) => {
      const { error } = await supabase
        .from('user_missions')
        .update({ status: 'abandoned' })
        .eq('id', userMissionId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userMissions'] });
    },
  });
}

// Get mission difficulty info
export function getMissionDifficultyInfo(difficulty: 'easy' | 'medium' | 'hard') {
  const info = {
    easy: {
      name: 'Easy',
      nameSw: 'Rahisi',
      color: 'emerald',
      icon: '🌱',
      description: 'Great for beginners',
      descriptionSw: 'Nzuri kwa wanaoanza',
    },
    medium: {
      name: 'Medium',
      nameSw: 'Wastani',
      color: 'amber',
      icon: '🌿',
      description: 'Moderate challenge',
      descriptionSw: 'Changamoto ya wastani',
    },
    hard: {
      name: 'Hard',
      nameSw: 'Ngumu',
      color: 'red',
      icon: '🌳',
      description: 'For experienced farmers',
      descriptionSw: 'Kwa wakulima wenye uzoefu',
    },
  };

  return info[difficulty] || info.medium;
}

// Get season info
export function getSeasonInfo(season: string) {
  const seasons = {
    long_rains: {
      name: 'Long Rains',
      nameSw: 'Masika',
      months: 'March - May',
      icon: '🌧️',
    },
    short_rains: {
      name: 'Short Rains',
      nameSw: 'Vuli',
      months: 'October - December',
      icon: '🌦️',
    },
    dry_season: {
      name: 'Dry Season',
      nameSw: 'Kiangazi',
      months: 'June - September',
      icon: '☀️',
    },
    all: {
      name: 'All Seasons',
      nameSw: 'Misimu Yote',
      months: 'Year-round',
      icon: '🗓️',
    },
  };

  return seasons[season as keyof typeof seasons] || seasons.all;
}

// Calculate days remaining for mission
export function calculateDaysRemaining(targetDate: string): number {
  const target = new Date(targetDate);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Get mission status info
export function getMissionStatusInfo(status: UserMission['status']) {
  const statusInfo = {
    active: {
      name: 'Active',
      nameSw: 'Inaendelea',
      color: 'blue',
      icon: '▶️',
    },
    completed: {
      name: 'Completed',
      nameSw: 'Imekamilika',
      color: 'emerald',
      icon: '✅',
    },
    failed: {
      name: 'Failed',
      nameSw: 'Imeshindwa',
      color: 'red',
      icon: '❌',
    },
    abandoned: {
      name: 'Abandoned',
      nameSw: 'Imeachwa',
      color: 'gray',
      icon: '⏹️',
    },
  };

  return statusInfo[status] || statusInfo.active;
}

// Get recommended missions based on user's fields
export function useRecommendedMissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['recommendedMissions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_recommended_missions', {
        p_user_id: userId,
      });

      if (error) throw error;

      return (data || []).map((m: Record<string, unknown>) => ({
        id: m.id,
        name: m.name,
        nameSw: m.name_sw,
        description: m.description,
        descriptionSw: m.description_sw,
        cropType: m.crop_type,
        season: m.season,
        xpReward: m.xp_reward,
        pointsReward: m.points_reward,
        durationDays: m.duration_days,
        difficulty: m.difficulty,
        matchedFieldId: m.matched_field_id,
        matchedFieldName: m.matched_field_name,
        matchScore: m.match_score || 0,
        reason: m.reason || 'Recommended for your farm',
        reasonSw: m.reason_sw || 'Inapendekezwa kwa shamba lako',
      })) as RecommendedMission[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Check if user has double referral points bonus active
export function useDoubleReferralBonus(userId: string | undefined) {
  return useQuery({
    queryKey: ['doubleReferralBonus', userId],
    queryFn: async () => {
      if (!userId) return { hasBonus: false };

      const { data, error } = await supabase.rpc('check_double_referral_bonus', {
        p_user_id: userId,
      });

      if (error) throw error;

      return {
        hasBonus: data?.has_bonus || false,
        expiresAt: data?.expires_at,
        missionName: data?.mission_name,
      };
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Check if user has priority market access
export function usePriorityMarketAccess(userId: string | undefined) {
  return useQuery({
    queryKey: ['priorityMarketAccess', userId],
    queryFn: async () => {
      if (!userId) return { hasAccess: false };

      const { data, error } = await supabase.rpc('check_priority_market_access', {
        p_user_id: userId,
      });

      if (error) throw error;

      return {
        hasAccess: data?.has_access || false,
        expiresAt: data?.expires_at,
        missionName: data?.mission_name,
      };
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Combined hook for all user reward bonuses
export function useUserRewardBonuses(userId: string | undefined) {
  return useQuery({
    queryKey: ['userRewardBonuses', userId],
    queryFn: async () => {
      if (!userId) {
        return {
          hasPriorityMarketAccess: false,
          hasDoubleReferralPoints: false,
          activeBonusMissions: [],
        } as UserRewardBonuses;
      }

      // Query completed missions with active rewards
      const { data, error } = await supabase
        .from('user_missions')
        .select('id, mission_id, priority_market_access_until, double_referral_points_until')
        .eq('user_id', userId)
        .eq('status', 'completed');

      if (error) throw error;

      const now = new Date();
      const activeBonusMissions: string[] = [];
      let priorityMarketAccessUntil: string | undefined;
      let doubleReferralPointsUntil: string | undefined;

      for (const mission of data || []) {
        if (mission.priority_market_access_until) {
          const expiry = new Date(mission.priority_market_access_until);
          if (expiry > now) {
            activeBonusMissions.push(mission.id);
            if (!priorityMarketAccessUntil || expiry > new Date(priorityMarketAccessUntil)) {
              priorityMarketAccessUntil = mission.priority_market_access_until;
            }
          }
        }
        if (mission.double_referral_points_until) {
          const expiry = new Date(mission.double_referral_points_until);
          if (expiry > now) {
            if (!activeBonusMissions.includes(mission.id)) {
              activeBonusMissions.push(mission.id);
            }
            if (!doubleReferralPointsUntil || expiry > new Date(doubleReferralPointsUntil)) {
              doubleReferralPointsUntil = mission.double_referral_points_until;
            }
          }
        }
      }

      return {
        hasPriorityMarketAccess: !!priorityMarketAccessUntil,
        priorityMarketAccessUntil,
        hasDoubleReferralPoints: !!doubleReferralPointsUntil,
        doubleReferralPointsUntil,
        activeBonusMissions,
      } as UserRewardBonuses;
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

// Check for weather-triggered steps that need attention
export function useWeatherTriggeredSteps(userId: string | undefined, currentWeather?: string) {
  return useQuery({
    queryKey: ['weatherTriggeredSteps', userId, currentWeather],
    queryFn: async () => {
      if (!userId) return [];

      // Get active mission steps that have weather triggers
      const { data, error } = await supabase
        .from('mission_step_progress')
        .select(`
          *,
          user_missions!inner (
            id,
            user_id,
            status
          )
        `)
        .eq('user_missions.user_id', userId)
        .eq('user_missions.status', 'active')
        .eq('status', 'pending')
        .not('weather_trigger', 'is', null);

      if (error) throw error;

      // Filter steps based on current weather conditions
      const triggeredSteps = (data || []).filter((step: Record<string, unknown>) => {
        const trigger = step.weather_trigger as string;
        if (!currentWeather) return true; // Return all if no weather data

        // Match weather conditions to triggers
        const weatherLower = currentWeather.toLowerCase();
        if (trigger === 'rain_expected' && (weatherLower.includes('rain') || weatherLower.includes('shower'))) {
          return true;
        }
        if (trigger === 'dry_spell' && (weatherLower.includes('sun') || weatherLower.includes('clear') || weatherLower.includes('dry'))) {
          return true;
        }
        return false;
      });

      return triggeredSteps.map((s: Record<string, unknown>) => ({
        id: s.id,
        userMissionId: s.user_mission_id,
        stepIndex: s.step_index,
        stepName: s.step_name,
        stepDescription: s.step_description,
        status: s.status,
        dueDate: s.due_date,
        weatherTrigger: s.weather_trigger as WeatherTrigger,
        autoReminded: s.auto_reminded,
      })) as MissionStepProgress[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get weather trigger display info
export function getWeatherTriggerInfo(trigger: WeatherTrigger) {
  const triggers = {
    rain_expected: {
      name: 'Rain Expected',
      nameSw: 'Mvua Inatarajiwa',
      icon: '🌧️',
      description: 'Best done when rain is expected',
      descriptionSw: 'Bora zaidi wakati mvua inatarajiwa',
      color: 'blue',
    },
    dry_spell: {
      name: 'Dry Weather',
      nameSw: 'Hali ya Ukavu',
      icon: '☀️',
      description: 'Best done during dry weather',
      descriptionSw: 'Bora zaidi wakati wa hali ya ukavu',
      color: 'amber',
    },
    frost_warning: {
      name: 'Frost Warning',
      nameSw: 'Onyo la Baridi Kali',
      icon: '❄️',
      description: 'Protect crops from frost',
      descriptionSw: 'Linda mimea kutoka baridi kali',
      color: 'cyan',
    },
    heat_wave: {
      name: 'Heat Wave',
      nameSw: 'Wimbi la Joto',
      icon: '🔥',
      description: 'Take action during heat wave',
      descriptionSw: 'Chukua hatua wakati wa wimbi la joto',
      color: 'red',
    },
  };

  if (!trigger) return null;
  return triggers[trigger] || null;
}

// Format mission completion rewards for display
export function getMissionRewardInfo(mission: UserMission) {
  const rewards = [];

  if (mission.badgeAwarded) {
    rewards.push({
      type: 'badge',
      name: 'Seasonal Badge',
      nameSw: 'Beji ya Msimu',
      icon: '🏅',
      description: 'Earned a seasonal completion badge',
      descriptionSw: 'Umepata beji ya kukamilisha msimu',
    });
  }

  if (mission.priorityMarketAccessUntil) {
    const expiry = new Date(mission.priorityMarketAccessUntil);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isActive = daysLeft > 0;

    rewards.push({
      type: 'market_access',
      name: 'Priority Market Access',
      nameSw: 'Upatikanaji wa Soko wa Kipaumbele',
      icon: '🏪',
      description: isActive ? `${daysLeft} days remaining` : 'Expired',
      descriptionSw: isActive ? `Siku ${daysLeft} zimebaki` : 'Imekwisha',
      isActive,
      expiresAt: mission.priorityMarketAccessUntil,
    });
  }

  if (mission.doubleReferralPointsUntil) {
    const expiry = new Date(mission.doubleReferralPointsUntil);
    const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    const isActive = daysLeft > 0;

    rewards.push({
      type: 'double_referral',
      name: 'Double Referral Points',
      nameSw: 'Pointi Maradufu za Rufaa',
      icon: '✨',
      description: isActive ? `${daysLeft} days remaining` : 'Expired',
      descriptionSw: isActive ? `Siku ${daysLeft} zimebaki` : 'Imekwisha',
      isActive,
      expiresAt: mission.doubleReferralPointsUntil,
    });
  }

  return rewards;
}
