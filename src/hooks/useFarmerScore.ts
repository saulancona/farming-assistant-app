import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { FarmerScore, CalculateFarmerScoreResult } from '../types';

// Get user's farmer score
export function useFarmerScore(userId: string | undefined) {
  return useQuery({
    queryKey: ['farmerScore', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('farmer_scores')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Transform snake_case to camelCase
      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          learningScore: Number(data.learning_score) || 0,
          missionScore: Number(data.mission_score) || 0,
          engagementScore: Number(data.engagement_score) || 0,
          reliabilityScore: Number(data.reliability_score) || 0,
          totalScore: Number(data.total_score) || 0,
          tier: data.tier,
          photoUploadsCount: data.photo_uploads_count || 0,
          dataQualityScore: Number(data.data_quality_score) || 0,
          updatedAt: data.updated_at,
          createdAt: data.created_at,
        } as FarmerScore;
      }

      return null;
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Recalculate farmer score
export function useRecalculateFarmerScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.rpc('calculate_farmer_score', {
        p_user_id: userId,
      });

      if (error) throw error;
      return data as CalculateFarmerScoreResult;
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ['farmerScore', userId] });
      return data;
    },
  });
}

// Get farmer score leaderboard
export function useFarmerScoreLeaderboard(limit: number = 20) {
  return useQuery({
    queryKey: ['farmerScoreLeaderboard', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('farmer_scores')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .order('total_score', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((entry: Record<string, unknown>, index: number) => ({
        userId: entry.user_id,
        totalScore: Number(entry.total_score),
        tier: entry.tier,
        rank: index + 1,
        userName: (entry.profiles as Record<string, unknown>)?.full_name || 'Anonymous',
        userAvatar: (entry.profiles as Record<string, unknown>)?.avatar_url,
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Get tier benefits info
export function getTierBenefits(tier: FarmerScore['tier']) {
  const benefits = {
    bronze: {
      name: 'Bronze',
      nameSw: 'Shaba',
      range: '0-40',
      benefits: ['Basic features', 'Community access', 'Learning content'],
      benefitsSw: ['Vipengele vya msingi', 'Ufikiaji wa jamii', 'Maudhui ya kujifunza'],
      color: 'amber',
      icon: '🥉',
    },
    silver: {
      name: 'Silver',
      nameSw: 'Fedha',
      range: '41-70',
      benefits: ['Priority market access', 'Early price alerts', 'Silver badge'],
      benefitsSw: ['Ufikiaji wa soko wa kipaumbele', 'Arifa za bei mapema', 'Beji ya fedha'],
      color: 'gray',
      icon: '🥈',
    },
    gold: {
      name: 'Gold',
      nameSw: 'Dhahabu',
      range: '71-90',
      benefits: ['Input discounts', 'Buyer matching', 'Gold badge', 'Premium support'],
      benefitsSw: ['Punguzo la vifaa', 'Uoanishaji na wanunuzi', 'Beji ya dhahabu', 'Msaada wa hali ya juu'],
      color: 'yellow',
      icon: '🥇',
    },
    champion: {
      name: 'Champion',
      nameSw: 'Bingwa',
      range: '91-100',
      benefits: ['VIP support', 'Insurance eligibility', 'Champion badge', 'Exclusive offers', 'Priority payouts'],
      benefitsSw: ['Msaada wa VIP', 'Ustahiki wa bima', 'Beji ya bingwa', 'Ofa maalum', 'Malipo ya kipaumbele'],
      color: 'purple',
      icon: '👑',
    },
  };

  return benefits[tier] || benefits.bronze;
}

// Get score component info
export function getScoreComponentInfo(component: 'learning' | 'mission' | 'engagement' | 'reliability') {
  const info = {
    learning: {
      name: 'Learning',
      nameSw: 'Kujifunza',
      description: 'Complete articles and videos to improve',
      descriptionSw: 'Kamilisha makala na video ili kuboresha',
      icon: '📚',
      maxPoints: 25,
      tips: ['Complete 1 article or video daily', 'Focus on topics for your crops'],
    },
    mission: {
      name: 'Missions',
      nameSw: 'Misheni',
      description: 'Complete seasonal farming missions',
      descriptionSw: 'Kamilisha misheni ya kilimo ya msimu',
      icon: '🎯',
      maxPoints: 25,
      tips: ['Start a mission for your current crop', 'Follow step-by-step guidance'],
    },
    engagement: {
      name: 'Engagement',
      nameSw: 'Ushiriki',
      description: 'Stay active daily and maintain streaks',
      descriptionSw: 'Kaa hai kila siku na kudumisha mfuatano',
      icon: '🔥',
      maxPoints: 25,
      tips: ['Log in daily to build streaks', 'Complete tasks and record activities'],
    },
    reliability: {
      name: 'Reliability',
      nameSw: 'Uaminifu',
      description: 'Upload photos and provide quality data',
      descriptionSw: 'Pakia picha na kutoa data bora',
      icon: '✅',
      maxPoints: 25,
      tips: ['Upload crop photos regularly', 'Keep field records updated'],
    },
  };

  return info[component];
}
