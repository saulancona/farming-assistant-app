import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Building2, MapPin, Phone, Mail, Globe, Camera,
  CheckCircle, Clock, AlertCircle, Edit2, Save, Plus, Trash2,
  FileText, Upload, Star, Package, TrendingUp, MessageCircle,
  ChevronRight, ExternalLink, Share2, Loader
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ReviewSummary } from './SellerRating';
import { SellerBadgeList, VerificationStatusBadge, UserRoleBadge } from './SellerBadge';
import { ReviewList, LeaveReviewButton } from './Reviews';
import { PRODUCT_CATEGORIES, getCategoryById } from '../../constants/marketplaceCategories';
import * as db from '../../services/database';
import { uploadBusinessProfilePhoto, uploadBusinessCoverPhoto } from '../../services/storage';
import type { BusinessProfile as BusinessProfileType, SellerReview, UserRole, VerificationStatus, MarketplaceListing } from '../../types';
import toast from 'react-hot-toast';

interface BusinessProfileProps {
  // If userId is provided, show that user's profile (public view)
  // If not provided, show current user's profile (edit mode)
  userId?: string;
  onClose: () => void;
  onViewListing?: (listing: MarketplaceListing) => void;
  onContactSeller?: (userId: string) => void;
}

type ProfileTab = 'overview' | 'listings' | 'reviews' | 'edit';

const BUSINESS_TYPES: { value: UserRole; label: string; description: string }[] = [
  { value: 'farmer', label: 'Farmer / Producer', description: 'I grow and sell agricultural products' },
  { value: 'buyer', label: 'Buyer', description: 'I purchase agricultural products for my business' },
  { value: 'aggregator', label: 'Aggregator / Trader', description: 'I buy from farmers and sell to buyers' },
  { value: 'cooperative', label: 'Cooperative', description: 'We represent a group of farmers' },
  { value: 'exporter', label: 'Exporter', description: 'I export agricultural products internationally' },
];

const BUYER_TYPES = [
  'hotel', 'restaurant', 'supermarket', 'processor', 'exporter', 'wholesaler', 'retailer'
] as const;

export function BusinessProfile({ userId, onClose, onViewListing, onContactSeller }: BusinessProfileProps) {
  const { user } = useAuth();
  const isOwnProfile = !userId || userId === user?.id;

  const [activeTab, setActiveTab] = useState<ProfileTab>(isOwnProfile ? 'overview' : 'overview');
  const [profile, setProfile] = useState<BusinessProfileType | null>(null);
  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);
  const coverPhotoInputRef = useRef<HTMLInputElement>(null);

  // Form state for editing
  const [formData, setFormData] = useState<Partial<BusinessProfileType>>({
    businessName: '',
    businessType: 'farmer',
    phone: '',
    email: '',
    city: '',
    region: '',
    country: 'Kenya',
    bio: '',
    verificationStatus: 'unverified',
    verificationBadges: [],
    isActive: true,
  });

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, [userId, user]);

  const loadProfileData = async () => {
    setLoading(true);
    try {
      const targetUserId = userId || user?.id;
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      // Load profile
      const profileData = await db.getBusinessProfile(targetUserId);
      setProfile(profileData);

      if (profileData) {
        setFormData(profileData);

        // Load reviews for sellers
        if (['farmer', 'aggregator', 'cooperative', 'exporter'].includes(profileData.businessType)) {
          const reviewsData = await db.getSellerReviews(targetUserId);
          setReviews(reviewsData);
        }
      }

      // Load listings if viewing a seller
      if (profileData && ['farmer', 'aggregator', 'cooperative', 'exporter'].includes(profileData.businessType)) {
        const listingsData = await db.getMarketplaceListings({ status: 'active' });
        const sellerListings = listingsData.filter(l => l.userId === targetUserId);
        setListings(sellerListings);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      toast.error('Please sign in to save your profile');
      return;
    }

    // Validate required fields
    if (!formData.phone || !formData.email || !formData.city || !formData.region || !formData.country) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (profile) {
        // Update existing profile
        const updated = await db.updateBusinessProfile(profile.id, formData);
        setProfile(updated);
        toast.success('Profile updated successfully');
      } else {
        // Create new profile
        const newProfile = await db.createBusinessProfile({
          ...formData,
          userId: user.id,
          verificationStatus: 'unverified',
          verificationBadges: [],
          isActive: true,
        } as any);
        setProfile(newProfile);
        toast.success('Profile created successfully');
      }
      setIsEditing(false);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof BusinessProfileType, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Handle profile photo upload
  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Upload using the storage service (handles fallback to base64 if storage fails)
      const photoUrl = await uploadBusinessProfilePhoto(user.id, file);

      // Update profile with new logo URL
      const updated = await db.updateBusinessProfile(profile.id, {
        logoUrl: photoUrl,
      });

      setProfile(updated);
      setFormData(prev => ({ ...prev, logoUrl: photoUrl }));
      toast.success('Profile picture updated!');
    } catch (error: any) {
      console.error('Error uploading profile photo:', error);
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPhoto(false);
      // Reset input
      if (profilePhotoInputRef.current) {
        profilePhotoInputRef.current.value = '';
      }
    }
  };

  // Handle cover photo upload
  const handleCoverPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user || !profile) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingCover(true);
    try {
      // Upload using the storage service
      const photoUrl = await uploadBusinessCoverPhoto(user.id, file);

      // Update profile with new cover image URL
      const updated = await db.updateBusinessProfile(profile.id, {
        coverImageUrl: photoUrl,
      });

      setProfile(updated);
      setFormData(prev => ({ ...prev, coverImageUrl: photoUrl }));
      toast.success('Cover image updated!');
    } catch (error: any) {
      console.error('Error uploading cover photo:', error);
      toast.error(error.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
      // Reset input
      if (coverPhotoInputRef.current) {
        coverPhotoInputRef.current.value = '';
      }
    }
  };

  const getVerificationIcon = (status: VerificationStatus) => {
    switch (status) {
      case 'verified': return <CheckCircle className="text-green-500" size={16} />;
      case 'pending': return <Clock className="text-yellow-500" size={16} />;
      case 'rejected': return <AlertCircle className="text-red-500" size={16} />;
      default: return <AlertCircle className="text-gray-400" size={16} />;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      >
        <div className="bg-white rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </motion.div>
    );
  }

  // Render no profile state (for own profile)
  if (isOwnProfile && !profile && !isEditing) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="bg-white rounded-2xl max-w-lg w-full p-6 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building2 className="text-green-600" size={40} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Your Business Profile</h2>
          <p className="text-gray-600 mb-6">
            Set up your business profile to start trading on the marketplace.
            Build trust with verification badges and reviews.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Later
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="px-6 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center gap-2"
            >
              <Plus size={18} />
              Create Profile
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Main profile view
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-green-600 to-green-400 relative group">
            {profile?.coverImageUrl && (
              <img src={profile.coverImageUrl} alt="Cover" className="w-full h-full object-cover" />
            )}
            {/* Cover image upload button */}
            {isOwnProfile && (
              <>
                <input
                  type="file"
                  ref={coverPhotoInputRef}
                  accept="image/*"
                  onChange={handleCoverPhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => coverPhotoInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="absolute bottom-2 right-12 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 disabled:opacity-50 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Change cover image"
                >
                  {uploadingCover ? (
                    <Loader size={16} className="animate-spin" />
                  ) : (
                    <Camera size={16} />
                  )}
                </button>
              </>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-white/90 rounded-full hover:bg-white"
          >
            <X size={20} />
          </button>

          {/* Profile picture and name */}
          <div className="px-4 pb-4 -mt-12">
            <div className="flex items-end gap-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-lg overflow-hidden">
                  {profile?.logoUrl ? (
                    <img src={profile.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-green-100 flex items-center justify-center">
                      <Building2 className="text-green-600" size={40} />
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <>
                    <input
                      type="file"
                      ref={profilePhotoInputRef}
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => profilePhotoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                      className="absolute bottom-0 right-0 p-1.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50"
                    >
                      {uploadingPhoto ? (
                        <Loader size={14} className="animate-spin" />
                      ) : (
                        <Camera size={14} />
                      )}
                    </button>
                  </>
                )}
              </div>

              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">
                    {profile?.businessName || formData.businessName || 'New Business'}
                  </h1>
                  {profile && getVerificationIcon(profile.verificationStatus)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {profile && <UserRoleBadge role={profile.businessType} size="sm" />}
                  {profile?.verificationStatus === 'verified' && (
                    <VerificationStatusBadge status="verified" size="sm" />
                  )}
                </div>
              </div>

              {isOwnProfile && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-2"
                >
                  <Edit2 size={16} />
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex">
            {(['overview', 'listings', 'reviews'] as ProfileTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab}
                {tab === 'listings' && listings.length > 0 && (
                  <span className="ml-1 text-xs">({listings.length})</span>
                )}
                {tab === 'reviews' && reviews.length > 0 && (
                  <span className="ml-1 text-xs">({reviews.length})</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <ProfileEditForm
                formData={formData}
                onChange={handleInputChange}
                onSave={handleSaveProfile}
                onCancel={() => {
                  setIsEditing(false);
                  if (profile) setFormData(profile);
                }}
                saving={saving}
                isNew={!profile}
              />
            ) : (
              <>
                {activeTab === 'overview' && (
                  <ProfileOverview
                    profile={profile!}
                    isOwnProfile={isOwnProfile}
                    onContact={() => onContactSeller?.(profile!.userId)}
                  />
                )}
                {activeTab === 'listings' && (
                  <ProfileListings
                    listings={listings}
                    onViewListing={onViewListing}
                  />
                )}
                {activeTab === 'reviews' && (
                  <ProfileReviews
                    reviews={reviews}
                    profile={profile!}
                    isOwnProfile={isOwnProfile}
                    currentUserId={user?.id}
                    onReviewChange={loadProfileData}
                  />
                )}
              </>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Profile Overview Tab
function ProfileOverview({
  profile,
  isOwnProfile,
  onContact
}: {
  profile: BusinessProfileType;
  isOwnProfile: boolean;
  onContact?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Bio */}
      {profile.bio && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">About</h3>
          <p className="text-gray-700">{profile.bio}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-yellow-500 mb-1">
            <Star size={16} className="fill-yellow-400" />
            <span className="font-bold text-gray-900">{profile.rating.toFixed(1)}</span>
          </div>
          <p className="text-xs text-gray-500">{profile.totalRatings} reviews</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
            <Package size={16} />
            <span className="font-bold text-gray-900">{profile.totalTransactions}</span>
          </div>
          <p className="text-xs text-gray-500">Transactions</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 text-center">
          <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
            <TrendingUp size={16} />
            <span className="font-bold text-gray-900">{profile.responseRate || 0}%</span>
          </div>
          <p className="text-xs text-gray-500">Response rate</p>
        </div>
      </div>

      {/* Badges */}
      {profile.verificationBadges && profile.verificationBadges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Badges</h3>
          <SellerBadgeList badges={profile.verificationBadges} maxShow={6} size="md" />
        </div>
      )}

      {/* Contact Info */}
      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">Contact</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-gray-700">
            <MapPin size={16} className="text-gray-400" />
            <span>{[profile.city, profile.region, profile.country].filter(Boolean).join(', ')}</span>
          </div>
          {profile.phone && (
            <div className="flex items-center gap-3 text-gray-700">
              <Phone size={16} className="text-gray-400" />
              <span>{profile.phone}</span>
            </div>
          )}
          {profile.email && (
            <div className="flex items-center gap-3 text-gray-700">
              <Mail size={16} className="text-gray-400" />
              <span>{profile.email}</span>
            </div>
          )}
          {profile.website && (
            <div className="flex items-center gap-3 text-gray-700">
              <Globe size={16} className="text-gray-400" />
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline flex items-center gap-1">
                {profile.website} <ExternalLink size={12} />
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Products (for sellers) */}
      {profile.mainProducts && profile.mainProducts.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Products</h3>
          <div className="flex flex-wrap gap-2">
            {profile.mainProducts.map((productId) => {
              const category = getCategoryById(productId);
              return (
                <span key={productId} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                  {category?.icon} {category?.name || productId}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Farm details */}
      {profile.farmSize && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Farm Details</h3>
          <p className="text-gray-700">
            {profile.farmSize} {profile.farmSizeUnit || 'acres'}
            {profile.productionCapacity && ` • Capacity: ${profile.productionCapacity}`}
          </p>
        </div>
      )}

      {/* Certifications */}
      {profile.certifications && profile.certifications.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Certifications</h3>
          <div className="flex flex-wrap gap-2">
            {profile.certifications.map((cert) => (
              <span key={cert} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm flex items-center gap-1">
                <CheckCircle size={14} />
                {cert}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      {!isOwnProfile && (
        <div className="space-y-3 pt-4">
          <div className="flex gap-3">
            <button
              onClick={onContact}
              className="flex-1 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              Contact Seller
            </button>
            <button className="px-4 py-3 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50">
              <Share2 size={18} />
            </button>
          </div>
          {/* Leave Review Button for sellers */}
          {['farmer', 'aggregator', 'cooperative', 'exporter'].includes(profile.businessType) && (
            <LeaveReviewButton
              sellerId={profile.userId}
              sellerName={profile.businessName || 'Seller'}
              variant="outline"
              size="md"
            />
          )}
        </div>
      )}
    </motion.div>
  );
}

// Profile Listings Tab
function ProfileListings({
  listings,
  onViewListing
}: {
  listings: MarketplaceListing[];
  onViewListing?: (listing: MarketplaceListing) => void;
}) {
  if (listings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-12"
      >
        <Package className="mx-auto text-gray-300 mb-3" size={48} />
        <p className="text-gray-500">No active listings</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3"
    >
      {listings.map((listing) => (
        <button
          key={listing.id}
          onClick={() => onViewListing?.(listing)}
          className="w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-3"
        >
          <div className="w-16 h-16 rounded-lg bg-white overflow-hidden flex-shrink-0">
            {listing.images?.[0] ? (
              <img src={listing.images[0]} alt={listing.productName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package size={24} />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{listing.productName}</h4>
            <p className="text-sm text-gray-500">
              {listing.quantity} {listing.unit} • KES {listing.pricePerUnit.toLocaleString()}/{listing.unit}
            </p>
            <p className="text-xs text-gray-400">{listing.location}</p>
          </div>
          <ChevronRight className="text-gray-400" size={20} />
        </button>
      ))}
    </motion.div>
  );
}

// Profile Reviews Tab
function ProfileReviews({
  reviews,
  profile,
  isOwnProfile,
  currentUserId,
  onReviewChange
}: {
  reviews: SellerReview[];
  profile: BusinessProfileType;
  isOwnProfile: boolean;
  currentUserId?: string;
  onReviewChange: () => void;
}) {
  // Calculate average ratings
  const avgQuality = reviews.length > 0
    ? reviews.reduce((sum: number, r: SellerReview) => sum + (r.qualityRating || 0), 0) / reviews.length
    : 0;
  const avgCommunication = reviews.length > 0
    ? reviews.reduce((sum: number, r: SellerReview) => sum + (r.communicationRating || 0), 0) / reviews.length
    : 0;
  const avgDelivery = reviews.length > 0
    ? reviews.reduce((sum: number, r: SellerReview) => sum + (r.deliveryRating || 0), 0) / reviews.length
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Summary */}
      {reviews.length > 0 && (
        <ReviewSummary
          overallRating={profile.rating}
          totalRatings={profile.totalRatings}
          qualityRating={avgQuality}
          communicationRating={avgCommunication}
          deliveryRating={avgDelivery}
        />
      )}

      {/* Leave Review Button for non-owners */}
      {!isOwnProfile && ['farmer', 'aggregator', 'cooperative', 'exporter'].includes(profile.businessType) && (
        <div className="flex justify-center">
          <LeaveReviewButton
            sellerId={profile.userId}
            sellerName={profile.businessName || 'Seller'}
            variant="primary"
            size="md"
          />
        </div>
      )}

      {/* Reviews List with full functionality */}
      <ReviewList
        sellerId={profile.userId}
        reviews={reviews}
        currentUserId={currentUserId}
        isSellerView={isOwnProfile}
        onReviewChange={onReviewChange}
      />
    </motion.div>
  );
}

// Profile Edit Form
function ProfileEditForm({
  formData,
  onChange,
  onSave,
  onCancel,
  saving,
  isNew,
}: {
  formData: Partial<BusinessProfileType>;
  onChange: (field: keyof BusinessProfileType, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  isNew: boolean;
}) {
  const [activeSection, setActiveSection] = useState<'basic' | 'business' | 'verification'>('basic');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Section tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['basic', 'business', 'verification'] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === section
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {section === 'basic' && 'Basic Info'}
            {section === 'business' && 'Business Details'}
            {section === 'verification' && 'Verification'}
          </button>
        ))}
      </div>

      {/* Basic Info Section */}
      {activeSection === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Name
            </label>
            <input
              type="text"
              value={formData.businessName || ''}
              onChange={(e) => onChange('businessName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Your farm or business name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Type <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2">
              {BUSINESS_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    formData.businessType === type.value
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="businessType"
                    value={type.value}
                    checked={formData.businessType === type.value}
                    onChange={(e) => onChange('businessType', e.target.value)}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-gray-900">{type.label}</p>
                    <p className="text-sm text-gray-500">{type.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio / Description
            </label>
            <textarea
              value={formData.bio || ''}
              onChange={(e) => onChange('bio', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Tell buyers about your business..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => onChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="+254..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp
              </label>
              <input
                type="tel"
                value={formData.whatsappNumber || ''}
                onChange={(e) => onChange('whatsappNumber', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="+254..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.city || ''}
                onChange={(e) => onChange('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Nairobi"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Region <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.region || ''}
                onChange={(e) => onChange('region', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Nairobi County"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Country <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.country || ''}
                onChange={(e) => onChange('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Kenya"
              />
            </div>
          </div>
        </div>
      )}

      {/* Business Details Section */}
      {activeSection === 'business' && (
        <div className="space-y-4">
          {formData.businessType === 'buyer' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Buyer Type
                </label>
                <select
                  value={formData.buyerType || ''}
                  onChange={(e) => onChange('buyerType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select type...</option>
                  {BUYER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Average Order Size
                </label>
                <input
                  type="text"
                  value={formData.averageOrderSize || ''}
                  onChange={(e) => onChange('averageOrderSize', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 500kg - 1 tonne per order"
                />
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Farm Size
                  </label>
                  <input
                    type="number"
                    value={formData.farmSize || ''}
                    onChange={(e) => onChange('farmSize', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formData.farmSizeUnit || 'acres'}
                    onChange={(e) => onChange('farmSizeUnit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="acres">Acres</option>
                    <option value="hectares">Hectares</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Production Capacity
                </label>
                <input
                  type="text"
                  value={formData.productionCapacity || ''}
                  onChange={(e) => onChange('productionCapacity', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 500 tonnes/year"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Main Products
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg">
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                        formData.mainProducts?.includes(cat.id)
                          ? 'bg-green-50 text-green-700'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.mainProducts?.includes(cat.id) || false}
                        onChange={(e) => {
                          const current = formData.mainProducts || [];
                          if (e.target.checked) {
                            onChange('mainProducts', [...current, cat.id]);
                          } else {
                            onChange('mainProducts', current.filter(id => id !== cat.id));
                          }
                        }}
                        className="hidden"
                      />
                      <span>{cat.icon}</span>
                      <span className="text-sm">{cat.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website
            </label>
            <input
              type="url"
              value={formData.website || ''}
              onChange={(e) => onChange('website', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Business Registration Number
            </label>
            <input
              type="text"
              value={formData.registrationNumber || ''}
              onChange={(e) => onChange('registrationNumber', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Optional"
            />
          </div>
        </div>
      )}

      {/* Verification Section */}
      {activeSection === 'verification' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
              <CheckCircle size={18} />
              Why Get Verified?
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Build trust with buyers and sellers</li>
              <li>• Get priority in search results</li>
              <li>• Earn verification badges</li>
              <li>• Access to premium features</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Verification Documents
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 transition-colors cursor-pointer">
              <Upload className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-600 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-gray-400">
                Business registration, ID, certificates (PDF, JPG, PNG)
              </p>
            </div>
          </div>

          {formData.verificationDocuments && formData.verificationDocuments.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Uploaded Documents
              </label>
              <div className="space-y-2">
                {formData.verificationDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <FileText size={18} className="text-gray-400" />
                    <span className="flex-1 text-sm text-gray-700 truncate">{doc}</span>
                    <button className="text-red-500 hover:text-red-700">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Certifications
            </label>
            <div className="flex flex-wrap gap-2">
              {['Organic Certified', 'Fair Trade', 'GLOBALG.A.P', 'ISO 22000', 'Rainforest Alliance'].map((cert) => (
                <label
                  key={cert}
                  className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                    formData.certifications?.includes(cert)
                      ? 'bg-green-100 text-green-700 border-2 border-green-500'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.certifications?.includes(cert) || false}
                    onChange={(e) => {
                      const current = formData.certifications || [];
                      if (e.target.checked) {
                        onChange('certifications', [...current, cert]);
                      } else {
                        onChange('certifications', current.filter(c => c !== cert));
                      }
                    }}
                  />
                  {cert}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          onClick={onCancel}
          className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex-1 py-3 rounded-lg bg-green-600 text-white font-medium hover:bg-green-700 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              {isNew ? 'Create Profile' : 'Save Changes'}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default BusinessProfile;
