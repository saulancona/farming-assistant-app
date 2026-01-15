import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type {
  InputCost,
  InputCostCategory,
  InputCostSummary,
  ProfitProjection,
  Expense,
} from '../types';

// ============================================
// CATEGORY MAPPING: Input Costs -> Expenses
// ============================================

// Map input cost categories to expense categories
type ExpenseCategory = Expense['category'];

function mapInputCostToExpenseCategory(inputCategory: InputCostCategory): ExpenseCategory {
  const categoryMap: Record<InputCostCategory, ExpenseCategory> = {
    seed: 'seeds',
    fertilizer: 'fertilizer',
    pesticide: 'pesticide',
    labor: 'labor',
    transport: 'fuel', // Transport maps to fuel
    equipment: 'equipment',
    irrigation: 'other', // No direct mapping, use other
    storage: 'other', // No direct mapping, use other
    other: 'other',
  };
  return categoryMap[inputCategory] || 'other';
}

// Sync input cost to expenses table
async function syncInputCostToExpense(
  costId: string,
  params: {
    category: InputCostCategory;
    itemName: string;
    totalAmount: number;
    purchaseDate: string;
    fieldId?: string;
    notes?: string;
  },
  userId: string,
  fieldName?: string
): Promise<void> {
  try {
    const expenseCategory = mapInputCostToExpenseCategory(params.category);

    // Check if expense already exists for this input cost
    const { data: existing } = await supabase
      .from('expenses')
      .select('id')
      .eq('source_input_cost_id', costId)
      .maybeSingle();

    const expenseData = {
      user_id: userId,
      date: params.purchaseDate,
      category: expenseCategory,
      description: `[Input Cost] ${params.itemName}${params.notes ? ` - ${params.notes}` : ''}`,
      amount: params.totalAmount,
      field_id: params.fieldId || null,
      field_name: fieldName || null,
      source_input_cost_id: costId,
    };

    if (existing) {
      // Update existing expense
      console.log('[InputCost->Expense] Updating linked expense:', existing.id);
      await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', existing.id);
    } else {
      // Create new expense
      console.log('[InputCost->Expense] Creating new expense for cost:', costId);
      await supabase
        .from('expenses')
        .insert(expenseData);
    }
  } catch (err) {
    // Log but don't fail the main operation if expense sync fails
    console.error('[InputCost->Expense] Sync error:', err);
  }
}

// Delete expense linked to input cost
async function deleteLinkedExpense(inputCostId: string): Promise<void> {
  try {
    console.log('[InputCost->Expense] Deleting linked expense for cost:', inputCostId);
    await supabase
      .from('expenses')
      .delete()
      .eq('source_input_cost_id', inputCostId);
  } catch (err) {
    console.error('[InputCost->Expense] Delete error:', err);
  }
}

// Get field name for expense sync
async function getFieldName(fieldId: string | undefined): Promise<string | undefined> {
  if (!fieldId) return undefined;
  try {
    const { data } = await supabase
      .from('fields')
      .select('name')
      .eq('id', fieldId)
      .single();
    return data?.name;
  } catch {
    return undefined;
  }
}

// ============================================
// GET INPUT COSTS
// ============================================

interface GetInputCostsParams {
  fieldId?: string;
  seasonId?: string;
  category?: InputCostCategory;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function useInputCosts(params: GetInputCostsParams = {}) {
  return useQuery({
    queryKey: ['inputCosts', params],
    queryFn: async (): Promise<InputCost[]> => {
      const { data, error } = await supabase.rpc('get_input_costs', {
        p_field_id: params.fieldId || null,
        p_season_id: params.seasonId || null,
        p_category: params.category || null,
        p_start_date: params.startDate || null,
        p_end_date: params.endDate || null,
        p_limit: params.limit || 100,
      });

      if (error) {
        // Fallback to direct query if function doesn't exist
        console.log('get_input_costs not available, using direct query');
        const { data: directData, error: directError } = await supabase
          .from('input_costs')
          .select(`
            *,
            fields:field_id (name, crop_type)
          `)
          .order('purchase_date', { ascending: false })
          .limit(params.limit || 100);

        if (directError) throw directError;

        return (directData || []).map((row: Record<string, unknown>) => ({
          id: row.id as string,
          userId: row.user_id as string,
          fieldId: row.field_id as string | undefined,
          seasonId: row.season_id as string | undefined,
          harvestId: row.harvest_id as string | undefined,
          category: row.category as InputCostCategory,
          itemName: row.item_name as string,
          quantity: row.quantity as number | undefined,
          unit: row.unit as string | undefined,
          unitPrice: row.unit_price as number | undefined,
          totalAmount: row.total_amount as number,
          purchaseDate: row.purchase_date as string,
          supplier: row.supplier as string | undefined,
          receiptPhotoUrl: row.receipt_photo_url as string | undefined,
          notes: row.notes as string | undefined,
          fieldName: (row.fields as Record<string, unknown>)?.name as string | undefined,
          cropType: (row.fields as Record<string, unknown>)?.crop_type as string | undefined,
          createdAt: row.created_at as string,
        }));
      }

      return (data?.costs || []) as InputCost[];
    },
  });
}

// ============================================
// GET INPUT COST SUMMARY
// ============================================

interface GetSummaryParams {
  fieldId?: string;
  seasonId?: string;
  startDate?: string;
  endDate?: string;
}

export function useInputCostSummary(params: GetSummaryParams = {}) {
  return useQuery({
    queryKey: ['inputCostSummary', params],
    queryFn: async (): Promise<InputCostSummary> => {
      const { data, error } = await supabase.rpc('get_input_cost_summary', {
        p_field_id: params.fieldId || null,
        p_season_id: params.seasonId || null,
        p_start_date: params.startDate || null,
        p_end_date: params.endDate || null,
      });

      if (error) {
        // Fallback calculation
        console.log('get_input_cost_summary not available, calculating locally');
        const { data: costs } = await supabase
          .from('input_costs')
          .select('*')
          .order('purchase_date', { ascending: false });

        const totalCost = (costs || []).reduce((sum: number, c: Record<string, unknown>) => sum + ((c.total_amount as number) || 0), 0);

        const byCategory: Record<string, { total: number; count: number }> = {};
        (costs || []).forEach((c: Record<string, unknown>) => {
          const cat = c.category as string;
          if (!byCategory[cat]) byCategory[cat] = { total: 0, count: 0 };
          byCategory[cat].total += c.total_amount as number || 0;
          byCategory[cat].count++;
        });

        return {
          totalCost,
          costPerAcre: 0,
          byCategory: Object.entries(byCategory).map(([category, data]) => ({
            category: category as InputCostCategory,
            total: data.total,
            percentage: totalCost > 0 ? (data.total / totalCost) * 100 : 0,
            itemCount: data.count,
          })),
          byMonth: [],
          topExpenses: [],
        };
      }

      return {
        totalCost: data.totalCost || 0,
        costPerAcre: data.costPerAcre || 0,
        byCategory: (data.byCategory || []).map((c: Record<string, unknown>) => ({
          category: c.category as InputCostCategory,
          total: c.total as number,
          percentage: c.percentage as number,
          itemCount: c.itemCount as number,
        })),
        byMonth: (data.byMonth || []).map((m: Record<string, unknown>) => ({
          month: m.month as string,
          total: m.total as number,
        })),
        topExpenses: (data.topExpenses || []).map((e: Record<string, unknown>) => ({
          itemName: e.itemName as string,
          category: e.category as InputCostCategory,
          totalAmount: e.totalAmount as number,
        })),
      };
    },
  });
}

// ============================================
// GET PROFIT PROJECTION
// ============================================

interface ProfitProjectionParams {
  fieldId?: string;
  seasonId?: string;
  cropType?: string;
  area?: number;
  expectedYield?: number;
  marketPrice?: number;
}

export function useProfitProjection(params: ProfitProjectionParams = {}) {
  return useQuery({
    queryKey: ['profitProjection', params],
    queryFn: async (): Promise<ProfitProjection> => {
      const { data, error } = await supabase.rpc('calculate_profit_projection', {
        p_field_id: params.fieldId || null,
        p_season_id: params.seasonId || null,
        p_crop_type: params.cropType || null,
        p_area: params.area || null,
        p_expected_yield: params.expectedYield || null,
        p_market_price: params.marketPrice || null,
      });

      if (error) {
        // Return default projection
        return {
          cropType: params.cropType || 'unknown',
          areaPlanted: params.area || 1,
          totalInputCosts: 0,
          costBreakdown: [],
          estimatedYield: params.expectedYield || 0,
          yieldUnit: 'kg',
          marketPrice: params.marketPrice || 0,
          estimatedRevenue: 0,
          estimatedProfit: 0,
          profitMargin: 0,
          roi: 0,
          breakEvenYield: 0,
          riskLevel: 'medium',
          riskFactors: [],
        };
      }

      return {
        fieldId: data.fieldId,
        cropType: data.cropType,
        areaPlanted: data.areaPlanted,
        totalInputCosts: data.totalInputCosts,
        costBreakdown: (data.costBreakdown || []).map((c: Record<string, unknown>) => ({
          category: c.category as InputCostCategory,
          amount: c.amount as number,
        })),
        estimatedYield: data.estimatedYield,
        yieldUnit: data.yieldUnit,
        marketPrice: data.marketPrice,
        estimatedRevenue: data.estimatedRevenue,
        estimatedProfit: data.estimatedProfit,
        profitMargin: data.profitMargin,
        roi: data.roi,
        breakEvenYield: data.breakEvenYield,
        riskLevel: data.riskLevel as 'low' | 'medium' | 'high',
        riskFactors: data.riskFactors || [],
      };
    },
    enabled: !!(params.fieldId || params.seasonId || params.cropType),
  });
}

// ============================================
// GET COST RECOMMENDATIONS
// ============================================

interface Recommendation {
  type: 'saving' | 'warning' | 'tip';
  message: string;
  messageSw?: string;
  category?: InputCostCategory;
  potentialSaving?: number;
}

export function useCostRecommendations(fieldId?: string) {
  return useQuery({
    queryKey: ['costRecommendations', fieldId],
    queryFn: async (): Promise<Recommendation[]> => {
      const { data, error } = await supabase.rpc('get_cost_recommendations', {
        p_field_id: fieldId || null,
      });

      if (error) {
        // Return default recommendations
        return [
          {
            type: 'tip',
            message: 'Buy inputs in bulk during off-season for better prices.',
            messageSw: 'Nunua pembejeo kwa wingi wakati wa msimu wa chini kwa bei nzuri.',
          },
          {
            type: 'saving',
            message: 'Join a farmer cooperative to access discounted inputs.',
            messageSw: 'Jiunge na ushirika wa wakulima kupata pembejeo kwa bei nafuu.',
          },
        ];
      }

      return (data?.recommendations || []) as Recommendation[];
    },
  });
}

// ============================================
// ADD INPUT COST
// ============================================

interface AddInputCostParams {
  category: InputCostCategory;
  itemName: string;
  totalAmount: number;
  fieldId?: string;
  seasonId?: string;
  harvestId?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  purchaseDate?: string;
  supplier?: string;
  receiptPhotoUrl?: string;
  notes?: string;
}

export function useAddInputCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddInputCostParams) => {
      console.log('[InputCost] Adding cost:', params);

      // Get user data for expense sync
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const userId = userData.user.id;

      const purchaseDate = params.purchaseDate || new Date().toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('add_input_cost', {
        p_category: params.category,
        p_item_name: params.itemName,
        p_total_amount: params.totalAmount,
        p_field_id: params.fieldId || null,
        p_season_id: params.seasonId || null,
        p_harvest_id: params.harvestId || null,
        p_quantity: params.quantity || null,
        p_unit: params.unit || null,
        p_unit_price: params.unitPrice || null,
        p_purchase_date: purchaseDate,
        p_supplier: params.supplier || null,
        p_receipt_photo_url: params.receiptPhotoUrl || null,
        p_notes: params.notes || null,
      });

      console.log('[InputCost] RPC response:', { data, error });

      let costId: string;

      if (error) {
        console.log('[InputCost] RPC failed, trying direct insert:', error);
        // Fallback to direct insert

        const { data: insertData, error: insertError } = await supabase
          .from('input_costs')
          .insert({
            user_id: userId,
            category: params.category,
            item_name: params.itemName,
            total_amount: params.totalAmount,
            field_id: params.fieldId || null,
            season_id: params.seasonId || null,
            harvest_id: params.harvestId || null,
            quantity: params.quantity || null,
            unit: params.unit || null,
            unit_price: params.unitPrice || null,
            purchase_date: purchaseDate,
            supplier: params.supplier || null,
            receipt_photo_url: params.receiptPhotoUrl || null,
            notes: params.notes || null,
          })
          .select()
          .single();

        console.log('[InputCost] Direct insert result:', { insertData, insertError });

        if (insertError) {
          console.error('[InputCost] Direct insert failed:', insertError);
          throw insertError;
        }
        costId = insertData.id;
      } else {
        // Check if RPC returned success: false
        if (data && !data.success) {
          console.error('[InputCost] RPC returned error:', data.error);
          throw new Error(data.error || 'Failed to add input cost');
        }
        costId = data.costId || data.cost_id;
      }

      // Sync to expenses table
      const fieldName = await getFieldName(params.fieldId);
      await syncInputCostToExpense(
        costId,
        {
          category: params.category,
          itemName: params.itemName,
          totalAmount: params.totalAmount,
          purchaseDate,
          fieldId: params.fieldId,
          notes: params.notes,
        },
        userId,
        fieldName
      );

      console.log('[InputCost] Cost added and synced successfully:', costId);
      return { success: true, costId, xpAwarded: data?.xpAwarded || 0 };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inputCosts'] });
      queryClient.invalidateQueries({ queryKey: ['inputCostSummary'] });
      queryClient.invalidateQueries({ queryKey: ['profitProjection'] });
      queryClient.invalidateQueries({ queryKey: ['costRecommendations'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] }); // Also invalidate expenses
    },
    onError: (error) => {
      console.error('[InputCost] Mutation error:', error);
    },
  });
}

// ============================================
// UPDATE INPUT COST
// ============================================

interface UpdateInputCostParams {
  costId: string;
  category?: InputCostCategory;
  itemName?: string;
  totalAmount?: number;
  fieldId?: string;
  quantity?: number;
  unit?: string;
  unitPrice?: number;
  purchaseDate?: string;
  supplier?: string;
  notes?: string;
}

export function useUpdateInputCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateInputCostParams) => {
      // Get user data for expense sync
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');
      const userId = userData.user.id;

      // First, get the current input cost to merge with updates
      const { data: currentCost } = await supabase
        .from('input_costs')
        .select('*')
        .eq('id', params.costId)
        .single();

      const { data, error } = await supabase.rpc('update_input_cost', {
        p_cost_id: params.costId,
        p_category: params.category || null,
        p_item_name: params.itemName || null,
        p_total_amount: params.totalAmount || null,
        p_field_id: params.fieldId || null,
        p_quantity: params.quantity || null,
        p_unit: params.unit || null,
        p_unit_price: params.unitPrice || null,
        p_purchase_date: params.purchaseDate || null,
        p_supplier: params.supplier || null,
        p_notes: params.notes || null,
      });

      if (error) {
        // Fallback to direct update
        const updateData: Record<string, unknown> = {};
        if (params.category) updateData.category = params.category;
        if (params.itemName) updateData.item_name = params.itemName;
        if (params.totalAmount) updateData.total_amount = params.totalAmount;
        if (params.fieldId) updateData.field_id = params.fieldId;
        if (params.quantity) updateData.quantity = params.quantity;
        if (params.unit) updateData.unit = params.unit;
        if (params.unitPrice) updateData.unit_price = params.unitPrice;
        if (params.purchaseDate) updateData.purchase_date = params.purchaseDate;
        if (params.supplier) updateData.supplier = params.supplier;
        if (params.notes) updateData.notes = params.notes;
        updateData.updated_at = new Date().toISOString();

        const { error: updateError } = await supabase
          .from('input_costs')
          .update(updateData)
          .eq('id', params.costId);

        if (updateError) throw updateError;
      } else if (!data.success) {
        throw new Error(data.error || 'Failed to update input cost');
      }

      // Sync updated data to expenses
      if (currentCost) {
        const fieldId = params.fieldId ?? currentCost.field_id;
        const fieldName = await getFieldName(fieldId);
        await syncInputCostToExpense(
          params.costId,
          {
            category: params.category || currentCost.category,
            itemName: params.itemName || currentCost.item_name,
            totalAmount: params.totalAmount ?? currentCost.total_amount,
            purchaseDate: params.purchaseDate || currentCost.purchase_date,
            fieldId,
            notes: params.notes ?? currentCost.notes,
          },
          userId,
          fieldName
        );
      }

      return { success: true, costId: params.costId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inputCosts'] });
      queryClient.invalidateQueries({ queryKey: ['inputCostSummary'] });
      queryClient.invalidateQueries({ queryKey: ['profitProjection'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] }); // Also invalidate expenses
    },
  });
}

// ============================================
// DELETE INPUT COST
// ============================================

export function useDeleteInputCost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (costId: string) => {
      // Delete linked expense first (before the input cost is deleted)
      await deleteLinkedExpense(costId);

      const { data, error } = await supabase.rpc('delete_input_cost', {
        p_cost_id: costId,
      });

      if (error) {
        // Fallback to direct delete
        const { error: deleteError } = await supabase
          .from('input_costs')
          .delete()
          .eq('id', costId);

        if (deleteError) throw deleteError;
        return { success: true };
      }

      if (!data.success) throw new Error(data.error || 'Failed to delete input cost');
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inputCosts'] });
      queryClient.invalidateQueries({ queryKey: ['inputCostSummary'] });
      queryClient.invalidateQueries({ queryKey: ['profitProjection'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] }); // Also invalidate expenses
    },
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export const INPUT_COST_CATEGORIES: { value: InputCostCategory; label: string; labelSw: string; icon: string; color: string }[] = [
  { value: 'seed', label: 'Seeds', labelSw: 'Mbegu', icon: '🌱', color: '#10B981' },
  { value: 'fertilizer', label: 'Fertilizer', labelSw: 'Mbolea', icon: '🧪', color: '#8B5CF6' },
  { value: 'pesticide', label: 'Pesticide', labelSw: 'Dawa', icon: '🐛', color: '#EF4444' },
  { value: 'labor', label: 'Labor', labelSw: 'Kazi', icon: '👷', color: '#F59E0B' },
  { value: 'transport', label: 'Transport', labelSw: 'Usafiri', icon: '🚛', color: '#3B82F6' },
  { value: 'equipment', label: 'Equipment', labelSw: 'Vifaa', icon: '🔧', color: '#6B7280' },
  { value: 'irrigation', label: 'Irrigation', labelSw: 'Umwagiliaji', icon: '💧', color: '#06B6D4' },
  { value: 'storage', label: 'Storage', labelSw: 'Uhifadhi', icon: '🏪', color: '#84CC16' },
  { value: 'other', label: 'Other', labelSw: 'Nyingine', icon: '📦', color: '#9CA3AF' },
];

export const COMMON_UNITS = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'bags', label: 'Bags' },
  { value: 'litres', label: 'Litres' },
  { value: 'packets', label: 'Packets' },
  { value: 'tonnes', label: 'Tonnes' },
  { value: 'days', label: 'Days (labor)' },
  { value: 'hours', label: 'Hours' },
  { value: 'trips', label: 'Trips' },
  { value: 'pieces', label: 'Pieces' },
];

export function getCategoryInfo(category: InputCostCategory) {
  return INPUT_COST_CATEGORIES.find(c => c.value === category) || INPUT_COST_CATEGORIES[8];
}

export function formatCurrency(amount: number, currency = 'KES'): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
