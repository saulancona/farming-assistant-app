import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  TeamDetails,
  TeamChallenge,
  TeamLeaderboardEntry,
  TeamType,
} from '../types';

// Extended TeamDetails with user role info
export interface UserTeamDetails extends TeamDetails {
  userRole?: 'leader' | 'member';
  joinedAt?: string;
}

// ============================================
// GET USER'S TEAMS (MULTIPLE)
// ============================================

export function useUserTeams(userId: string | undefined) {
  return useQuery({
    queryKey: ['userTeams', userId],
    queryFn: async (): Promise<UserTeamDetails[]> => {
      if (!userId) return [];

      // Try the new get_user_teams function first
      const { data, error } = await supabase.rpc('get_user_teams', {
        p_user_id: userId,
      });

      if (error) {
        // Fallback to old get_user_team function (returns single team)
        console.log('get_user_teams not available, falling back to get_user_team');
        const { data: oldData, error: oldError } = await supabase.rpc('get_user_team', {
          p_user_id: userId,
        });

        if (oldError) {
          console.error('Error fetching user team:', oldError);
          return [];
        }

        const result = oldData?.team;
        if (!result || result.error) return [];

        // Return single team as array
        return [{
          id: result.id,
          name: result.name,
          nameSw: result.nameSw,
          description: result.description,
          descriptionSw: result.descriptionSw,
          teamType: result.teamType,
          leaderId: result.leaderId,
          inviteCode: result.inviteCode,
          avatarUrl: result.avatarUrl,
          location: result.location,
          isActive: true,
          maxMembers: 50,
          createdAt: result.createdAt,
          userRole: result.leaderId === userId ? 'leader' : 'member',
          stats: result.stats || {
            totalMembers: 0,
            totalXp: 0,
            totalReferrals: 0,
            lessonsCompleted: 0,
            missionsCompleted: 0,
            photosSubmitted: 0,
            challengesCompleted: 0,
          },
          members: result.members || [],
          achievements: result.achievements || [],
        }];
      }

      const teams = data?.teams || [];
      if (!Array.isArray(teams)) return [];

      return teams.map((result: Record<string, unknown>) => ({
        id: result.id as string,
        name: result.name as string,
        nameSw: result.nameSw as string | undefined,
        description: result.description as string | undefined,
        descriptionSw: result.descriptionSw as string | undefined,
        teamType: result.teamType as TeamType,
        leaderId: result.leaderId as string,
        inviteCode: result.inviteCode as string,
        avatarUrl: result.avatarUrl as string | undefined,
        location: result.location as string | undefined,
        isActive: true,
        maxMembers: (result.maxMembers as number) || 50,
        createdAt: result.createdAt as string,
        userRole: result.userRole as 'leader' | 'member' | undefined,
        joinedAt: result.joinedAt as string | undefined,
        stats: (result.stats as TeamDetails['stats']) || {
          totalMembers: 0,
          totalXp: 0,
          totalReferrals: 0,
          lessonsCompleted: 0,
          missionsCompleted: 0,
          photosSubmitted: 0,
          challengesCompleted: 0,
        },
        members: [],
        achievements: [],
      }));
    },
    enabled: !!userId,
  });
}

// ============================================
// GET USER'S TEAM (SINGLE - for backwards compatibility)
// ============================================

export function useUserTeam(userId: string | undefined) {
  return useQuery({
    queryKey: ['userTeam', userId],
    queryFn: async (): Promise<TeamDetails | null> => {
      if (!userId) return null;

      // Try the new function first
      const { data, error } = await supabase.rpc('get_user_teams', {
        p_user_id: userId,
      });

      if (error) {
        // Fallback to old function
        const { data: oldData, error: oldError } = await supabase.rpc('get_user_team', {
          p_user_id: userId,
        });

        if (oldError) throw oldError;

        const result = oldData?.team;
        if (!result || result.error) return null;

        return {
          id: result.id,
          name: result.name,
          nameSw: result.nameSw,
          description: result.description,
          descriptionSw: result.descriptionSw,
          teamType: result.teamType,
          leaderId: result.leaderId,
          inviteCode: result.inviteCode,
          avatarUrl: result.avatarUrl,
          location: result.location,
          isActive: true,
          maxMembers: 50,
          createdAt: result.createdAt,
          stats: result.stats || {
            totalMembers: 0,
            totalXp: 0,
            totalReferrals: 0,
            lessonsCompleted: 0,
            missionsCompleted: 0,
            photosSubmitted: 0,
            challengesCompleted: 0,
          },
          members: result.members || [],
          achievements: result.achievements || [],
        };
      }

      const teams = data?.teams || [];
      if (!Array.isArray(teams) || teams.length === 0) return null;

      // Return the first team for backwards compatibility
      const result = teams[0];
      return {
        id: result.id as string,
        name: result.name as string,
        nameSw: result.nameSw as string | undefined,
        description: result.description as string | undefined,
        descriptionSw: result.descriptionSw as string | undefined,
        teamType: result.teamType as TeamType,
        leaderId: result.leaderId as string,
        inviteCode: result.inviteCode as string,
        avatarUrl: result.avatarUrl as string | undefined,
        location: result.location as string | undefined,
        isActive: true,
        maxMembers: (result.maxMembers as number) || 50,
        createdAt: result.createdAt as string,
        stats: (result.stats as TeamDetails['stats']) || {
          totalMembers: 0,
          totalXp: 0,
          totalReferrals: 0,
          lessonsCompleted: 0,
          missionsCompleted: 0,
          photosSubmitted: 0,
          challengesCompleted: 0,
        },
        members: [],
        achievements: [],
      };
    },
    enabled: !!userId,
  });
}

// ============================================
// GET TEAM DETAILS
// ============================================

export function useTeamDetails(teamId: string | undefined) {
  return useQuery({
    queryKey: ['teamDetails', teamId],
    queryFn: async (): Promise<TeamDetails | null> => {
      if (!teamId) return null;

      const { data, error } = await supabase.rpc('get_team_details', {
        p_team_id: teamId,
      });

      if (error) throw error;
      if (!data || data.error) return null;

      return {
        id: data.id,
        name: data.name,
        nameSw: data.nameSw,
        description: data.description,
        descriptionSw: data.descriptionSw,
        teamType: data.teamType,
        leaderId: data.leaderId,
        inviteCode: data.inviteCode,
        avatarUrl: data.avatarUrl,
        location: data.location,
        isActive: true,
        maxMembers: 50,
        createdAt: data.createdAt,
        stats: data.stats || {
          totalMembers: 0,
          totalXp: 0,
          totalReferrals: 0,
          lessonsCompleted: 0,
          missionsCompleted: 0,
          photosSubmitted: 0,
          challengesCompleted: 0,
        },
        members: data.members || [],
        achievements: data.achievements || [],
      };
    },
    enabled: !!teamId,
  });
}

// ============================================
// CREATE TEAM
// ============================================

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      name,
      nameSw,
      description,
      descriptionSw,
      teamType,
      location,
    }: {
      userId: string;
      name: string;
      nameSw?: string;
      description?: string;
      descriptionSw?: string;
      teamType: TeamType;
      location?: string;
    }) => {
      const { data, error } = await supabase.rpc('create_team', {
        p_user_id: userId,
        p_name: name,
        p_name_sw: nameSw || null,
        p_description: description || null,
        p_description_sw: descriptionSw || null,
        p_team_type: teamType,
        p_location: location || null,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to create team');

      return {
        teamId: data.team_id as string,
        inviteCode: data.invite_code as string,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userTeam', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userTeams', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
    },
  });
}

// ============================================
// JOIN TEAM
// ============================================

export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      inviteCode,
    }: {
      userId: string;
      inviteCode: string;
    }) => {
      const { data, error } = await supabase.rpc('join_team', {
        p_user_id: userId,
        p_invite_code: inviteCode,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to join team');

      return {
        teamId: data.team_id as string,
        teamName: data.team_name as string,
      };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userTeam', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userTeams', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaderboard'] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
    },
  });
}

// ============================================
// LEAVE TEAM
// ============================================

export function useLeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      teamId,
    }: {
      userId: string;
      teamId: string;
    }) => {
      const { data, error } = await supabase.rpc('leave_team', {
        p_user_id: userId,
        p_team_id: teamId,
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Failed to leave team');

      return data.message as string;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userTeam', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userTeams', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['teamDetails', variables.teamId] });
      queryClient.invalidateQueries({ queryKey: ['teamLeaderboard'] });
    },
  });
}

// ============================================
// GET TEAM CHALLENGES
// ============================================

export function useTeamChallenges(teamId: string | undefined) {
  return useQuery({
    queryKey: ['teamChallenges', teamId],
    queryFn: async (): Promise<TeamChallenge[]> => {
      const { data, error } = await supabase.rpc('get_active_team_challenges', {
        p_team_id: teamId || null,
      });

      if (error) throw error;

      return (data || []).map((row: Record<string, unknown>) => ({
        challengeId: row.challenge_id as string,
        name: row.name as string,
        nameSw: row.name_sw as string | undefined,
        description: row.description as string | undefined,
        descriptionSw: row.description_sw as string | undefined,
        challengeType: row.challenge_type as string,
        targetCount: row.target_count as number,
        xpReward: row.xp_reward as number,
        pointsReward: row.points_reward as number,
        badgeName: row.badge_name as string | undefined,
        badgeIcon: row.badge_icon as string | undefined,
        startDate: row.start_date as string,
        endDate: row.end_date as string,
        currentProgress: (row.current_progress as number) || 0,
        status: (row.status as 'active' | 'completed' | 'failed' | 'expired') || 'active',
      }));
    },
  });
}

// ============================================
// GET TEAM LEADERBOARD
// ============================================

export function useTeamLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: ['teamLeaderboard', limit],
    queryFn: async (): Promise<TeamLeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('get_team_leaderboard', {
        p_limit: limit,
      });

      if (error) {
        // Fallback to direct view query
        const { data: viewData, error: viewError } = await supabase
          .from('team_leaderboard')
          .select('*')
          .limit(limit);

        if (viewError) throw viewError;

        return (viewData || []).map((row: Record<string, unknown>, index: number) => ({
          teamId: row.team_id as string,
          name: row.name as string,
          nameSw: row.name_sw as string | undefined,
          teamType: row.team_type as TeamType,
          avatarUrl: row.avatar_url as string | undefined,
          location: row.location as string | undefined,
          totalMembers: (row.total_members as number) || 0,
          totalXp: (row.total_xp as number) || 0,
          totalReferrals: (row.total_referrals as number) || 0,
          challengesCompleted: (row.challenges_completed as number) || 0,
          rank: index + 1,
        }));
      }

      return (data || []).map((row: Record<string, unknown>) => ({
        teamId: row.team_id as string,
        name: row.name as string,
        nameSw: row.name_sw as string | undefined,
        teamType: row.team_type as TeamType,
        avatarUrl: row.avatar_url as string | undefined,
        location: row.location as string | undefined,
        totalMembers: (row.total_members as number) || 0,
        totalXp: (row.total_xp as number) || 0,
        totalReferrals: (row.total_referrals as number) || 0,
        challengesCompleted: (row.challenges_completed as number) || 0,
        rank: (row.rank as number) || 0,
      }));
    },
    staleTime: 60000,
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTeamTypeIcon(type: TeamType): string {
  const icons: Record<TeamType, string> = {
    church: '⛪',
    coop: '🤝',
    youth_group: '👥',
    village: '🏘️',
    school: '🎓',
    other: '🌾',
  };
  return icons[type] || '🌾';
}

export function getTeamTypeLabel(type: TeamType, isSwahili: boolean = false): string {
  const labels: Record<TeamType, { en: string; sw: string }> = {
    church: { en: 'Church', sw: 'Kanisa' },
    coop: { en: 'Cooperative', sw: 'Ushirika' },
    youth_group: { en: 'Youth Group', sw: 'Kundi la Vijana' },
    village: { en: 'Village', sw: 'Kijiji' },
    school: { en: 'School', sw: 'Shule' },
    other: { en: 'Other', sw: 'Nyingine' },
  };
  return isSwahili ? labels[type]?.sw : labels[type]?.en || type;
}

export function getChallengeTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    referrals: '👥',
    learning: '📚',
    missions: '🎯',
    photos: '📸',
  };
  return icons[type] || '🏆';
}

export function getChallengeTypeLabel(type: string, isSwahili: boolean = false): string {
  const labels: Record<string, { en: string; sw: string }> = {
    referrals: { en: 'Referrals', sw: 'Rufaa' },
    learning: { en: 'Learning', sw: 'Kujifunza' },
    missions: { en: 'Missions', sw: 'Misheni' },
    photos: { en: 'Photos', sw: 'Picha' },
  };
  return isSwahili ? labels[type]?.sw : labels[type]?.en || type;
}
