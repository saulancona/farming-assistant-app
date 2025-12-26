// Core types for AgroAfrica app

// ==========================================
// User Profile & Business Types (B2B Marketplace)
// ==========================================

export type UserRole = 'farmer' | 'buyer' | 'aggregator' | 'cooperative' | 'exporter';

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export type VerificationBadge =
  | 'verified_seller'      // Identity verified
  | 'verified_buyer'       // Identity verified buyer
  | 'trusted_trader'       // 10+ successful transactions
  | 'premium_seller'       // High ratings + volume
  | 'certified_organic'    // Organic certification
  | 'export_certified'     // Export quality certified
  | 'cooperative_member';  // Part of registered cooperative

export interface BusinessProfile {
  id: string;
  userId: string;

  // Business Information
  businessName?: string;
  businessType: UserRole;
  registrationNumber?: string; // Business registration number
  taxId?: string;

  // Contact & Location
  phone: string;
  whatsappNumber?: string;
  email: string;
  address?: string;
  city: string;
  region: string;
  country: string;
  coordinates?: {
    lat: number;
    lng: number;
  };

  // For Farmers/Sellers
  farmSize?: number; // in acres/hectares
  farmSizeUnit?: 'acres' | 'hectares';
  mainProducts?: string[]; // category IDs
  productionCapacity?: string; // e.g., "500 tonnes/year"
  certifications?: string[]; // organic, fair trade, etc.

  // For Buyers
  buyerType?: 'hotel' | 'restaurant' | 'supermarket' | 'processor' | 'exporter' | 'wholesaler' | 'retailer';
  averageOrderSize?: string;
  preferredProducts?: string[];

  // Verification
  verificationStatus: VerificationStatus;
  verificationBadges: VerificationBadge[];
  verifiedAt?: string;
  verificationDocuments?: string[]; // URLs to uploaded documents

  // Ratings & Reputation
  rating: number; // 0-5
  totalRatings: number;
  totalTransactions: number;
  responseRate?: number; // percentage
  responseTime?: string; // e.g., "within 2 hours"

  // Profile
  bio?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  website?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  // Metadata
  createdAt: string;
  updatedAt?: string;
  lastActiveAt?: string;
  isActive: boolean;
}

export interface SellerReview {
  id: string;
  sellerId: string;
  buyerId: string;
  buyerName: string;
  listingId?: string;

  // Ratings (1-5)
  overallRating: number;
  qualityRating: number;
  communicationRating: number;
  deliveryRating: number;

  // Review content
  title?: string;
  comment: string;
  images?: string[];

  // Transaction details
  productName?: string;
  quantity?: number;
  transactionDate?: string;

  // Response from seller
  sellerResponse?: string;
  sellerResponseAt?: string;

  // Metadata
  isVerifiedPurchase: boolean;
  helpful: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Field {
  id: string;
  name: string;
  cropType: string;
  area: number; // in acres
  plantingDate: string;
  expectedHarvest: string;
  status: 'planted' | 'growing' | 'ready' | 'harvested';
  notes?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'seeds' | 'fertilizer' | 'pesticide' | 'labor' | 'equipment' | 'fuel' | 'other';
  description: string;
  amount: number;
  fieldId?: string;
  fieldName?: string;
}

export interface WeatherData {
  current: {
    temp: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    icon: string;
  };
  forecast: Array<{
    day: string;
    high: number;
    low: number;
    condition: string;
    icon: string;
  }>;
  sprayWindow: {
    isIdeal: boolean;
    reason: string;
  };
}

export interface MarketPrice {
  commodity: string;
  price: number;
  change: number;
  unit: string;
  history: Array<{
    date: string;
    price: number;
  }>;
}

export interface LocalPriceOverride {
  id: string; // Unique identifier for this price entry
  commodity: string;
  price: number;
  unit: string;
  marketName: string; // e.g., "Nairobi Central Market"
  userName: string; // Name of the user who entered the price
  updatedAt: string;
  notes?: string;
}

export interface DashboardStats {
  totalFields: number;
  activeFields: number;
  totalArea: number;
  monthlyExpenses: number;
  estimatedRevenue: number;
  expenseChange: number;
}

// Phase 2 Types

export interface Income {
  id: string;
  date: string;
  source: 'harvest_sale' | 'livestock_sale' | 'contract' | 'grant' | 'other';
  description: string;
  amount: number;
  fieldId?: string;
  fieldName?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  fieldId?: string;
  fieldName?: string;
  assignedTo?: string;
  completedAt?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'seeds' | 'fertilizer' | 'pesticide' | 'equipment' | 'fuel' | 'tools' | 'harvest' | 'other';
  quantity: number;
  unit: string;
  minQuantity: number;
  costPerUnit?: number;
  supplier?: string;
  notes?: string;
  fieldId?: string; // Link to field for harvest items
  harvestDate?: string; // Date of harvest
}

export interface StorageBin {
  id: string;
  name: string;
  type: 'grain' | 'equipment' | 'general' | 'cold_storage';
  capacity: number;
  currentQuantity: number;
  unit: string;
  commodity?: string;
  location?: string;
  notes?: string;
}

// Phase 3 Types - Community Features

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  type: 'question' | 'tip' | 'success_story' | 'discussion';
  title: string;
  content: string;
  tags?: string[];
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  updatedAt?: string;
  // Client-side only fields
  isLiked?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  isLiked?: boolean;
}

export interface FarmerProfile {
  id: string;
  name: string;
  location: string;
  farmSize?: number;
  mainCrops?: string[];
  experienceYears?: number;
  bio?: string;
  avatarUrl?: string;
  joinedAt: string;
  postsCount: number;
  helpfulCount: number; // Number of times marked as helpful
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: 'planting' | 'pest_control' | 'irrigation' | 'harvesting' | 'marketing' | 'general';
  crops?: string[];
  author: string;
  imageUrl?: string;
  createdAt: string;
  views: number;
  likes: number;
  isBookmarked?: boolean;
  isLiked?: boolean; // Client-side field for tracking if user liked this article
}

// Learning Videos for Knowledge Base
export interface LearningVideo {
  id: string;
  title: string;
  description: string;
  category: 'planting' | 'pest_control' | 'irrigation' | 'harvesting' | 'marketing' | 'general' | 'livestock' | 'equipment';
  videoUrl: string; // YouTube, Vimeo, or direct video URL
  thumbnailUrl?: string; // Custom thumbnail (optional)
  duration: string; // e.g., "5:30", "12:45"
  durationSeconds?: number; // Duration in seconds for progress tracking
  instructor?: string;
  crops?: string[]; // Related crops
  language: string; // e.g., "en", "sw", "fr"
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  views: number;
  likes: number;
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt: string;
  tags?: string[];
}

// ==========================================
// Learning Progress Types
// ==========================================

export interface VideoProgress {
  id: string;
  userId: string;
  videoId: string;
  watchTimeSeconds: number;
  totalDurationSeconds: number;
  percentageWatched: number;
  resumePositionSeconds: number;
  completed: boolean;
  completedAt?: string;
  lastWatchedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleProgress {
  id: string;
  userId: string;
  articleId: string;
  readingTimeSeconds: number;
  scrollPercentage: number;
  completed: boolean;
  completedAt?: string;
  lastReadAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface LearningStats {
  totalArticlesStarted: number;
  articlesCompleted: number;
  totalVideosStarted: number;
  videosCompleted: number;
  totalReadingTimeMinutes: number;
  totalWatchTimeMinutes: number;
  articleCompletionRate: number;
  videoCompletionRate: number;
}

// ==========================================
// Rewards & Gamification Types
// ==========================================

export type XPActionType =
  | 'daily_login'
  | 'article_complete'
  | 'video_complete'
  | 'task_complete'
  | 'field_add'
  | 'expense_add'
  | 'income_add'
  | 'community_post'
  | 'marketplace_listing'
  | 'achievement_unlock';

export interface UserLevel {
  level: number;
  name: string;
  nameSw: string;
  xpRequired: number;
  icon: string;
  color: string;
}

export interface UserRewardsProfile {
  id: string;
  userId: string;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  articlesCompleted: number;
  videosCompleted: number;
  tasksCompleted: number;
  fieldsCount: number;
  postsCount: number;
  listingsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserXPLog {
  id: string;
  userId: string;
  action: string;
  actionSw?: string;
  xpAmount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DailyStreak {
  id: string;
  userId: string;
  streakDate: string;
  xpEarned: number;
  createdAt: string;
}

export type AchievementCategory = 'learning' | 'farming' | 'community' | 'marketplace' | 'streaks' | 'milestones';
export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  nameSw: string;
  description: string;
  descriptionSw: string;
  category: AchievementCategory;
  icon: string;
  xpReward: number;
  requirementType: 'count' | 'streak' | 'xp_total';
  requirementValue: number;
  requirementField?: string;
  tier: AchievementTier;
  createdAt: string;
}

export interface UserAchievement {
  id: string;
  userId: string;
  achievementId: string;
  progress: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Joined from achievements table
  achievement?: Achievement;
}

export interface LeaderboardEntry {
  userId: string;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  rank: number;
  // Joined user info
  userName?: string;
  userAvatar?: string;
}

export interface XPAwardResult {
  newTotalXp: number;
  newLevel: number;
  levelUp: boolean;
  xpAwarded: number;
  action: string;
}

export interface StreakUpdateResult {
  currentStreak: number;
  streakXp: number;
  isNewDay: boolean;
}

// Enhanced Streak System Types
export type StreakActivityType =
  | 'weather_check'
  | 'price_check'
  | 'task_complete'
  | 'photo_upload'
  | 'field_update'
  | 'expense_logged'
  | 'income_logged'
  | 'community_post'
  | 'learning_complete'
  | 'mission_step'
  | 'streak_save'
  | 'app_open';

export interface StreakActivity {
  type: StreakActivityType;
  name: string;
  nameSw?: string;
  time: string;
}

export interface StreakMilestone {
  id: string;
  streakDays: number;
  rewardType: 'voice_tip' | 'badge' | 'points' | 'raffle';
  rewardValue: number;
  badgeId?: string;
  voiceTipKey?: string;
  name: string;
  nameSw: string;
  description: string;
  descriptionSw: string;
  icon: string;
}

export interface NextMilestone {
  days: number;
  daysRemaining: number;
  name: string;
  nameSw: string;
  rewardType: string;
  rewardValue: number;
  icon: string;
}

export interface RecentMilestoneClaim {
  milestoneDays: number;
  name: string;
  nameSw: string;
  rewardType: string;
  rewardValue: number;
  icon: string;
  claimedAt: string;
}

export interface StreakStatus {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string;
  streakAtRisk: boolean;
  canSaveStreak: boolean;
  streakSavesUsed: number;
  lastStreakSave?: string;
  monthlyRaffleEntries: number;
  activitiesToday: StreakActivity[];
  nextMilestone?: NextMilestone;
  recentMilestones: RecentMilestoneClaim[];
}

export interface RecordActivityResult {
  success: boolean;
  currentStreak: number;
  isFirstActivityToday: boolean;
  streakXpAwarded: number;
  activitiesToday: number;
  wasStreakBroken: boolean;
  milestonesClaimed: string[];
}

export interface SaveStreakResult {
  success: boolean;
  error?: string;
  reason?: string;
  streakSaved?: number;
  message?: string;
  xpAwarded?: number;
}

export interface StreakVoiceTip {
  key: string;
  title: string;
  titleSw: string;
  content: string;
  contentSw: string;
  audioUrl?: string;
  audioUrlSw?: string;
  category: string;
}

// Phase 3 Types - Messaging Features

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
  read: boolean;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  participantNames?: string[]; // Enriched at runtime from user_profiles
  lastMessage?: string;
  lastMessageAt: string;
  unreadCount?: number; // Not stored in DB, calculated from messages
}

// Marketplace Types

export interface MarketplaceListing {
  id: string;
  userId: string;
  userName: string;
  userLocation?: string;
  userContact?: string;

  // Seller profile info (joined from business_profiles)
  sellerBusinessName?: string;
  sellerBusinessType?: UserRole;
  sellerRating?: number;
  sellerTotalRatings?: number;
  sellerVerificationStatus?: VerificationStatus;
  sellerBadges?: VerificationBadge[];
  sellerWhatsapp?: string;

  // Category-based product selection
  categoryId: string;
  subcategoryId: string;
  productName: string; // Display name (from subcategory or custom)
  variety?: string;
  quantity: number;
  unit: 'kg' | 'bags' | 'tonnes' | 'crates' | 'bunches' | 'pieces' | 'boxes' | 'litres' | 'trays' | 'punnets' | 'bales' | 'bundles' | 'packets';
  pricePerUnit: number;
  totalPrice: number;
  quality: 'premium' | 'grade_a' | 'grade_b' | 'standard';
  harvestDate: string;
  availableFrom: string;
  description?: string;
  images?: string[];
  location: string;
  deliveryAvailable: boolean;
  deliveryRadius?: number; // in km
  minimumOrder?: number; // Minimum order quantity
  status: 'active' | 'sold' | 'reserved' | 'expired';
  createdAt: string;
  updatedAt?: string;
  expiresAt?: string;
  viewsCount: number;
  // Client-side fields
  isOwner?: boolean;
  // Legacy field for backwards compatibility
  cropType?: string;
}

// Analytics & Predictions Types

export interface YieldPrediction {
  fieldId: string;
  fieldName: string;
  cropType: string;
  predictedYield: number;
  unit: string;
  confidence: 'low' | 'medium' | 'high';
  basedOn: string[];
  factors: {
    historicalAverage?: number;
    weatherImpact?: 'positive' | 'neutral' | 'negative';
    seasonalTrend?: 'peak' | 'normal' | 'off-season';
  };
  estimatedHarvestDate: string;
}

export interface PlantingRecommendation {
  cropType: string;
  recommendedDate: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
  expectedYield?: number;
  expectedROI?: number;
  considerations: string[];
}

export interface PricePrediction {
  cropType: string;
  currentPrice: number;
  predictedPrice: number;
  timeframe: string; // e.g., "next month", "3 months"
  trend: 'increasing' | 'stable' | 'decreasing';
  confidence: 'low' | 'medium' | 'high';
  recommendation: 'sell_now' | 'wait' | 'wait_and_monitor';
  reasoning: string;
}

export interface ROIAnalysis {
  fieldId: string;
  fieldName: string;
  cropType: string;
  totalInvestment: number;
  projectedRevenue: number;
  projectedProfit: number;
  roi: number; // percentage
  breakEvenDate?: string;
  profitMargin: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface SeasonalInsight {
  season: string;
  recommendedCrops: string[];
  reasoning: string;
  expectedMarketDemand: 'high' | 'medium' | 'low';
  weatherOutlook: string;
  actionItems: string[];
}

// Weather Alerts Types

export interface WeatherAlert {
  id: string;
  type: 'frost' | 'drought' | 'storm' | 'heat_wave' | 'flood' | 'hail' | 'wind';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendations: string[];
  startTime: string;
  endTime?: string;
  affectedCrops?: string[];
  isActive: boolean;
}

export interface WeatherDataExtended extends WeatherData {
  alerts: WeatherAlert[];
  historicalComparison?: {
    tempDifference: number; // vs 30-day average
    rainDifference: number; // vs 30-day average
  };
}

// Calendar Types

export interface CalendarEvent {
  id: string;
  type: 'task' | 'planting' | 'harvest' | 'weather_alert' | 'market' | 'spray' | 'fertilize' | 'irrigation';
  title: string;
  description?: string;
  date: string;
  endDate?: string;
  time?: string;
  color: string;
  fieldId?: string;
  fieldName?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  relatedId?: string; // ID of related task, field, etc.
  reminder?: {
    enabled: boolean;
    daysBefore: number;
  };
}

export interface CalendarView {
  type: 'month' | 'week' | 'day';
  currentDate: Date;
  events: CalendarEvent[];
}

// ==========================================
// Saved Searches & Alerts
// ==========================================

export interface SavedSearchCriteria {
  query?: string;
  categoryId?: string;
  subcategoryId?: string;
  location?: string;
  priceMin?: number;
  priceMax?: number;
  quality?: string;
  deliveryOnly?: boolean;
  verifiedOnly?: boolean;
}

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  description?: string;
  criteria: SavedSearchCriteria;
  alertsEnabled: boolean;
  alertFrequency: 'instant' | 'daily' | 'weekly';
  alertMethod: 'in_app' | 'email' | 'sms' | 'whatsapp';
  lastCheckedAt?: string;
  lastAlertSentAt?: string;
  newMatchesCount: number;
  totalMatchesFound: number;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface SearchMatchHistory {
  id: string;
  savedSearchId: string;
  listingId: string;
  matchedAt: string;
  isViewed: boolean;
  viewedAt?: string;
}

// ==========================================
// Shopping Cart & Orders
// ==========================================

export interface CartItem {
  id: string;
  listingId: string;
  listing: MarketplaceListing;
  quantity: number;
  priceAtAdd: number; // Price when added to cart (in case it changes)
  addedAt: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export type PaymentMethod = 'mpesa' | 'bank_transfer' | 'cash_on_delivery' | 'credit';

export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItem {
  id: string;
  listingId: string;
  productName: string;
  variety?: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  totalPrice: number;
  sellerId: string;
  sellerName: string;
  sellerPhone?: string;
  sellerWhatsapp?: string;
}

export interface DeliveryDetails {
  method: 'pickup' | 'delivery';
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  instructions?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // Human-readable order number e.g., "AGR-2024-0001"
  userId: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;

  // Order items (grouped by seller)
  items: OrderItem[];

  // Delivery
  delivery: DeliveryDetails;

  // Pricing
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  total: number;

  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;

  // Status
  status: OrderStatus;
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: string;
    note?: string;
  }>;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;
}

// ==========================================
// Agra Gamification Types
// ==========================================

// Farmer Score (Trust Score)
export type FarmerScoreTier = 'bronze' | 'silver' | 'gold' | 'champion';

export interface FarmerScore {
  id: string;
  userId: string;
  learningScore: number; // 0-25
  missionScore: number; // 0-25
  engagementScore: number; // 0-25
  reliabilityScore: number; // 0-25
  totalScore: number; // 0-100
  tier: FarmerScoreTier;
  photoUploadsCount: number;
  dataQualityScore: number;
  updatedAt: string;
  createdAt: string;
}

// Referral System
export type ReferralStatus = 'pending' | 'activated' | 'rewarded';
export type ReferralTier = 'starter' | 'recruiter' | 'champion' | 'legend';

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  referrerId: string;
  referredId: string;
  referralCode: string;
  status: ReferralStatus;
  activationAction?: string;
  referrerXpAwarded: number;
  referrerPointsAwarded: number;
  referredXpAwarded: number;
  referredPointsAwarded: number;
  createdAt: string;
  activatedAt?: string;
  rewardedAt?: string;
  // Joined fields
  referredName?: string;
  referredAvatar?: string;
}

export interface ReferralMilestone {
  id: string;
  userId: string;
  totalReferrals: number;
  activatedReferrals: number;
  currentTier: ReferralTier;
  milestone3Claimed: boolean;
  milestone10Claimed: boolean;
  milestone25Claimed: boolean;
  milestone50Claimed: boolean;
  milestone100Claimed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralLeaderboardEntry {
  userId: string;
  fullName?: string;
  avatarUrl?: string;
  totalReferrals: number;
  activatedReferrals: number;
  currentTier: ReferralTier;
  rank: number;
}

// Seasonal Missions
export type MissionStatus = 'active' | 'completed' | 'failed' | 'abandoned';
export type MissionStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

export type WeatherTrigger = 'rain_expected' | 'dry_spell' | 'frost_warning' | 'heat_wave' | null;

export interface MissionStepDefinition {
  name: string;
  name_sw?: string;
  description: string;
  description_sw?: string;
  day_offset: number;
  xp_reward?: number;
  weather_trigger?: WeatherTrigger;
  photo_required?: boolean;
}

export interface SeasonalMission {
  id: string;
  name: string;
  nameSw?: string;
  description: string;
  descriptionSw?: string;
  cropType?: string;
  season: string;
  steps: MissionStepDefinition[];
  xpReward: number;
  pointsReward: number;
  badgeId?: string;
  durationDays: number;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  createdAt: string;
}

export interface UserMission {
  id: string;
  userId: string;
  missionId: string;
  fieldId?: string;
  status: MissionStatus;
  currentStep: number;
  totalSteps: number;
  progressPercentage: number;
  startedAt: string;
  targetDate: string;
  completedAt?: string;
  xpEarned: number;
  pointsEarned: number;
  // Completion rewards
  badgeAwarded?: boolean;
  priorityMarketAccessUntil?: string;
  doubleReferralPointsUntil?: string;
  // Joined fields
  missionName?: string;
  missionNameSw?: string;
  missionDescription?: string;
  cropType?: string;
  season?: string;
  missionXpReward?: number;
  missionPointsReward?: number;
  difficulty?: string;
  fieldName?: string;
}

export interface MissionStepProgress {
  id: string;
  userMissionId: string;
  stepIndex: number;
  stepName: string;
  stepDescription?: string;
  status: MissionStepStatus;
  dueDate?: string;
  completedAt?: string;
  evidencePhotoUrl?: string;
  notes?: string;
  xpAwarded: number;
  // Weather-triggered automation
  weatherTrigger?: WeatherTrigger;
  autoReminded?: boolean;
  reminderSentAt?: string;
}

// Weekly Challenges
export type ChallengeType = 'photo' | 'activity' | 'learning' | 'marketplace' | 'community';
export type ChallengeStatus = 'active' | 'completed' | 'expired';

export interface WeeklyChallenge {
  id: string;
  name: string;
  nameSw?: string;
  description: string;
  descriptionSw?: string;
  challengeType: ChallengeType;
  targetAction: string;
  targetCount: number;
  xpReward: number;
  pointsReward: number;
  badgeId?: string;
  startDate?: string;
  endDate?: string;
  isRecurring: boolean;
  recurrencePattern?: string;
  isActive: boolean;
  createdAt: string;
}

export interface UserChallengeProgress {
  id: string;
  userId: string;
  challengeId: string;
  currentProgress: number;
  targetProgress: number;
  status: ChallengeStatus;
  startedAt: string;
  completedAt?: string;
  xpAwarded: number;
  pointsAwarded: number;
  // Joined fields
  challengeName?: string;
  challengeNameSw?: string;
  challengeDescription?: string;
  challengeType?: ChallengeType;
  challengeXpReward?: number;
  challengePointsReward?: number;
  startDate?: string;
  endDate?: string;
}

// Photo Submissions
export type PhotoType = 'pest' | 'crop' | 'soil' | 'harvest' | 'field' | 'other';

export interface PhotoSubmission {
  id: string;
  userId: string;
  challengeId?: string;
  fieldId?: string;
  photoUrl: string;
  photoType: PhotoType;
  aiConfidenceScore?: number;
  aiDetectedIssue?: string;
  aiRecommendations?: Record<string, unknown>;
  xpAwarded: number;
  pointsAwarded: number;
  submittedAt: string;
  reviewedAt?: string;
  isVerified: boolean;
}

// Rewards Shop
export type RewardCategory = 'seeds' | 'fertilizer' | 'tools' | 'vouchers' | 'services';
export type RedemptionStatus = 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

export interface RewardItem {
  id: string;
  name: string;
  nameSw?: string;
  description?: string;
  descriptionSw?: string;
  category: RewardCategory;
  pointsCost: number;
  stockQuantity: number; // -1 means unlimited
  imageUrl?: string;
  partnerName?: string;
  termsConditions?: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRedemption {
  id: string;
  userId: string;
  itemId: string;
  quantity: number;
  pointsSpent: number;
  status: RedemptionStatus;
  redemptionCode?: string;
  deliveryAddress?: string;
  deliveryPhone?: string;
  deliveryNotes?: string;
  adminNotes?: string;
  createdAt: string;
  processedAt?: string;
  deliveredAt?: string;
  // Joined fields
  itemName?: string;
  itemNameSw?: string;
  itemCategory?: RewardCategory;
  itemImageUrl?: string;
}

// User Points (Redeemable currency separate from XP)
export interface UserPoints {
  id: string;
  userId: string;
  totalPoints: number;
  lifetimePoints: number;
  updatedAt: string;
}

export type PointsTransactionType = 'earn' | 'redeem';

export interface PointsTransaction {
  id: string;
  userId: string;
  amount: number;
  transactionType: PointsTransactionType;
  source: string;
  referenceId?: string;
  description?: string;
  createdAt: string;
}

// API Result Types
export interface AwardPointsResult {
  success: boolean;
  newTotal: number;
  amountAwarded: number;
  error?: string;
}

export interface RedeemPointsResult {
  success: boolean;
  redemptionId?: string;
  redemptionCode?: string;
  pointsSpent?: number;
  error?: string;
}

export interface StartMissionResult {
  success: boolean;
  userMissionId?: string;
  totalSteps?: number;
  error?: string;
}

export interface CompleteMissionStepResult {
  success: boolean;
  missionCompleted: boolean;
  progress?: number;
  xpAwarded: number;
  pointsAwarded?: number;
  // Mission completion rewards
  badgeAwarded?: boolean;
  priorityMarketAccessUntil?: string;
  doubleReferralPointsUntil?: string;
  error?: string;
}

// Recommended missions based on user's fields and weather
export interface RecommendedMission {
  id: string;
  name: string;
  nameSw?: string;
  description: string;
  descriptionSw?: string;
  cropType?: string;
  season: string;
  xpReward: number;
  pointsReward: number;
  durationDays: number;
  difficulty: 'easy' | 'medium' | 'hard';
  matchedFieldId?: string;
  matchedFieldName?: string;
  matchScore: number; // 0-100 relevance score
  reason: string;
  reasonSw?: string;
}

// User's active reward bonuses
export interface UserRewardBonuses {
  hasPriorityMarketAccess: boolean;
  priorityMarketAccessUntil?: string;
  hasDoubleReferralPoints: boolean;
  doubleReferralPointsUntil?: string;
  activeBonusMissions: string[]; // mission IDs that granted active bonuses
}

export interface ProcessReferralResult {
  success: boolean;
  referrerId?: string;
  error?: string;
}

export interface ActivateReferralResult {
  success: boolean;
  referrerId?: string;
  xpAwarded?: number;
  pointsAwarded?: number;
  error?: string;
}

export interface CheckMilestonesResult {
  success: boolean;
  pointsAwarded: number;
  milestonesClaimed: string[];
  newTier?: ReferralTier;
  error?: string;
}

export interface CalculateFarmerScoreResult {
  learningScore: number;
  missionScore: number;
  engagementScore: number;
  reliabilityScore: number;
  totalScore: number;
  tier: FarmerScoreTier;
}

// ==========================================
// Photo Challenges & Diagnostic Rewards Types
// ==========================================

export type PhotoChallengeThemeType =
  | 'pest_patrol'
  | 'nutrient_deficiency'
  | 'disease_detection'
  | 'growth_tracking'
  | 'harvest_quality';

export type AISeverity = 'none' | 'low' | 'medium' | 'high' | 'critical';
export type ChallengePhotoType = 'pest' | 'disease' | 'nutrient' | 'growth' | 'harvest' | 'general';

export interface PhotoChallengeTheme {
  id: string;
  name: string;
  nameSw: string;
  description: string;
  descriptionSw: string;
  themeType: PhotoChallengeThemeType;
  targetPhotosPerDay: number;
  durationDays: number;
  xpPerPhoto: number;
  bonusXpClearPhoto: number;
  bonusXpEarlyDetection: number;
  bonusXpCorrectId: number;
  pointsPerPhoto: number;
  badgeId?: string;
  isRecurring: boolean;
  createdAt: string;
}

export interface WeeklyPhotoChallenge {
  id: string;
  themeId: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  totalParticipants: number;
  createdAt: string;
  // Joined theme info
  themeName?: string;
  themeNameSw?: string;
  themeDescription?: string;
  themeDescriptionSw?: string;
  themeType?: PhotoChallengeThemeType;
  targetPhotosPerDay?: number;
  durationDays?: number;
  xpPerPhoto?: number;
  bonusXpClear?: number;
  bonusXpEarly?: number;
  bonusXpCorrect?: number;
  pointsPerPhoto?: number;
}

export interface UserPhotoChallengeProgress {
  id: string;
  userId: string;
  challengeId: string;
  photosSubmitted: number;
  photosTarget: number;
  streakDays: number;
  lastPhotoDate?: string;
  totalXpEarned: number;
  totalPointsEarned: number;
  status: 'active' | 'completed' | 'expired';
  completedAt?: string;
  createdAt: string;
}

export interface ChallengePhotoSubmission {
  id: string;
  userId: string;
  challengeId: string;
  fieldId?: string;
  cropType?: string;
  photoUrl: string;
  photoType: ChallengePhotoType;
  // AI Analysis
  aiConfidenceScore: number;
  aiDetectedIssue?: string;
  aiSeverity: AISeverity;
  isEarlyDetection: boolean;
  isClearPhoto: boolean;
  isCorrectIdentification: boolean;
  // Rewards
  baseXpAwarded: number;
  bonusXpAwarded: number;
  pointsAwarded: number;
  submittedAt: string;
  reviewedAt?: string;
}

export interface CropPhotoCoverage {
  cropType: string;
  totalPhotos: number;
  hasPestPhoto: boolean;
  hasDiseasePhoto: boolean;
  hasNutrientPhoto: boolean;
  hasGrowthPhoto: boolean;
  coverageComplete: boolean;
  lastPhotoDate?: string;
}

export interface UserCropPhotoCoverage {
  id: string;
  userId: string;
  cropType: string;
  totalPhotos: number;
  lastPhotoDate?: string;
  hasPestPhoto: boolean;
  hasDiseasePhoto: boolean;
  hasNutrientPhoto: boolean;
  hasGrowthPhoto: boolean;
  coverageComplete: boolean;
  updatedAt: string;
}

export interface ActivePhotoChallenge {
  challengeId: string;
  themeName: string;
  themeNameSw: string;
  themeDescription: string;
  themeDescriptionSw: string;
  themeType: PhotoChallengeThemeType;
  targetPhotosPerDay: number;
  durationDays: number;
  xpPerPhoto: number;
  bonusXpClear: number;
  bonusXpEarly: number;
  bonusXpCorrect: number;
  pointsPerPhoto: number;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  totalParticipants: number;
  // User progress
  userPhotosSubmitted: number;
  userPhotosTarget: number;
  userStreakDays: number;
  userTotalXp: number;
  userStatus: 'active' | 'completed' | 'expired';
}

export interface UserPhotoStats {
  totalPhotos: number;
  cropsCovered: number;
  cropsComplete: number;
  cropCoverage: CropPhotoCoverage[];
  challengesCompleted: number;
  challengesActive: number;
  totalChallengeXp: number;
  totalChallengePoints: number;
  bestStreak: number;
}

export interface PhotoChallengeLeaderboardEntry {
  userId: string;
  fullName?: string;
  avatarUrl?: string;
  totalPhotos: number;
  totalXp: number;
  totalPoints: number;
  earlyDetections: number;
  correctIds: number;
  lastSubmission?: string;
  rank: number;
}

export interface SubmitPhotoResult {
  success: boolean;
  submissionId?: string;
  baseXp: number;
  bonusXp: number;
  totalXp: number;
  points: number;
  bonuses: {
    clearPhoto: boolean;
    earlyDetection: boolean;
    correctIdentification: boolean;
  };
  error?: string;
}

export interface PhotoBonusInfo {
  type: 'clear_photo' | 'early_detection' | 'correct_identification';
  name: string;
  nameSw: string;
  description: string;
  descriptionSw: string;
  xpBonus: number;
  pointsBonus: number;
  icon: string;
}

// ==========================================
// Learning Leaderboard Types
// ==========================================

export interface LearningLeaderboardEntry {
  userId: string;
  fullName?: string;
  avatarUrl?: string;
  articlesCompleted: number;
  videosCompleted: number;
  totalLessons: number;
  totalXp: number;
  quizzesPassed: number;
  currentStreak: number;
  lastActivityDate?: string;
  rank: number;
}

// ==========================================
// Team Challenges Types
// ==========================================

export type TeamType = 'church' | 'coop' | 'youth_group' | 'village' | 'school' | 'other';
export type TeamRole = 'leader' | 'member';
export type TeamChallengeStatus = 'active' | 'completed' | 'failed' | 'expired';

export interface Team {
  id: string;
  name: string;
  nameSw?: string;
  description?: string;
  descriptionSw?: string;
  teamType: TeamType;
  leaderId: string;
  inviteCode: string;
  avatarUrl?: string;
  location?: string;
  isActive: boolean;
  maxMembers: number;
  createdAt: string;
  updatedAt?: string;
}

export interface TeamMember {
  userId: string;
  role: TeamRole;
  joinedAt: string;
  fullName?: string;
}

export interface TeamStats {
  totalMembers: number;
  totalXp: number;
  totalReferrals: number;
  lessonsCompleted: number;
  missionsCompleted: number;
  photosSubmitted: number;
  challengesCompleted: number;
}

export interface TeamAchievement {
  name: string;
  nameSw?: string;
  icon: string;
  description?: string;
  descriptionSw?: string;
  earnedAt: string;
}

export interface TeamDetails extends Team {
  stats: TeamStats;
  members: TeamMember[];
  achievements: TeamAchievement[];
}

export interface TeamChallenge {
  challengeId: string;
  name: string;
  nameSw?: string;
  description?: string;
  descriptionSw?: string;
  challengeType: string;
  targetCount: number;
  xpReward: number;
  pointsReward: number;
  badgeName?: string;
  badgeIcon?: string;
  startDate: string;
  endDate: string;
  currentProgress: number;
  status: TeamChallengeStatus;
}

export interface TeamLeaderboardEntry {
  teamId: string;
  name: string;
  nameSw?: string;
  teamType: TeamType;
  avatarUrl?: string;
  location?: string;
  totalMembers: number;
  totalXp: number;
  totalReferrals: number;
  challengesCompleted: number;
  rank: number;
}

// Team Group Chat Types
export type TeamMessageType = 'text' | 'image' | 'system';

export interface TeamMessage {
  id: string;
  teamId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: TeamMessageType;
  createdAt: string;
  senderRole?: TeamRole;
  senderAvatarUrl?: string;
}

// ==========================================
// STORY QUESTS (Crop Journey Documentation)
// ==========================================

export type StoryMilestoneType =
  | 'land_before'    // Land before planting
  | 'germination'    // Germination stage
  | 'flowering'      // Flowering stage
  | 'pre_harvest'    // Before harvest
  | 'storage';       // Final storage/harvest

export type StoryQuestStatus = 'active' | 'completed' | 'abandoned' | 'expired';

export interface StoryQuestTemplate {
  id: string;
  name: string;
  nameSw?: string;
  description?: string;
  descriptionSw?: string;
  cropType: string;
  pointsReward: number;
  xpReward: number;
  badgeName: string;
  badgeIcon: string;
  expectedDays: number;
  grantsPriorityAccess: boolean;
  featureStoryEligible: boolean;
}

export interface StoryQuestPhoto {
  id: string;
  milestoneType: StoryMilestoneType;
  milestoneOrder: number;
  photoUrl: string;
  caption?: string;
  uploadedAt: string;
  aiHealthScore?: number;
  aiIssues?: string[];
}

export interface UserStoryQuest {
  id: string;
  templateId: string;
  fieldId?: string;
  status: StoryQuestStatus;
  milestonesCompleted: number;
  startedAt: string;
  targetDate: string;
  completedAt?: string;
  pointsAwarded: number;
  xpAwarded: number;
  badgeAwarded: boolean;
  priorityAccessGranted: boolean;
  priorityAccessExpires?: string;
  template: StoryQuestTemplate;
  photos: StoryQuestPhoto[];
}

export interface FeaturedStory {
  id: string;
  title: string;
  titleSw?: string;
  summary?: string;
  summarySw?: string;
  viewCount: number;
  likeCount: number;
  publishedAt: string;
  farmer: {
    id: string;
    name: string;
    avatarUrl?: string;
    location?: string;
  };
  quest: {
    cropType: string;
    completedAt: string;
  };
  photos: {
    milestoneType: StoryMilestoneType;
    photoUrl: string;
  }[];
}

export interface PriorityBuyerAccess {
  hasAccess: boolean;
  expiresAt?: string;
  connectionsUsed?: number;
  message?: string;
}

