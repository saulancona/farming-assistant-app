import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Target,
  AlertCircle,
  Sparkles,
  BarChart3,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
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
  generateYieldPredictions,
  generateROIAnalysis,
  generatePlantingRecommendations,
  generatePricePredictions,
  generateSeasonalInsights
} from '../services/analytics';

interface AnalyticsProps {
  fields: Field[];
  expenses: Expense[];
  income: Income[];
}

const Analytics: React.FC<AnalyticsProps> = ({ fields, expenses, income }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'yield' | 'roi' | 'planting' | 'pricing'>('overview');

  const [yieldPredictions, setYieldPredictions] = useState<YieldPrediction[]>([]);
  const [roiAnalysis, setRoiAnalysis] = useState<ROIAnalysis[]>([]);
  const [plantingRecommendations, setPlantingRecommendations] = useState<PlantingRecommendation[]>([]);
  const [pricePredictions, setPricePredictions] = useState<PricePrediction[]>([]);
  const [seasonalInsight, setSeasonalInsight] = useState<SeasonalInsight | null>(null);

  const loadAnalytics = async () => {
    try {
      const [yields, roi, planting, pricing, seasonal] = await Promise.all([
        generateYieldPredictions(fields, expenses, income),
        generateROIAnalysis(fields, expenses, income),
        generatePlantingRecommendations(fields, expenses, income),
        generatePricePredictions(fields, income),
        generateSeasonalInsights()
      ]);

      setYieldPredictions(yields);
      setRoiAnalysis(roi);
      setPlantingRecommendations(planting);
      setPricePredictions(pricing);
      setSeasonalInsight(seasonal);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [fields, expenses, income]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics();
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Analyzing your farm data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-green-600" />
            AI-Powered Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Predictive insights to optimize your farming operations
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Seasonal Insight Banner */}
      {seasonalInsight && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 mb-8"
        >
          <div className="flex items-start gap-4">
            <Calendar className="w-6 h-6 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">{seasonalInsight.season}</h3>
              <p className="mb-3 opacity-90">{seasonalInsight.reasoning}</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {seasonalInsight.recommendedCrops.map((crop, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium"
                  >
                    {crop}
                  </span>
                ))}
              </div>
              <p className="text-sm opacity-90">
                <strong>Weather:</strong> {seasonalInsight.weatherOutlook} |
                <strong className="ml-2">Market Demand:</strong> {seasonalInsight.expectedMarketDemand.toUpperCase()}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'yield', label: 'Yield Predictions', icon: TrendingUp },
          { id: 'roi', label: 'ROI Analysis', icon: DollarSign },
          { id: 'planting', label: 'Planting Recommendations', icon: Calendar },
          { id: 'pricing', label: 'Price Predictions', icon: Target }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Avg ROI</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {roiAnalysis.length > 0
                  ? `${Math.round(roiAnalysis.reduce((sum, r) => sum + r.roi, 0) / roiAnalysis.length)}%`
                  : 'N/A'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Total Predicted Yield</span>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {yieldPredictions.length > 0
                  ? `${Math.round(yieldPredictions.reduce((sum, y) => sum + y.predictedYield, 0) / 1000)}T`
                  : 'N/A'}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Fields Analyzed</span>
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{fields.length}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">Recommendations</span>
                <Lightbulb className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{plantingRecommendations.length}</p>
            </motion.div>
          </div>

          {/* Top Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Best ROI */}
            {roiAnalysis.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Best Performing Field
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{roiAnalysis[0].fieldName}</p>
                      <p className="text-sm text-gray-600">{roiAnalysis[0].cropType}</p>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {roiAnalysis[0].roi}%
                    </span>
                  </div>
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Investment:</span>
                      <span className="font-medium">KES {roiAnalysis[0].totalInvestment.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Projected Revenue:</span>
                      <span className="font-medium text-green-600">
                        KES {roiAnalysis[0].projectedRevenue.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Top Recommendation */}
            {plantingRecommendations.length > 0 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-600" />
                  Top Planting Recommendation
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-lg">
                      {plantingRecommendations[0].cropType}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {plantingRecommendations[0].reason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-700">
                      Plant by: {new Date(plantingRecommendations[0].recommendedDate).toLocaleDateString()}
                    </span>
                  </div>
                  {plantingRecommendations[0].expectedROI && (
                    <div className="pt-3 border-t border-gray-100">
                      <span className="text-sm text-gray-600">Expected ROI: </span>
                      <span className="text-lg font-bold text-green-600">
                        {plantingRecommendations[0].expectedROI}%
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Yield Predictions Tab */}
      {activeTab === 'yield' && (
        <div className="space-y-4">
          {yieldPredictions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No active fields to predict yields for.</p>
            </div>
          ) : (
            yieldPredictions.map((prediction, idx) => (
              <motion.div
                key={prediction.fieldId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{prediction.fieldName}</h3>
                    <p className="text-gray-600">{prediction.cropType}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
                    {prediction.confidence.toUpperCase()} CONFIDENCE
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Predicted Yield</p>
                    <p className="text-2xl font-bold text-green-600">
                      {prediction.predictedYield.toLocaleString()} {prediction.unit}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Harvest Date</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(prediction.estimatedHarvestDate).toLocaleDateString()}
                    </p>
                  </div>
                  {prediction.factors.historicalAverage && (
                    <div>
                      <p className="text-sm text-gray-600">Historical Avg</p>
                      <p className="text-lg font-semibold text-gray-900">
                        {Math.round(prediction.factors.historicalAverage).toLocaleString()} KES
                      </p>
                    </div>
                  )}
                  {prediction.factors.weatherImpact && (
                    <div>
                      <p className="text-sm text-gray-600">Weather Impact</p>
                      <p className={`text-lg font-semibold ${
                        prediction.factors.weatherImpact === 'positive' ? 'text-green-600' :
                        prediction.factors.weatherImpact === 'negative' ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {prediction.factors.weatherImpact}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600 mb-2">Based on:</p>
                  <div className="flex flex-wrap gap-2">
                    {prediction.basedOn.map((factor, i) => (
                      <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* ROI Analysis Tab */}
      {activeTab === 'roi' && (
        <div className="space-y-4">
          {roiAnalysis.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No investment data available for ROI analysis.</p>
            </div>
          ) : (
            roiAnalysis.map((roi, idx) => (
              <motion.div
                key={roi.fieldId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{roi.fieldName}</h3>
                    <p className="text-gray-600">{roi.cropType}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(roi.riskLevel)}`}>
                      {roi.riskLevel.toUpperCase()} RISK
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">ROI</p>
                    <p className={`text-3xl font-bold ${roi.roi >= 50 ? 'text-green-600' : roi.roi >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {roi.roi}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Investment</p>
                    <p className="text-lg font-semibold text-gray-900">
                      KES {roi.totalInvestment.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Projected Revenue</p>
                    <p className="text-lg font-semibold text-green-600">
                      KES {roi.projectedRevenue.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Profit Margin</p>
                    <p className={`text-lg font-semibold ${roi.profitMargin >= 30 ? 'text-green-600' : roi.profitMargin >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {roi.profitMargin}%
                    </p>
                  </div>
                </div>

                {roi.recommendations.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Recommendations:</p>
                    <ul className="space-y-1">
                      {roi.recommendations.map((rec, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Planting Recommendations Tab */}
      {activeTab === 'planting' && (
        <div className="space-y-4">
          {plantingRecommendations.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No planting recommendations available.</p>
            </div>
          ) : (
            plantingRecommendations.map((rec, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{rec.cropType}</h3>
                    <p className="text-gray-600 mt-1">{rec.reason}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(rec.confidence)}`}>
                    {rec.confidence.toUpperCase()} CONFIDENCE
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Recommended Date</p>
                    <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      {new Date(rec.recommendedDate).toLocaleDateString()}
                    </p>
                  </div>
                  {rec.expectedYield && (
                    <div>
                      <p className="text-sm text-gray-600">Expected Yield</p>
                      <p className="text-lg font-semibold text-green-600">
                        {rec.expectedYield} kg/acre
                      </p>
                    </div>
                  )}
                  {rec.expectedROI && (
                    <div>
                      <p className="text-sm text-gray-600">Expected ROI</p>
                      <p className="text-lg font-semibold text-green-600">
                        {rec.expectedROI}%
                      </p>
                    </div>
                  )}
                </div>

                {rec.considerations.length > 0 && (
                  <div className="pt-4 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Considerations:</p>
                    <ul className="space-y-1">
                      {rec.considerations.map((con, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-green-600 mt-1">•</span>
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Price Predictions Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-4">
          {pricePredictions.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-200">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">No pricing data available for predictions.</p>
              <p className="text-sm text-gray-500 mt-2">Record some harvest sales to see price trends.</p>
            </div>
          ) : (
            pricePredictions.map((pred, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-200"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{pred.cropType}</h3>
                    <p className="text-gray-600 mt-1">{pred.reasoning}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getConfidenceColor(pred.confidence)}`}>
                    {pred.confidence.toUpperCase()} CONFIDENCE
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Price</p>
                    <p className="text-2xl font-bold text-gray-900">
                      KES {pred.currentPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Predicted Price</p>
                    <p className={`text-2xl font-bold ${
                      pred.predictedPrice > pred.currentPrice ? 'text-green-600' :
                      pred.predictedPrice < pred.currentPrice ? 'text-red-600' : 'text-gray-900'
                    }`}>
                      KES {pred.predictedPrice.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Trend</p>
                    <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      {pred.trend === 'increasing' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : pred.trend === 'decreasing' ? (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      ) : (
                        <span className="w-5 h-0.5 bg-gray-400" />
                      )}
                      {pred.trend}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Recommendation</p>
                    <p className={`text-sm font-bold uppercase ${
                      pred.recommendation === 'sell_now' ? 'text-red-600' :
                      pred.recommendation === 'wait' ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {pred.recommendation.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-600">Timeframe: {pred.timeframe}</p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
