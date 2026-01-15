import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// Types
export interface Harvest {
  id: string;
  userId: string;
  fieldId?: string;
  fieldName?: string;
  cropType: string;
  cropVariety?: string;
  harvestDate: string;
  quantity: number;
  unit: string;
  qualityGrade: string;
  storageLocation?: string;
  soldQuantity: number;
  soldAmount: number;
  salePricePerUnit?: number;
  buyerName?: string;
  saleDate?: string;
  seedCost: number;
  fertilizerCost: number;
  pesticideCost: number;
  laborCost: number;
  transportCost: number;
  otherCost: number;
  totalCost: number;
  profit: number;
  areaPlanted?: number;
  areaUnit: string;
  photoUrls: string[];
  notes?: string;
  weatherConditions?: string;
  season?: string;
  year: number;
  createdAt: string;
  updatedAt: string;
}

export interface HarvestAnalytics {
  summary: {
    totalHarvests: number;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    avgYieldPerAcre: number;
    profitMargin: number;
  };
  bestCrop?: {
    crop: string;
    profit: number;
    quantity: number;
  };
  byCrop: Array<{
    crop: string;
    harvests: number;
    totalQuantity: number;
    totalRevenue: number;
    totalCost: number;
    profit: number;
    avgYieldPerAcre: number;
  }>;
  bySeason: Array<{
    season: string;
    harvests: number;
    totalQuantity: number;
    profit: number;
  }>;
  byMonth: Array<{
    month: number;
    harvests: number;
    quantity: number;
    revenue: number;
  }>;
}

export interface YieldComparison {
  cropType: string;
  userAvgYield: number;
  communityAvgYield: number;
  comparison: number; // percentage difference
  harvests: Array<{
    id: string;
    date: string;
    quantity: number;
    area: number;
    yield: number;
    profit: number;
    season: string;
  }>;
}

export interface RecordHarvestInput {
  userId: string;
  cropType: string;
  quantity: number;
  unit?: string;
  fieldId?: string;
  harvestDate?: string;
  areaPlanted?: number;
  qualityGrade?: string;
  season?: string;
  notes?: string;
  photoUrls?: string[];
}

export interface RecordSaleInput {
  harvestId: string;
  soldQuantity: number;
  soldAmount: number;
  buyerName?: string;
  saleDate?: string;
}

// Helper to convert snake_case to camelCase
function toHarvest(data: Record<string, unknown>): Harvest {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    fieldId: data.field_id as string | undefined,
    fieldName: data.field_name as string | undefined,
    cropType: data.crop_type as string,
    cropVariety: data.crop_variety as string | undefined,
    harvestDate: data.harvest_date as string,
    quantity: Number(data.quantity) || 0,
    unit: data.unit as string || 'kg',
    qualityGrade: data.quality_grade as string || 'A',
    storageLocation: data.storage_location as string | undefined,
    soldQuantity: Number(data.sold_quantity) || 0,
    soldAmount: Number(data.sold_amount) || 0,
    salePricePerUnit: data.sale_price_per_unit ? Number(data.sale_price_per_unit) : undefined,
    buyerName: data.buyer_name as string | undefined,
    saleDate: data.sale_date as string | undefined,
    seedCost: Number(data.seed_cost) || 0,
    fertilizerCost: Number(data.fertilizer_cost) || 0,
    pesticideCost: Number(data.pesticide_cost) || 0,
    laborCost: Number(data.labor_cost) || 0,
    transportCost: Number(data.transport_cost) || 0,
    otherCost: Number(data.other_cost) || 0,
    totalCost: Number(data.total_cost) || 0,
    profit: Number(data.profit) || 0,
    areaPlanted: data.area_planted ? Number(data.area_planted) : undefined,
    areaUnit: data.area_unit as string || 'acres',
    photoUrls: (data.photo_urls as string[]) || [],
    notes: data.notes as string | undefined,
    weatherConditions: data.weather_conditions as string | undefined,
    season: data.season as string | undefined,
    year: Number(data.year) || new Date().getFullYear(),
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  };
}

/**
 * Get all harvests for a user
 */
export function useHarvests(userId: string | undefined, options?: {
  cropType?: string;
  year?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['harvests', userId, options],
    queryFn: async () => {
      if (!userId) return [];

      let query = supabase
        .from('harvests')
        .select(`
          *,
          fields:field_id (name)
        `)
        .eq('user_id', userId)
        .order('harvest_date', { ascending: false });

      if (options?.cropType) {
        query = query.eq('crop_type', options.cropType);
      }

      if (options?.year) {
        query = query.eq('year', options.year);
      }

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map((h: Record<string, unknown>) => ({
        ...toHarvest(h),
        fieldName: (h.fields as Record<string, unknown> | null)?.name as string | undefined,
      }));
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get a single harvest by ID
 */
export function useHarvestDetails(harvestId: string | undefined) {
  return useQuery({
    queryKey: ['harvest', harvestId],
    queryFn: async () => {
      if (!harvestId) return null;

      const { data, error } = await supabase
        .from('harvests')
        .select(`
          *,
          fields:field_id (name)
        `)
        .eq('id', harvestId)
        .single();

      if (error) throw error;

      return {
        ...toHarvest(data),
        fieldName: (data.fields as Record<string, unknown> | null)?.name as string | undefined,
      };
    },
    enabled: !!harvestId,
  });
}

/**
 * Get harvest analytics
 */
export function useHarvestAnalytics(userId: string | undefined, options?: {
  year?: number;
  cropType?: string;
}) {
  return useQuery({
    queryKey: ['harvestAnalytics', userId, options],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase.rpc('get_harvest_analytics', {
        p_user_id: userId,
        p_year: options?.year || null,
        p_crop_type: options?.cropType || null,
      });

      if (error) throw error;

      return data as HarvestAnalytics;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Get yield comparison for a specific crop
 */
export function useYieldComparison(userId: string | undefined, cropType: string | undefined) {
  return useQuery({
    queryKey: ['yieldComparison', userId, cropType],
    queryFn: async () => {
      if (!userId || !cropType) return null;

      const { data, error } = await supabase.rpc('get_yield_comparison', {
        p_user_id: userId,
        p_crop_type: cropType,
      });

      if (error) throw error;

      return data as YieldComparison;
    },
    enabled: !!userId && !!cropType,
    staleTime: 10 * 60 * 1000,
  });
}

/**
 * Record a new harvest
 */
export function useRecordHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordHarvestInput) => {
      const { data, error } = await supabase.rpc('record_harvest', {
        p_user_id: input.userId,
        p_crop_type: input.cropType,
        p_quantity: input.quantity,
        p_unit: input.unit || 'kg',
        p_field_id: input.fieldId || null,
        p_harvest_date: input.harvestDate || new Date().toISOString().split('T')[0],
        p_area_planted: input.areaPlanted || null,
        p_quality_grade: input.qualityGrade || 'A',
        p_season: input.season || null,
        p_notes: input.notes || null,
        p_photo_urls: input.photoUrls || [],
      });

      if (error) throw error;
      return data as { success: boolean; harvestId: string; xpAwarded: number; pointsAwarded: number };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['harvests', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['harvestAnalytics', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile'] });
      queryClient.invalidateQueries({ queryKey: ['farmerScore'] });
    },
  });
}

/**
 * Record a sale for a harvest
 */
export function useRecordSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RecordSaleInput) => {
      const { data, error } = await supabase.rpc('record_harvest_sale', {
        p_harvest_id: input.harvestId,
        p_sold_quantity: input.soldQuantity,
        p_sold_amount: input.soldAmount,
        p_buyer_name: input.buyerName || null,
        p_sale_date: input.saleDate || new Date().toISOString().split('T')[0],
      });

      if (error) throw error;
      return data as { success: boolean; harvestId: string; soldQuantity: number; soldAmount: number; xpAwarded: number };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['harvest', data.harvestId] });
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['harvestAnalytics'] });
      queryClient.invalidateQueries({ queryKey: ['rewardsProfile'] });
    },
  });
}

/**
 * Update harvest costs
 */
export function useUpdateHarvestCosts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      harvestId,
      costs,
    }: {
      harvestId: string;
      costs: {
        seedCost?: number;
        fertilizerCost?: number;
        pesticideCost?: number;
        laborCost?: number;
        transportCost?: number;
        otherCost?: number;
      };
    }) => {
      const { data, error } = await supabase
        .from('harvests')
        .update({
          seed_cost: costs.seedCost,
          fertilizer_cost: costs.fertilizerCost,
          pesticide_cost: costs.pesticideCost,
          labor_cost: costs.laborCost,
          transport_cost: costs.transportCost,
          other_cost: costs.otherCost,
        })
        .eq('id', harvestId)
        .select()
        .single();

      if (error) throw error;
      return toHarvest(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['harvest', data.id] });
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['harvestAnalytics'] });
    },
  });
}

/**
 * Delete a harvest
 */
export function useDeleteHarvest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (harvestId: string) => {
      const { error } = await supabase
        .from('harvests')
        .delete()
        .eq('id', harvestId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['harvests'] });
      queryClient.invalidateQueries({ queryKey: ['harvestAnalytics'] });
    },
  });
}

/**
 * Get crop type options
 */
export function getCropTypeInfo(cropType: string) {
  const crops: Record<string, { name: string; nameSw: string; icon: string }> = {
    maize: { name: 'Maize', nameSw: 'Mahindi', icon: '🌽' },
    beans: { name: 'Beans', nameSw: 'Maharagwe', icon: '🫘' },
    tomato: { name: 'Tomato', nameSw: 'Nyanya', icon: '🍅' },
    cabbage: { name: 'Cabbage', nameSw: 'Kabichi', icon: '🥬' },
    potato: { name: 'Potato', nameSw: 'Viazi', icon: '🥔' },
    rice: { name: 'Rice', nameSw: 'Mchele', icon: '🍚' },
    wheat: { name: 'Wheat', nameSw: 'Ngano', icon: '🌾' },
    cassava: { name: 'Cassava', nameSw: 'Muhogo', icon: '🥔' },
    banana: { name: 'Banana', nameSw: 'Ndizi', icon: '🍌' },
    coffee: { name: 'Coffee', nameSw: 'Kahawa', icon: '☕' },
    tea: { name: 'Tea', nameSw: 'Chai', icon: '🍵' },
    sugarcane: { name: 'Sugarcane', nameSw: 'Miwa', icon: '🎋' },
    onion: { name: 'Onion', nameSw: 'Vitunguu', icon: '🧅' },
    pepper: { name: 'Pepper', nameSw: 'Pilipili', icon: '🌶️' },
    carrot: { name: 'Carrot', nameSw: 'Karoti', icon: '🥕' },
    spinach: { name: 'Spinach', nameSw: 'Mchicha', icon: '🥬' },
    kale: { name: 'Kale', nameSw: 'Sukuma Wiki', icon: '🥬' },
    avocado: { name: 'Avocado', nameSw: 'Parachichi', icon: '🥑' },
    mango: { name: 'Mango', nameSw: 'Embe', icon: '🥭' },
    watermelon: { name: 'Watermelon', nameSw: 'Tikiti Maji', icon: '🍉' },
  };

  return crops[cropType.toLowerCase()] || { name: cropType, nameSw: cropType, icon: '🌱' };
}

/**
 * Get quality grade info
 */
export function getQualityGradeInfo(grade: string) {
  const grades: Record<string, { name: string; nameSw: string; color: string; description: string }> = {
    A: { name: 'Grade A', nameSw: 'Daraja A', color: 'emerald', description: 'Premium quality' },
    B: { name: 'Grade B', nameSw: 'Daraja B', color: 'blue', description: 'Good quality' },
    C: { name: 'Grade C', nameSw: 'Daraja C', color: 'amber', description: 'Standard quality' },
    Rejected: { name: 'Rejected', nameSw: 'Imekataliwa', color: 'red', description: 'Below standard' },
  };

  return grades[grade] || grades.B;
}

/**
 * Get season info
 */
export function getSeasonInfo(season: string) {
  const seasons: Record<string, { name: string; nameSw: string; icon: string; months: string }> = {
    long_rains: { name: 'Long Rains', nameSw: 'Masika', icon: '🌧️', months: 'Mar-May' },
    short_rains: { name: 'Short Rains', nameSw: 'Vuli', icon: '🌦️', months: 'Oct-Dec' },
    irrigated: { name: 'Irrigated', nameSw: 'Umwagiliaji', icon: '💧', months: 'Year-round' },
    dry_season: { name: 'Dry Season', nameSw: 'Kiangazi', icon: '☀️', months: 'Jun-Sep' },
  };

  return seasons[season] || { name: season, nameSw: season, icon: '📅', months: '' };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = 'KES') {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format quantity with unit
 */
export function formatQuantity(quantity: number, unit: string) {
  const formatted = quantity.toLocaleString('en-KE', { maximumFractionDigits: 1 });
  return `${formatted} ${unit}`;
}

export default useHarvests;
