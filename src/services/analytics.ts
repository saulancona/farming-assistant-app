import type {
  Field,
  Expense,
  Income,
  YieldPrediction,
  PlantingRecommendation,
  PricePrediction,
  ROIAnalysis,
  SeasonalInsight
} from '../types';
import {
  differenceInDays,
  addMonths,
  format,
  parseISO
} from 'date-fns';

// Helper function to calculate average yield from historical data
function calculateHistoricalYield(
  cropType: string,
  income: Income[]
): number | null {
  const relevantIncome = income.filter(
    i => i.source === 'harvest_sale' &&
    i.description.toLowerCase().includes(cropType.toLowerCase())
  );

  if (relevantIncome.length === 0) return null;

  // Estimate yield based on revenue (simplified)
  const totalRevenue = relevantIncome.reduce((sum, i) => sum + i.amount, 0);
  const avgRevenue = totalRevenue / relevantIncome.length;

  return avgRevenue; // This is simplified - in reality, you'd divide by price per unit
}

// Generate yield predictions for active fields
export async function generateYieldPredictions(
  fields: Field[],
  expenses: Expense[],
  income: Income[]
): Promise<YieldPrediction[]> {
  const predictions: YieldPrediction[] = [];

  for (const field of fields) {
    if (field.status === 'harvested') continue;

    // Calculate historical average for this crop
    const historicalAvg = calculateHistoricalYield(field.cropType, income);

    // Calculate investment in this field
    const fieldExpenses = expenses.filter(e => e.fieldId === field.id);
    const totalInvestment = fieldExpenses.reduce((sum, e) => sum + e.amount, 0);

    // Calculate days until expected harvest
    const daysUntilHarvest = differenceInDays(
      parseISO(field.expectedHarvest),
      new Date()
    );

    // Determine confidence based on data availability
    let confidence: 'low' | 'medium' | 'high' = 'low';
    const basedOn: string[] = [];

    if (historicalAvg) {
      confidence = 'medium';
      basedOn.push('Historical data');
    }
    if (totalInvestment > 0) {
      basedOn.push('Investment analysis');
      if (confidence === 'medium') confidence = 'high';
    }
    if (daysUntilHarvest < 30) {
      basedOn.push('Growth stage');
    }

    // Simple yield prediction based on investment and historical data
    let predictedYield = field.area * 1500; // Base estimate: 1500 kg per acre

    if (historicalAvg) {
      predictedYield = (predictedYield + historicalAvg) / 2;
    }

    // Adjust based on investment (more investment = potentially better yield)
    if (totalInvestment > 0) {
      const investmentPerAcre = totalInvestment / field.area;
      if (investmentPerAcre > 5000) {
        predictedYield *= 1.2; // 20% boost for high investment
      } else if (investmentPerAcre < 2000) {
        predictedYield *= 0.9; // 10% reduction for low investment
      }
    }

    predictions.push({
      fieldId: field.id,
      fieldName: field.name,
      cropType: field.cropType,
      predictedYield: Math.round(predictedYield),
      unit: 'kg',
      confidence,
      basedOn,
      factors: {
        historicalAverage: historicalAvg || undefined,
        weatherImpact: daysUntilHarvest > 60 ? 'neutral' : 'positive',
        seasonalTrend: 'normal'
      },
      estimatedHarvestDate: field.expectedHarvest
    });
  }

  return predictions;
}

// Generate ROI analysis for fields
export async function generateROIAnalysis(
  fields: Field[],
  expenses: Expense[],
  income: Income[]
): Promise<ROIAnalysis[]> {
  const analyses: ROIAnalysis[] = [];

  for (const field of fields) {
    // Calculate total investment for this field
    const fieldExpenses = expenses.filter(e => e.fieldId === field.id);
    const totalInvestment = fieldExpenses.reduce((sum, e) => sum + e.amount, 0);

    if (totalInvestment === 0) continue; // Skip fields with no investment data

    // Calculate actual or projected revenue
    const fieldIncome = income.filter(i => i.fieldId === field.id);
    let projectedRevenue = fieldIncome.reduce((sum, i) => sum + i.amount, 0);

    // If not harvested yet, estimate revenue
    if (field.status !== 'harvested' && projectedRevenue === 0) {
      // Estimate based on typical market prices and area
      const estimatedYieldPerAcre = 1500; // kg
      const estimatedPricePerKg = 50; // KES
      projectedRevenue = field.area * estimatedYieldPerAcre * estimatedPricePerKg;
    }

    const projectedProfit = projectedRevenue - totalInvestment;
    const roi = totalInvestment > 0 ? (projectedProfit / totalInvestment) * 100 : 0;
    const profitMargin = projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0;

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'medium';
    if (roi > 50 && profitMargin > 30) riskLevel = 'low';
    else if (roi < 20 || profitMargin < 15) riskLevel = 'high';

    // Generate recommendations
    const recommendations: string[] = [];
    if (roi < 30) {
      recommendations.push('Consider reducing input costs or improving yield');
    }
    if (profitMargin < 20) {
      recommendations.push('Look for better market prices or value-added opportunities');
    }
    if (riskLevel === 'high') {
      recommendations.push('Diversify crops to spread risk');
    }
    if (roi > 50) {
      recommendations.push('Excellent returns - consider expanding this crop');
    }

    analyses.push({
      fieldId: field.id,
      fieldName: field.name,
      cropType: field.cropType,
      totalInvestment,
      projectedRevenue,
      projectedProfit,
      roi: Math.round(roi * 10) / 10,
      profitMargin: Math.round(profitMargin * 10) / 10,
      riskLevel,
      recommendations
    });
  }

  return analyses.sort((a, b) => b.roi - a.roi); // Sort by ROI descending
}

// Generate planting recommendations (rule-based for security - no client-side API calls)
export async function generatePlantingRecommendations(
  fields: Field[],
  _expenses: Expense[],
  _income: Income[]
): Promise<PlantingRecommendation[]> {
  // Use rule-based recommendations (secure, no API key exposure)
  return generateRuleBasedPlantingRecommendations(fields);
}

// Rule-based planting recommendations (fallback)
function generateRuleBasedPlantingRecommendations(
  fields: Field[]
): PlantingRecommendation[] {
  const recommendations: PlantingRecommendation[] = [];
  const currentMonth = new Date().getMonth();
  const currentCrops = new Set(fields.map(f => f.cropType));

  // Common Kenya crops and their ideal planting months
  const cropCalendar: Record<string, { months: number[], yield: number, roi: number }> = {
    'Maize': { months: [2, 3, 9, 10], yield: 2000, roi: 45 },
    'Beans': { months: [2, 3, 9, 10], yield: 800, roi: 55 },
    'Tomatoes': { months: [0, 1, 2, 6, 7, 8], yield: 3000, roi: 65 },
    'Cabbage': { months: [0, 1, 2, 6, 7, 8], yield: 2500, roi: 50 },
    'Kale': { months: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], yield: 1500, roi: 60 },
    'Potatoes': { months: [2, 3, 8, 9], yield: 2500, roi: 40 }
  };

  let count = 0;
  for (const [crop, data] of Object.entries(cropCalendar)) {
    if (count >= 3) break;

    // Check if current month is good for planting
    const nextGoodMonth = data.months.find(m => m >= currentMonth) || data.months[0];
    const monthsAhead = nextGoodMonth >= currentMonth ? nextGoodMonth - currentMonth : 12 - currentMonth + nextGoodMonth;

    if (monthsAhead <= 2) {
      const recommendedDate = addMonths(new Date(), monthsAhead);

      recommendations.push({
        cropType: crop,
        recommendedDate: format(recommendedDate, 'yyyy-MM-dd'),
        reason: currentCrops.has(crop)
          ? `${crop} has performed well for you. Good season approaching.`
          : `${crop} is in season and has strong market demand.`,
        confidence: currentCrops.has(crop) ? 'high' : 'medium',
        expectedYield: data.yield,
        expectedROI: data.roi,
        considerations: [
          monthsAhead === 0 ? 'Plant this month' : `Plant in ${monthsAhead} month(s)`,
          'Ensure soil preparation is complete',
          'Check local market prices before planting'
        ]
      });
      count++;
    }
  }

  return recommendations;
}

// Generate price predictions
export async function generatePricePredictions(
  fields: Field[],
  income: Income[]
): Promise<PricePrediction[]> {
  const predictions: PricePrediction[] = [];
  const uniqueCrops = [...new Set(fields.map(f => f.cropType))];

  for (const crop of uniqueCrops) {
    // Get historical pricing data from income
    const cropSales = income.filter(i =>
      i.source === 'harvest_sale' &&
      i.description.toLowerCase().includes(crop.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (cropSales.length === 0) continue;

    const recentPrice = cropSales[0].amount;
    const olderPrices = cropSales.slice(1, 4).map(i => i.amount);

    // Calculate trend
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (olderPrices.length > 0) {
      const avgOlderPrice = olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length;
      if (recentPrice > avgOlderPrice * 1.1) trend = 'increasing';
      else if (recentPrice < avgOlderPrice * 0.9) trend = 'decreasing';
    }

    // Simple prediction (±10% based on trend)
    let predictedPrice = recentPrice;
    let recommendation: 'sell_now' | 'wait' | 'wait_and_monitor' = 'wait_and_monitor';
    let reasoning = '';

    if (trend === 'increasing') {
      predictedPrice = recentPrice * 1.10;
      recommendation = 'wait';
      reasoning = 'Prices are trending upward. Consider waiting for better rates.';
    } else if (trend === 'decreasing') {
      predictedPrice = recentPrice * 0.90;
      recommendation = 'sell_now';
      reasoning = 'Prices are falling. Sell soon to maximize returns.';
    } else {
      recommendation = 'wait_and_monitor';
      reasoning = 'Prices are stable. Monitor market conditions closely.';
    }

    predictions.push({
      cropType: crop,
      currentPrice: Math.round(recentPrice),
      predictedPrice: Math.round(predictedPrice),
      timeframe: 'next month',
      trend,
      confidence: cropSales.length >= 3 ? 'medium' : 'low',
      recommendation,
      reasoning
    });
  }

  return predictions;
}

// Generate seasonal insights
export async function generateSeasonalInsights(): Promise<SeasonalInsight> {
  const currentMonth = new Date().getMonth();

  // Determine current season in Kenya
  let season = '';
  let recommendedCrops: string[] = [];
  let weatherOutlook = '';
  let expectedMarketDemand: 'high' | 'medium' | 'low' = 'medium';

  if (currentMonth >= 2 && currentMonth <= 4) {
    season = 'Long Rains Season (March - May)';
    recommendedCrops = ['Maize', 'Beans', 'Potatoes', 'Vegetables'];
    weatherOutlook = 'Heavy rainfall expected. Good for most crops.';
    expectedMarketDemand = 'high';
  } else if (currentMonth >= 5 && currentMonth <= 8) {
    season = 'Dry Season (June - September)';
    recommendedCrops = ['Tomatoes', 'Kale', 'Spinach', 'Irrigation-dependent crops'];
    weatherOutlook = 'Dry conditions. Irrigation essential.';
    expectedMarketDemand = 'high';
  } else if (currentMonth >= 9 && currentMonth <= 11) {
    season = 'Short Rains Season (October - December)';
    recommendedCrops = ['Maize', 'Beans', 'Peas', 'Root vegetables'];
    weatherOutlook = 'Moderate rainfall. Good planting window.';
    expectedMarketDemand = 'medium';
  } else {
    season = 'Dry Season (January - February)';
    recommendedCrops = ['Vegetables', 'Leafy greens', 'Quick-maturing crops'];
    weatherOutlook = 'Hot and dry. Focus on hardy crops.';
    expectedMarketDemand = 'medium';
  }

  const actionItems = [
    `Prepare fields for ${recommendedCrops[0]} and ${recommendedCrops[1]}`,
    'Check and maintain irrigation systems',
    'Stock up on necessary inputs (seeds, fertilizer)',
    'Review market prices for planning',
    'Plan crop rotation to maintain soil health'
  ];

  return {
    season,
    recommendedCrops,
    reasoning: `Based on Kenya's seasonal patterns, ${season.toLowerCase()} is ideal for these crops.`,
    expectedMarketDemand,
    weatherOutlook,
    actionItems
  };
}
