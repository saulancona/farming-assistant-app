import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  ReferralCode,
  Referral,
  ReferralMilestone,
  ReferralLeaderboardEntry,
  ProcessReferralResult,
  ActivateReferralResult,
  CheckMilestonesResult,
} from '../types';

// Types for enhanced referral system
export interface RecordShareResult {
  success: boolean;
  message: string;
  messageSw: string;
  shareCount: number;
  badgeAwarded?: string;
  xpAwarded: number;
  referrerBadge: string;
}

export interface ReferralDashboardData {
  referralCode: string;
  totalShares: number;
  totalReferrals: number;
  activatedReferrals: number;
  pendingReferrals: number;
  currentTier: string;
  referrerBadge: string;
  totalXpEarned: number;
  totalPointsEarned: number;
  nextMilestone: number | null;
  progressToNextMilestone: number;
  claimedMilestones: number[];
  unclaimedMilestones: number[];
}

// Get or generate user's referral code
export function useReferralCode(userId: string | undefined) {
  return useQuery({
    queryKey: ['referralCode', userId],
    queryFn: async () => {
      if (!userId) return null;

      // First try to get existing code
      const { data: existing, error: fetchError } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (existing) {
        return {
          id: existing.id,
          userId: existing.user_id,
          code: existing.code,
          createdAt: existing.created_at,
        } as ReferralCode;
      }

      // Generate new code if doesn't exist
      if (fetchError && fetchError.code === 'PGRST116') {
        const { error: generateError } = await supabase.rpc('generate_referral_code', {
          p_user_id: userId,
        });

        if (generateError) throw generateError;

        // Fetch the newly created code
        const { data: created, error: createdError } = await supabase
          .from('referral_codes')
          .select('*')
          .eq('user_id', userId)
          .single();

        if (createdError) throw createdError;

        return {
          id: created.id,
          userId: created.user_id,
          code: created.code,
          createdAt: created.created_at,
        } as ReferralCode;
      }

      throw fetchError;
    },
    enabled: !!userId,
    staleTime: Infinity, // Code doesn't change
  });
}

// Get user's referral stats/milestones
export function useReferralStats(userId: string | undefined) {
  return useQuery({
    queryKey: ['referralStats', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('referral_milestones')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          totalReferrals: data.total_referrals,
          activatedReferrals: data.activated_referrals,
          currentTier: data.current_tier,
          milestone3Claimed: data.milestone_3_claimed,
          milestone10Claimed: data.milestone_10_claimed,
          milestone25Claimed: data.milestone_25_claimed,
          milestone50Claimed: data.milestone_50_claimed,
          milestone100Claimed: data.milestone_100_claimed,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
        } as ReferralMilestone;
      }

      // Return default if no record
      return {
        userId,
        totalReferrals: 0,
        activatedReferrals: 0,
        currentTier: 'starter',
        milestone3Claimed: false,
        milestone10Claimed: false,
        milestone25Claimed: false,
        milestone50Claimed: false,
        milestone100Claimed: false,
      } as ReferralMilestone;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Get user's referral history
export function useReferralHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['referralHistory', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          referred:referred_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((r: Record<string, unknown>) => ({
        id: r.id,
        referrerId: r.referrer_id,
        referredId: r.referred_id,
        referralCode: r.referral_code,
        status: r.status,
        activationAction: r.activation_action,
        referrerXpAwarded: r.referrer_xp_awarded,
        referrerPointsAwarded: r.referrer_points_awarded,
        referredXpAwarded: r.referred_xp_awarded,
        referredPointsAwarded: r.referred_points_awarded,
        createdAt: r.created_at,
        activatedAt: r.activated_at,
        rewardedAt: r.rewarded_at,
        referredName: (r.referred as Record<string, unknown>)?.full_name || 'Anonymous',
        referredAvatar: (r.referred as Record<string, unknown>)?.avatar_url,
      })) as Referral[];
    },
    enabled: !!userId,
  });
}

// Process a referral code (for new users)
export function useProcessReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, newUserId }: { code: string; newUserId: string }) => {
      const { data, error } = await supabase.rpc('process_referral', {
        p_code: code,
        p_new_user_id: newUserId,
      });

      if (error) throw error;
      return data as ProcessReferralResult;
    },
    onSuccess: (data) => {
      if (data.success && data.referrerId) {
        queryClient.invalidateQueries({ queryKey: ['referralStats', data.referrerId] });
        queryClient.invalidateQueries({ queryKey: ['referralHistory', data.referrerId] });
      }
    },
  });
}

// Activate a referral (when referred user takes first action)
export function useActivateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) => {
      const { data, error } = await supabase.rpc('activate_referral', {
        p_user_id: userId,
        p_action: action,
      });

      if (error) throw error;
      return data as ActivateReferralResult;
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['referralStats'] });
        queryClient.invalidateQueries({ queryKey: ['referralHistory'] });
        queryClient.invalidateQueries({ queryKey: ['userPoints', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      }
    },
  });
}

// Check and claim referral milestones
export function useCheckReferralMilestones() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('check_referral_milestones', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as CheckMilestonesResult;
    },
    onSuccess: (data, userId) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['referralStats', userId] });
        queryClient.invalidateQueries({ queryKey: ['userPoints', userId] });
      }
    },
  });
}

// Get referral leaderboard
export function useReferralLeaderboard(limit: number = 20) {
  return useQuery({
    queryKey: ['referralLeaderboard', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('referral_leaderboard')
        .select('*')
        .limit(limit);

      if (error) throw error;

      return data.map((entry: Record<string, unknown>) => ({
        userId: entry.user_id,
        fullName: entry.full_name || 'Anonymous',
        avatarUrl: entry.avatar_url,
        totalReferrals: entry.total_referrals,
        activatedReferrals: entry.activated_referrals,
        currentTier: entry.current_tier,
        rank: entry.rank,
      })) as ReferralLeaderboardEntry[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get referral tier info
export function getReferralTierInfo(tier: ReferralMilestone['currentTier']) {
  const tiers = {
    starter: {
      name: 'Starter',
      nameSw: 'Mwanzilishi',
      minReferrals: 0,
      nextTier: 'recruiter',
      nextTierAt: 10,
      color: 'gray',
      icon: '🌱',
    },
    recruiter: {
      name: 'Recruiter',
      nameSw: 'Mwajiri',
      minReferrals: 10,
      nextTier: 'champion',
      nextTierAt: 50,
      color: 'blue',
      icon: '🎯',
    },
    champion: {
      name: 'Champion',
      nameSw: 'Bingwa',
      minReferrals: 50,
      nextTier: 'legend',
      nextTierAt: 100,
      color: 'purple',
      icon: '🏆',
    },
    legend: {
      name: 'Legend',
      nameSw: 'Hadithi',
      minReferrals: 100,
      nextTier: null,
      nextTierAt: null,
      color: 'amber',
      icon: '👑',
    },
  };

  return tiers[tier] || tiers.starter;
}

// Get milestone info
export function getMilestoneInfo() {
  return [
    { count: 3, points: 50, badge: null, title: null },
    { count: 10, points: 150, badge: 'Recruiter Badge', title: null },
    { count: 25, points: 400, badge: null, title: 'Recruiter' },
    { count: 50, points: 1000, badge: 'Champion Badge', title: 'Champion' },
    { count: 100, points: 2500, badge: 'Legend Badge', title: 'Legend' },
  ];
}

// Generate shareable referral link
export function generateReferralLink(code: string) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://agroafrica.app';
  return `${baseUrl}?ref=${code}`;
}

// Generate share message
export function getShareMessage(code: string, language: 'en' | 'sw' = 'en') {
  const link = generateReferralLink(code);

  if (language === 'sw') {
    return `🌱 Jiunge na AgroAfrica - programu bora ya kilimo! Tumia msimbo wangu: ${code} kupata bonasi ya XP na pointi. ${link}`;
  }

  return `🌱 Join AgroAfrica - the best farming app! Use my code: ${code} to get bonus XP and points. ${link}`;
}

// ============================================
// ENHANCED REFERRAL SYSTEM - 3-TIER REWARDS
// ============================================

// Record a referral share for instant gratification (Layer A)
export function useRecordReferralShare() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, shareMethod }: { userId: string; shareMethod: string }) => {
      const { data, error } = await supabase.rpc('record_referral_share', {
        p_user_id: userId,
        p_share_method: shareMethod,
      });

      if (error) throw error;
      return data as RecordShareResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['referralStats', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['referralDashboard', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
    },
  });
}

// Get enhanced referral dashboard data
export function useReferralDashboard(userId: string | undefined) {
  return useQuery({
    queryKey: ['referralDashboard', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_referral_dashboard', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as ReferralDashboardData;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// Enhanced activation with tier rewards (Layer B)
export function useActivateReferralEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: string }) => {
      const { data, error } = await supabase.rpc('activate_referral_enhanced', {
        p_user_id: userId,
        p_action: action,
      });

      if (error) throw error;
      return data as ActivateReferralResult & {
        referrerReward: { xp: number; points: number };
        referredReward: { xp: number; points: number };
      };
    },
    onSuccess: (data, variables) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['referralStats'] });
        queryClient.invalidateQueries({ queryKey: ['referralHistory'] });
        queryClient.invalidateQueries({ queryKey: ['referralDashboard'] });
        queryClient.invalidateQueries({ queryKey: ['userPoints', variables.userId] });
        queryClient.invalidateQueries({ queryKey: ['rewardsProfile', variables.userId] });
      }
    },
  });
}

// Check and claim referral milestones (Layer C - enhanced)
export function useCheckReferralMilestonesEnhanced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('check_referral_milestones_enhanced', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as CheckMilestonesResult & {
        milestonesReached: Array<{
          count: number;
          points: number;
          xp: number;
          badge?: string;
          title?: string;
          physicalReward?: string;
        }>;
      };
    },
    onSuccess: (data, userId) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['referralStats', userId] });
        queryClient.invalidateQueries({ queryKey: ['referralDashboard', userId] });
        queryClient.invalidateQueries({ queryKey: ['userPoints', userId] });
      }
    },
  });
}

// Get referrer badge info
export function getReferrerBadgeInfo(badge: string) {
  const badges: Record<string, { name: string; nameSw: string; icon: string; color: string; minShares: number }> = {
    bronze: {
      name: 'Bronze Referrer',
      nameSw: 'Mshiriki wa Shaba',
      icon: '🥉',
      color: 'amber',
      minShares: 1,
    },
    silver: {
      name: 'Silver Referrer',
      nameSw: 'Mshiriki wa Fedha',
      icon: '🥈',
      color: 'gray',
      minShares: 5,
    },
    gold: {
      name: 'Gold Referrer',
      nameSw: 'Mshiriki wa Dhahabu',
      icon: '🥇',
      color: 'yellow',
      minShares: 15,
    },
    platinum: {
      name: 'Platinum Referrer',
      nameSw: 'Mshiriki wa Platinamu',
      icon: '💎',
      color: 'cyan',
      minShares: 30,
    },
    legend: {
      name: 'Legend Referrer',
      nameSw: 'Mshiriki wa Hadithi',
      icon: '👑',
      color: 'purple',
      minShares: 50,
    },
  };

  return badges[badge] || badges.bronze;
}

// Get enhanced milestone info with physical rewards
export function getEnhancedMilestoneInfo() {
  return [
    { count: 3, points: 50, xp: 10, badge: null, title: null, physicalReward: '$0.30 airtime' },
    { count: 10, points: 150, xp: 30, badge: 'Recruiter Badge', title: 'Recruiter', physicalReward: 'Input voucher' },
    { count: 25, points: 400, xp: 75, badge: 'Champion Badge', title: 'Champion', physicalReward: 'Solar light' },
    { count: 50, points: 1000, xp: 150, badge: 'Village Champion Badge', title: 'Village Champion', physicalReward: 'Agro-dealer credit' },
    { count: 100, points: 2500, xp: 300, badge: 'Legend Badge', title: 'Legend', physicalReward: 'VIP Status + Premium features' },
  ];
}

// Get instant gratification messages
export function getInstantGratificationMessage(shareCount: number, language: 'en' | 'sw' = 'en') {
  const messages = {
    en: [
      { min: 1, message: "👏 Great job! You've invited a farmer. You're growing your community!" },
      { min: 5, message: "🌱 Amazing! 5 shares! You're becoming a farming community builder!" },
      { min: 15, message: "🌾 Incredible! 15 shares! You're a Gold Referrer now!" },
      { min: 30, message: "💎 Outstanding! 30 shares! Platinum Referrer status unlocked!" },
      { min: 50, message: "👑 Legendary! 50+ shares! You're a true farming community champion!" },
    ],
    sw: [
      { min: 1, message: "👏 Hongera! Umealika mkulima. Unakuza jamii yako!" },
      { min: 5, message: "🌱 Ajabu! Kushiriki 5! Unakuwa mjenzi wa jamii ya wakulima!" },
      { min: 15, message: "🌾 Isiyosadikika! Kushiriki 15! Sasa wewe ni Mshiriki wa Dhahabu!" },
      { min: 30, message: "💎 Bora sana! Kushiriki 30! Hali ya Mshiriki wa Platinamu imefunguliwa!" },
      { min: 50, message: "👑 Hadithi! Kushiriki 50+! Wewe ni bingwa wa kweli wa jamii ya wakulima!" },
    ],
  };

  const langMessages = messages[language];
  for (let i = langMessages.length - 1; i >= 0; i--) {
    if (shareCount >= langMessages[i].min) {
      return langMessages[i].message;
    }
  }
  return langMessages[0].message;
}
