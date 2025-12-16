/**
 * User Roles and Verification Badge Constants
 * For the AgroAfrica B2B Marketplace
 */

import type { UserRole, VerificationBadge, VerificationStatus } from '../types';

// ==========================================
// User Roles
// ==========================================

export interface RoleInfo {
  id: UserRole;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const USER_ROLES: Record<UserRole, RoleInfo> = {
  farmer: {
    id: 'farmer',
    name: 'Farmer',
    description: 'Individual farmer or smallholder selling produce',
    icon: '🌾',
    color: 'green'
  },
  buyer: {
    id: 'buyer',
    name: 'Buyer',
    description: 'Business purchasing agricultural products',
    icon: '🛒',
    color: 'blue'
  },
  aggregator: {
    id: 'aggregator',
    name: 'Aggregator',
    description: 'Collects and consolidates produce from multiple farmers',
    icon: '📦',
    color: 'purple'
  },
  cooperative: {
    id: 'cooperative',
    name: 'Cooperative',
    description: 'Farmer cooperative or association',
    icon: '🤝',
    color: 'teal'
  },
  exporter: {
    id: 'exporter',
    name: 'Exporter',
    description: 'Exports agricultural products internationally',
    icon: '🌍',
    color: 'indigo'
  }
};

// ==========================================
// Buyer Types
// ==========================================

export const BUYER_TYPES = {
  hotel: { id: 'hotel', name: 'Hotel', icon: '🏨' },
  restaurant: { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  supermarket: { id: 'supermarket', name: 'Supermarket', icon: '🏪' },
  processor: { id: 'processor', name: 'Food Processor', icon: '🏭' },
  exporter: { id: 'exporter', name: 'Exporter', icon: '🚢' },
  wholesaler: { id: 'wholesaler', name: 'Wholesaler', icon: '📦' },
  retailer: { id: 'retailer', name: 'Retailer', icon: '🏬' }
} as const;

// ==========================================
// Verification Badges
// ==========================================

export interface BadgeInfo {
  id: VerificationBadge;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  criteria: string;
}

export const VERIFICATION_BADGES: Record<VerificationBadge, BadgeInfo> = {
  verified_seller: {
    id: 'verified_seller',
    name: 'Verified Seller',
    description: 'Identity and business verified',
    icon: '✓',
    color: 'text-blue-700',
    bgColor: 'bg-blue-100',
    criteria: 'Submit valid ID and business registration'
  },
  verified_buyer: {
    id: 'verified_buyer',
    name: 'Verified Buyer',
    description: 'Identity and business verified',
    icon: '✓',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    criteria: 'Submit valid ID and business registration'
  },
  trusted_trader: {
    id: 'trusted_trader',
    name: 'Trusted Trader',
    description: 'Completed 10+ successful transactions',
    icon: '★',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-100',
    criteria: 'Complete 10+ transactions with 4+ star ratings'
  },
  premium_seller: {
    id: 'premium_seller',
    name: 'Premium Seller',
    description: 'Top-rated seller with high volume',
    icon: '👑',
    color: 'text-purple-700',
    bgColor: 'bg-purple-100',
    criteria: '50+ transactions, 4.5+ rating, <2hr response time'
  },
  certified_organic: {
    id: 'certified_organic',
    name: 'Certified Organic',
    description: 'Products are certified organic',
    icon: '🌿',
    color: 'text-green-700',
    bgColor: 'bg-green-100',
    criteria: 'Submit valid organic certification'
  },
  export_certified: {
    id: 'export_certified',
    name: 'Export Certified',
    description: 'Meets international export standards',
    icon: '🌍',
    color: 'text-indigo-700',
    bgColor: 'bg-indigo-100',
    criteria: 'Submit phytosanitary and export certificates'
  },
  cooperative_member: {
    id: 'cooperative_member',
    name: 'Cooperative Member',
    description: 'Member of a registered cooperative',
    icon: '🤝',
    color: 'text-teal-700',
    bgColor: 'bg-teal-100',
    criteria: 'Verification from registered cooperative'
  }
};

// ==========================================
// Verification Status
// ==========================================

export interface StatusInfo {
  id: VerificationStatus;
  name: string;
  description: string;
  color: string;
  bgColor: string;
}

export const VERIFICATION_STATUS: Record<VerificationStatus, StatusInfo> = {
  unverified: {
    id: 'unverified',
    name: 'Unverified',
    description: 'Profile not yet verified',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100'
  },
  pending: {
    id: 'pending',
    name: 'Pending',
    description: 'Verification in progress',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100'
  },
  verified: {
    id: 'verified',
    name: 'Verified',
    description: 'Profile verified',
    color: 'text-green-600',
    bgColor: 'bg-green-100'
  },
  rejected: {
    id: 'rejected',
    name: 'Rejected',
    description: 'Verification rejected',
    color: 'text-red-600',
    bgColor: 'bg-red-100'
  }
};

// ==========================================
// Certifications
// ==========================================

export const CERTIFICATIONS = [
  { id: 'organic', name: 'Organic Certified', icon: '🌿' },
  { id: 'fair_trade', name: 'Fair Trade', icon: '🤝' },
  { id: 'rainforest_alliance', name: 'Rainforest Alliance', icon: '🌳' },
  { id: 'global_gap', name: 'GlobalGAP', icon: '✅' },
  { id: 'haccp', name: 'HACCP', icon: '🔬' },
  { id: 'iso_22000', name: 'ISO 22000', icon: '📋' },
  { id: 'phytosanitary', name: 'Phytosanitary Certificate', icon: '📄' },
  { id: 'kenya_bureau', name: 'Kenya Bureau of Standards', icon: '🇰🇪' },
  { id: 'south_africa_bureau', name: 'SABS (South Africa)', icon: '🇿🇦' },
  { id: 'nigeria_nafdac', name: 'NAFDAC (Nigeria)', icon: '🇳🇬' }
] as const;

// ==========================================
// African Countries for Location
// ==========================================

export const AFRICAN_COUNTRIES = [
  { code: 'KE', name: 'Kenya', currency: 'KES' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR' },
  { code: 'GH', name: 'Ghana', currency: 'GHS' },
  { code: 'ET', name: 'Ethiopia', currency: 'ETB' },
  { code: 'TZ', name: 'Tanzania', currency: 'TZS' },
  { code: 'UG', name: 'Uganda', currency: 'UGX' },
  { code: 'RW', name: 'Rwanda', currency: 'RWF' },
  { code: 'CI', name: "Côte d'Ivoire", currency: 'XOF' },
  { code: 'SN', name: 'Senegal', currency: 'XOF' },
  { code: 'CM', name: 'Cameroon', currency: 'XAF' },
  { code: 'ZM', name: 'Zambia', currency: 'ZMW' },
  { code: 'ZW', name: 'Zimbabwe', currency: 'ZWL' },
  { code: 'MW', name: 'Malawi', currency: 'MWK' },
  { code: 'MZ', name: 'Mozambique', currency: 'MZN' },
  { code: 'EG', name: 'Egypt', currency: 'EGP' },
  { code: 'MA', name: 'Morocco', currency: 'MAD' },
  { code: 'DZ', name: 'Algeria', currency: 'DZD' },
  { code: 'TN', name: 'Tunisia', currency: 'TND' },
  { code: 'AO', name: 'Angola', currency: 'AOA' }
] as const;

// ==========================================
// Helper Functions
// ==========================================

export function getRoleInfo(role: UserRole): RoleInfo {
  return USER_ROLES[role] || USER_ROLES.farmer;
}

export function getBadgeInfo(badge: VerificationBadge): BadgeInfo {
  return VERIFICATION_BADGES[badge];
}

export function getStatusInfo(status: VerificationStatus): StatusInfo {
  return VERIFICATION_STATUS[status] || VERIFICATION_STATUS.unverified;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function getRatingStars(rating: number): string {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0;
  const emptyStars = 5 - fullStars - halfStar;
  return '★'.repeat(fullStars) + (halfStar ? '½' : '') + '☆'.repeat(emptyStars);
}
