import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  RewardItem,
  UserRedemption,
  UserPoints,
  PointsTransaction,
  RewardCategory,
  RedeemPointsResult,
  AwardPointsResult,
} from '../types';

// Get user's points balance
export function useUserPoints(userId: string | undefined) {
  return useQuery({
    queryKey: ['userPoints', userId],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        return {
          id: data.id,
          userId: data.user_id,
          totalPoints: data.total_points,
          lifetimePoints: data.lifetime_points,
          updatedAt: data.updated_at,
        } as UserPoints;
      }

      // Return default if no record
      return {
        userId,
        totalPoints: 0,
        lifetimePoints: 0,
      } as UserPoints;
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Get points transaction history
export function usePointsHistory(userId: string | undefined, limit: number = 50) {
  return useQuery({
    queryKey: ['pointsHistory', userId, limit],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('points_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((t: Record<string, unknown>) => ({
        id: t.id,
        userId: t.user_id,
        amount: t.amount,
        transactionType: t.transaction_type,
        source: t.source,
        referenceId: t.reference_id,
        description: t.description,
        createdAt: t.created_at,
      })) as PointsTransaction[];
    },
    enabled: !!userId,
  });
}

// Get reward items (shop catalog)
export function useRewardItems(category?: RewardCategory) {
  return useQuery({
    queryKey: ['rewardItems', category],
    queryFn: async () => {
      let query = supabase
        .from('reward_items')
        .select('*')
        .eq('is_active', true)
        .order('is_featured', { ascending: false })
        .order('points_cost', { ascending: true });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((item: Record<string, unknown>) => ({
        id: item.id,
        name: item.name,
        nameSw: item.name_sw,
        description: item.description,
        descriptionSw: item.description_sw,
        category: item.category,
        pointsCost: item.points_cost,
        stockQuantity: item.stock_quantity,
        imageUrl: item.image_url,
        partnerName: item.partner_name,
        termsConditions: item.terms_conditions,
        isActive: item.is_active,
        isFeatured: item.is_featured,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) as RewardItem[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Get featured reward items
export function useFeaturedRewardItems() {
  return useQuery({
    queryKey: ['featuredRewardItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reward_items')
        .select('*')
        .eq('is_active', true)
        .eq('is_featured', true)
        .order('points_cost', { ascending: true });

      if (error) throw error;

      return data.map((item: Record<string, unknown>) => ({
        id: item.id,
        name: item.name,
        nameSw: item.name_sw,
        description: item.description,
        descriptionSw: item.description_sw,
        category: item.category,
        pointsCost: item.points_cost,
        stockQuantity: item.stock_quantity,
        imageUrl: item.image_url,
        partnerName: item.partner_name,
        termsConditions: item.terms_conditions,
        isActive: item.is_active,
        isFeatured: item.is_featured,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) as RewardItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Redeem points for an item
export function useRedeemItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      itemId,
      quantity = 1,
      deliveryAddress,
      deliveryPhone,
    }: {
      userId: string;
      itemId: string;
      quantity?: number;
      deliveryAddress?: string;
      deliveryPhone?: string;
    }) => {
      const { data, error } = await supabase.rpc('redeem_points', {
        p_user_id: userId,
        p_item_id: itemId,
        p_quantity: quantity,
        p_delivery_address: deliveryAddress || null,
        p_delivery_phone: deliveryPhone || null,
      });

      if (error) throw error;
      return data as RedeemPointsResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPoints', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['pointsHistory', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['userRedemptions', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardItems'] });
    },
  });
}

// Get user's redemption history
export function useUserRedemptions(userId: string | undefined) {
  return useQuery({
    queryKey: ['userRedemptions', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('user_redemptions')
        .select(`
          *,
          reward_items:item_id (
            name,
            name_sw,
            category,
            image_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((r: Record<string, unknown>) => ({
        id: r.id,
        userId: r.user_id,
        itemId: r.item_id,
        quantity: r.quantity,
        pointsSpent: r.points_spent,
        status: r.status,
        redemptionCode: r.redemption_code,
        deliveryAddress: r.delivery_address,
        deliveryPhone: r.delivery_phone,
        deliveryNotes: r.delivery_notes,
        adminNotes: r.admin_notes,
        createdAt: r.created_at,
        processedAt: r.processed_at,
        deliveredAt: r.delivered_at,
        itemName: (r.reward_items as Record<string, unknown>)?.name,
        itemNameSw: (r.reward_items as Record<string, unknown>)?.name_sw,
        itemCategory: (r.reward_items as Record<string, unknown>)?.category,
        itemImageUrl: (r.reward_items as Record<string, unknown>)?.image_url,
      })) as UserRedemption[];
    },
    enabled: !!userId,
  });
}

// Award points manually (admin or system use)
export function useAwardPoints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      amount,
      source,
      referenceId,
      description,
    }: {
      userId: string;
      amount: number;
      source: string;
      referenceId?: string;
      description?: string;
    }) => {
      const { data, error } = await supabase.rpc('award_points', {
        p_user_id: userId,
        p_amount: amount,
        p_source: source,
        p_reference_id: referenceId || null,
        p_description: description || null,
      });

      if (error) throw error;
      return data as AwardPointsResult;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['userPoints', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['pointsHistory', variables.userId] });
    },
  });
}

// Get reward category info
export function getRewardCategoryInfo(category: RewardCategory) {
  const categories = {
    seeds: {
      name: 'Seeds',
      nameSw: 'Mbegu',
      icon: '🌱',
      color: 'emerald',
      description: 'Quality seeds for planting',
      descriptionSw: 'Mbegu bora za kupanda',
    },
    fertilizer: {
      name: 'Fertilizer',
      nameSw: 'Mbolea',
      icon: '🧪',
      color: 'amber',
      description: 'Fertilizers and soil nutrients',
      descriptionSw: 'Mbolea na virutubisho vya udongo',
    },
    tools: {
      name: 'Tools',
      nameSw: 'Zana',
      icon: '🔧',
      color: 'blue',
      description: 'Farming tools and equipment',
      descriptionSw: 'Zana na vifaa vya kilimo',
    },
    vouchers: {
      name: 'Vouchers',
      nameSw: 'Vocha',
      icon: '🎟️',
      color: 'purple',
      description: 'Vouchers and gift cards',
      descriptionSw: 'Vocha na kadi za zawadi',
    },
    services: {
      name: 'Services',
      nameSw: 'Huduma',
      icon: '🛠️',
      color: 'pink',
      description: 'Agricultural services',
      descriptionSw: 'Huduma za kilimo',
    },
  };

  return categories[category] || categories.vouchers;
}

// Get redemption status info
export function getRedemptionStatusInfo(status: UserRedemption['status']) {
  const statuses = {
    pending: {
      name: 'Pending',
      nameSw: 'Inasubiri',
      icon: '⏳',
      color: 'gray',
      description: 'Awaiting approval',
    },
    approved: {
      name: 'Approved',
      nameSw: 'Imeidhinishwa',
      icon: '✅',
      color: 'blue',
      description: 'Order approved',
    },
    processing: {
      name: 'Processing',
      nameSw: 'Inachakatwa',
      icon: '⚙️',
      color: 'amber',
      description: 'Being prepared',
    },
    shipped: {
      name: 'Shipped',
      nameSw: 'Imetumwa',
      icon: '📦',
      color: 'purple',
      description: 'On the way',
    },
    delivered: {
      name: 'Delivered',
      nameSw: 'Imewasilishwa',
      icon: '🎉',
      color: 'emerald',
      description: 'Successfully delivered',
    },
    cancelled: {
      name: 'Cancelled',
      nameSw: 'Imeghairiwa',
      icon: '❌',
      color: 'red',
      description: 'Order cancelled',
    },
    refunded: {
      name: 'Refunded',
      nameSw: 'Imerejeshwa',
      icon: '↩️',
      color: 'orange',
      description: 'Points refunded',
    },
  };

  return statuses[status] || statuses.pending;
}

// Check if user can afford an item
export function canAffordItem(userPoints: number, itemCost: number, quantity: number = 1): boolean {
  return userPoints >= itemCost * quantity;
}

// Check if item is in stock
export function isInStock(stockQuantity: number, requestedQuantity: number = 1): boolean {
  return stockQuantity === -1 || stockQuantity >= requestedQuantity;
}

// Format points for display
export function formatPoints(points: number): string {
  if (points >= 1000) {
    return `${(points / 1000).toFixed(1)}K`;
  }
  return points.toString();
}

// Get all reward categories for filtering
export function getAllRewardCategories(): RewardCategory[] {
  return ['seeds', 'fertilizer', 'tools', 'vouchers', 'services'];
}
