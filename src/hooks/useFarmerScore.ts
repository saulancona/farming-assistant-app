import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FarmerScore, FarmerScoreLeaderboardEntry, FarmerScoreTier } from '../types';

/**
 * Hook to get and manage the user's Farmer Score (Trust Score)
 *
 * The Farmer Score is a composite trust metric (0-100) based on:
 * - Learning (0-25): Articles and videos completed
 * - Missions (0-25): Crop plans/missions completed
 * - Engagement (0-25): Daily streaks and activity
 * - Reliability (0-25): Profile completeness, fields, photos
 *
 * Tiers:
 * - Bronze: 0-40
 * - Silver: 41-70
 * - Gold: 71-90
 * - Champion: 91-100
 */
export function useFarmerScore(userId: string | undefined) {
  return useQuery({
    queryKey: ['farmerScore', userId],
    queryFn: async (): Promise<FarmerScore | null> => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_farmer_score', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[FarmerScore] Error fetching score:', error);
        // Return default score on error instead of throwing
        return {
          userId,
          learningScore: 0,
          missionScore: 0,
          engagementScore: 0,
          reliabilityScore: 5, // Base reliability for having an account
          totalScore: 5,
          tier: 'bronze' as FarmerScoreTier,
        };
      }

      return data as FarmerScore;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Hook to recalculate the farmer score
 */
export function useRecalculateFarmerScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<FarmerScore> => {
      const { data, error } = await supabase.rpc('calculate_farmer_score', {
        p_user_id: userId,
      });

      if (error) {
        console.error('[FarmerScore] Error recalculating:', error);
        throw error;
      }

      return data as FarmerScore;
    },
    onSuccess: (data, userId) => {
      queryClient.setQueryData(['farmerScore', userId], data);
    },
  });
}

/**
 * Hook to get the Farmer Score leaderboard
 */
export function useFarmerScoreLeaderboard(limit: number = 10) {
  return useQuery({
    queryKey: ['farmerScoreLeaderboard', limit],
    queryFn: async (): Promise<FarmerScoreLeaderboardEntry[]> => {
      const { data, error } = await supabase.rpc('get_farmer_score_leaderboard', {
        p_limit: limit,
      });

      if (error) {
        console.error('[FarmerScore] Error fetching leaderboard:', error);
        return [];
      }

      // Convert snake_case to camelCase
      return (data || []).map((entry: any) => ({
        rank: entry.rank,
        userId: entry.user_id,
        fullName: entry.full_name,
        totalScore: entry.total_score,
        tier: entry.tier,
        learningScore: entry.learning_score,
        missionScore: entry.mission_score,
        engagementScore: entry.engagement_score,
        reliabilityScore: entry.reliability_score,
      }));
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get tier benefits info
 */
export function getTierBenefits(tier: FarmerScoreTier) {
  switch (tier) {
    case 'champion':
      return {
        name: 'Champion',
        nameSw: 'Bingwa',
        icon: '👑',
        minScore: 91,
        benefits: [
          'VIP Support',
          'Insurance Eligibility',
          'Premium Buyer Access',
          'Priority Market Listings',
        ],
        benefitsSw: [
          'Msaada wa VIP',
          'Ustahiki wa Bima',
          'Upatikanaji wa Wanunuzi Wakuu',
          'Orodha za Soko za Kipaumbele',
        ],
      };
    case 'gold':
      return {
        name: 'Gold',
        nameSw: 'Dhahabu',
        icon: '🥇',
        minScore: 71,
        benefits: [
          'Input Discounts',
          'Buyer Matching',
          'Extended Credit',
          'Market Insights',
        ],
        benefitsSw: [
          'Punguzo la Pembejeo',
          'Uoanishaji na Wanunuzi',
          'Mkopo Ulioongezwa',
          'Maarifa ya Soko',
        ],
      };
    case 'silver':
      return {
        name: 'Silver',
        nameSw: 'Fedha',
        icon: '🥈',
        minScore: 41,
        benefits: [
          'Priority Market Access',
          'Basic Analytics',
          'Community Features',
        ],
        benefitsSw: [
          'Upatikanaji wa Soko wa Kipaumbele',
          'Uchambuzi wa Msingi',
          'Vipengele vya Jumuiya',
        ],
      };
    case 'bronze':
    default:
      return {
        name: 'Bronze',
        nameSw: 'Shaba',
        icon: '🥉',
        minScore: 0,
        benefits: [
          'Basic Features',
          'Learning Access',
          'Community Support',
        ],
        benefitsSw: [
          'Vipengele vya Msingi',
          'Upatikanaji wa Kujifunza',
          'Msaada wa Jumuiya',
        ],
      };
  }
}

/**
 * Get score component info (label, max points, how to improve)
 */
export function getScoreComponentInfo(component: 'learning' | 'mission' | 'engagement' | 'reliability') {
  switch (component) {
    case 'learning':
      return {
        name: 'Learning',
        nameSw: 'Kujifunza',
        icon: '📚',
        maxPoints: 25,
        description: 'Complete articles and videos',
        descriptionSw: 'Maliza makala na video',
        tips: [
          'Read farming articles',
          'Watch tutorial videos',
          'Complete learning modules',
        ],
        tipsSw: [
          'Soma makala ya kilimo',
          'Tazama video za mafunzo',
          'Maliza moduli za kujifunza',
        ],
      };
    case 'mission':
      return {
        name: 'Missions',
        nameSw: 'Misheni',
        icon: '🎯',
        maxPoints: 25,
        description: 'Complete crop plans',
        descriptionSw: 'Maliza mipango ya mazao',
        tips: [
          'Create and follow crop plans',
          'Complete seasonal missions',
          'Track your farm activities',
        ],
        tipsSw: [
          'Tengeneza na fuata mipango ya mazao',
          'Maliza misheni ya msimu',
          'Fuatilia shughuli zako za shamba',
        ],
      };
    case 'engagement':
      return {
        name: 'Engagement',
        nameSw: 'Ushiriki',
        icon: '🔥',
        maxPoints: 25,
        description: 'Daily activity and streaks',
        descriptionSw: 'Shughuli za kila siku',
        tips: [
          'Log in daily to build streaks',
          'Complete daily tasks',
          'Stay active on the app',
        ],
        tipsSw: [
          'Ingia kila siku kujenga mfululizo',
          'Maliza kazi za kila siku',
          'Kaa hai kwenye app',
        ],
      };
    case 'reliability':
      return {
        name: 'Reliability',
        nameSw: 'Uaminifu',
        icon: '✅',
        maxPoints: 25,
        description: 'Profile and data quality',
        descriptionSw: 'Ubora wa wasifu na data',
        tips: [
          'Complete your profile',
          'Add your farm fields',
          'Upload crop photos',
        ],
        tipsSw: [
          'Kamilisha wasifu wako',
          'Ongeza mashamba yako',
          'Pakia picha za mazao',
        ],
      };
  }
}

export default useFarmerScore;
