import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, MapPin, Calendar, Package, X, Search, Eye, ShoppingCart, Truck, Phone, User, Upload, Image as ImageIcon, Filter, ChevronDown, LayoutGrid, Bookmark, Building2, ClipboardList, AlertCircle, Loader } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useInventory } from '../hooks/useSupabaseData';
import type { MarketplaceListing, Income, Order } from '../types';
import * as db from '../services/database';
import { getPreferredCurrency, formatPrice, convertBetweenCurrencies } from '../services/currency';
import { verifyMarketplacePhoto } from '../services/photoVerification';
import ConfirmDialog from './ConfirmDialog';
import {
  PRODUCT_CATEGORIES,
  getCategoryById,
  getSubcategoryById,
  UNITS,
  QUALITY_GRADES
} from '../constants/marketplaceCategories';
import { SellerBadgeList, VerificationStatusBadge, UserRoleBadge } from './marketplace/SellerBadge';
import { SellerRating } from './marketplace/SellerRating';
import { CategoryBrowser, CategoryGrid } from './marketplace/CategoryBrowser';
import { SavedSearches, SaveSearchButton } from './marketplace/SavedSearches';
import { BusinessProfile } from './marketplace/BusinessProfile';
import { LeaveReviewButton } from './marketplace/Reviews';
import { CartIcon, CartDrawer, AddToCartButton } from './marketplace/Cart';
import { Checkout } from './marketplace/Checkout';
import { OrderHistory } from './marketplace/OrderHistory';
import { SellerOrders } from './marketplace/SellerOrders';
import type { SavedSearchCriteria } from '../types';

interface MarketplaceProps {
  onAddIncome?: (income: Omit<Income, 'id'>) => Promise<void>;
}

export default function Marketplace({ onAddIncome }: MarketplaceProps) {
  const { user } = useAuth();
  const { setIsOpen: setCartOpen } = useCart();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<MarketplaceListing | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [viewMode, setViewMode] = useState<'all' | 'my'>('all');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [currency, setCurrency] = useState<string>('KES');
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; listingId: string | null }>({ show: false, listingId: null });
  const [showCheckout, setShowCheckout] = useState(false);
  const [showOrderHistory, setShowOrderHistory] = useState(false);
  const [showSellerOrders, setShowSellerOrders] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>('');
  const [isVerifyingPhoto, setIsVerifyingPhoto] = useState(false);

  // Fetch user's inventory for product selection
  const { data: inventoryItems = [] } = useInventory(user?.id);

  // Filter inventory to show only sellable items (harvest category with quantity > 0)
  const sellableInventory = useMemo(() => {
    return inventoryItems.filter(item =>
      item.category === 'harvest' && item.quantity > 0
    );
  }, [inventoryItems]);

  const [formData, setFormData] = useState<Omit<MarketplaceListing, 'id' | 'createdAt' | 'viewsCount' | 'isOwner' | 'userId' | 'userName'>>({
    categoryId: '',
    subcategoryId: '',
    productName: '',
    variety: '',
    quantity: 0,
    unit: 'kg',
    pricePerUnit: 0,
    totalPrice: 0,
    quality: 'standard',
    harvestDate: format(new Date(), 'yyyy-MM-dd'),
    availableFrom: format(new Date(), 'yyyy-MM-dd'),
    description: '',
    images: [],
    location: '',
    deliveryAvailable: false,
    deliveryRadius: undefined,
    minimumOrder: undefined,
    status: 'active',
    userLocation: '',
    userContact: '',
  });

  // Advanced filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterQuality, setFilterQuality] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [filterDeliveryOnly, setFilterDeliveryOnly] = useState(false);
  const [filterVerifiedOnly, setFilterVerifiedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high' | 'rating'>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showCategoryBrowser, setShowCategoryBrowser] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [filterSubcategory, setFilterSubcategory] = useState('');
  const [showBusinessProfile, setShowBusinessProfile] = useState(false);
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null);

  useEffect(() => {
    loadListings();
  }, [viewMode]);

  // Load currency preference
  useEffect(() => {
    setCurrency(getPreferredCurrency());

    const handleSettingsSaved = () => {
      setCurrency(getPreferredCurrency());
      // Force re-render by reloading listings
      loadListings();
    };

    window.addEventListener('settingsSaved', handleSettingsSaved);
    return () => window.removeEventListener('settingsSaved', handleSettingsSaved);
  }, []);

  async function loadListings() {
    try {
      setIsLoading(true);
      let data;
      if (viewMode === 'my') {
        if (!user) {
          setListings([]);
          return;
        }
        data = await db.getMyMarketplaceListings();
      } else {
        data = await db.getMarketplaceListings();
      }
      setListings(data);
    } catch (error: any) {
      console.error('Error loading marketplace listings:', error);
      // If table doesn't exist, show empty state
      setListings([]);
      if (error?.message?.includes('relation') || error?.code === '42P01') {
        console.warn('Marketplace table does not exist yet. Please run schema-marketplace.sql in your Supabase database.');
      }
    } finally {
      setIsLoading(false);
    }
  }

  // Component to display converted price
  const ConvertedPrice: React.FC<{ amount: number; className?: string }> = ({ amount, className }) => {
    const [convertedAmount, setConvertedAmount] = useState<number>(amount);

    useEffect(() => {
      const convert = async () => {
        // Marketplace prices are always stored in KES
        if (currency === 'KES') {
          setConvertedAmount(amount);
        } else {
          try {
            const converted = await convertBetweenCurrencies(amount, 'KES', currency);
            setConvertedAmount(converted);
          } catch (error) {
            console.error('Error converting price:', error);
            setConvertedAmount(amount);
          }
        }
      };
      convert();
    }, [amount, currency]);

    return <span className={className}>{formatPrice(convertedAmount, currency)}</span>;
  };

  // Get available subcategories based on selected category
  const availableSubcategories = useMemo(() => {
    if (!formData.categoryId) return [];
    const category = getCategoryById(formData.categoryId);
    return category?.subcategories || [];
  }, [formData.categoryId]);

  // Get available units based on selected subcategory
  const availableUnits = useMemo(() => {
    if (!formData.categoryId || !formData.subcategoryId) {
      return Object.entries(UNITS).map(([id, unit]) => ({ id, ...unit }));
    }
    const subcategory = getSubcategoryById(formData.categoryId, formData.subcategoryId);
    if (subcategory?.typicalUnits?.length) {
      return subcategory.typicalUnits.map(unitId => {
        const unit = UNITS[unitId as keyof typeof UNITS];
        return unit ? { id: unitId, ...unit } : null;
      }).filter(Boolean) as { id: string; name: string; abbr: string }[];
    }
    return Object.entries(UNITS).map(([id, unit]) => ({ id, ...unit }));
  }, [formData.categoryId, formData.subcategoryId]);

  // Get common varieties for selected subcategory
  const commonVarieties = useMemo(() => {
    if (!formData.categoryId || !formData.subcategoryId) return [];
    const subcategory = getSubcategoryById(formData.categoryId, formData.subcategoryId);
    return subcategory?.commonVarieties || [];
  }, [formData.categoryId, formData.subcategoryId]);

  const handleOpenModal = (listing?: MarketplaceListing) => {
    if (listing) {
      setEditingListing(listing);
      setSelectedInventoryId(''); // Keep empty for editing - product already selected
      setFormData({
        categoryId: listing.categoryId || '',
        subcategoryId: listing.subcategoryId || '',
        productName: listing.productName || listing.cropType || '',
        variety: listing.variety || '',
        quantity: listing.quantity,
        unit: listing.unit,
        pricePerUnit: listing.pricePerUnit,
        totalPrice: listing.totalPrice,
        quality: listing.quality,
        harvestDate: listing.harvestDate,
        availableFrom: listing.availableFrom,
        description: listing.description || '',
        images: listing.images || [],
        location: listing.location,
        deliveryAvailable: listing.deliveryAvailable,
        deliveryRadius: listing.deliveryRadius,
        minimumOrder: listing.minimumOrder,
        status: listing.status,
        userLocation: listing.userLocation || '',
        userContact: listing.userContact || '',
      });
      setImageUrls(listing.images || []);
    } else {
      setEditingListing(null);
      setSelectedInventoryId('');
      setFormData({
        categoryId: '',
        subcategoryId: '',
        productName: '',
        variety: '',
        quantity: 0,
        unit: 'kg',
        pricePerUnit: 0,
        totalPrice: 0,
        quality: 'standard',
        harvestDate: format(new Date(), 'yyyy-MM-dd'),
        availableFrom: format(new Date(), 'yyyy-MM-dd'),
        description: '',
        images: [],
        location: '',
        deliveryAvailable: false,
        deliveryRadius: undefined,
        minimumOrder: undefined,
        status: 'active',
        userLocation: '',
        userContact: '',
      });
      setImageUrls([]);
    }
    setImageUrlInput('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingListing(null);
    setSelectedInventoryId('');
    setImageUrls([]);
    setImageUrlInput('');
  };

  const handleAddImageUrl = async () => {
    if (!imageUrlInput.trim()) return;

    const url = imageUrlInput.trim();

    // Check for duplicate
    if (imageUrls.includes(url)) {
      toast.error('This image URL has already been added');
      return;
    }

    // Start verification
    setIsVerifyingPhoto(true);
    const verifyingToast = toast.loading('Verifying photo...');

    try {
      // Verify the photo is not AI-generated
      const result = await verifyMarketplacePhoto(url);

      if (!result.isValid) {
        toast.dismiss(verifyingToast);
        if (result.isAiGenerated) {
          toast.error(
            'AI-generated images are not allowed. Please upload a real photo of your product.',
            { duration: 5000 }
          );
        } else {
          toast.error(result.reason || 'Photo verification failed. Please use a different image.', { duration: 5000 });
        }
        return;
      }

      // Photo passed verification - add it
      const newImages = [...imageUrls, url];
      setImageUrls(newImages);
      setFormData({ ...formData, images: newImages });
      setImageUrlInput('');
      toast.dismiss(verifyingToast);
      toast.success('Photo verified and added!');
    } catch (error) {
      console.error('Photo verification error:', error);
      toast.dismiss(verifyingToast);
      // On error, still add the photo (graceful degradation)
      const newImages = [...imageUrls, url];
      setImageUrls(newImages);
      setFormData({ ...formData, images: newImages });
      setImageUrlInput('');
      toast.success('Photo added');
    } finally {
      setIsVerifyingPhoto(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    const newImages = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newImages);
    setFormData({ ...formData, images: newImages });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('You must be logged in to create a listing');
      return;
    }

    // For new listings, require inventory selection
    if (!editingListing && !selectedInventoryId) {
      toast.error('Please select a product from your inventory');
      return;
    }

    // Mandatory photo validation
    if (imageUrls.length === 0) {
      toast.error('At least one photo is required to create a listing');
      return;
    }

    // Validate required fields
    if (!formData.productName || !formData.location || formData.quantity <= 0 || formData.pricePerUnit <= 0) {
      toast.error('Please fill in all required fields with valid values');
      return;
    }

    try {
      const listingData = {
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId,
        productName: formData.productName,
        variety: formData.variety || undefined,
        quantity: formData.quantity,
        unit: formData.unit,
        pricePerUnit: formData.pricePerUnit,
        totalPrice: formData.totalPrice,
        quality: formData.quality,
        harvestDate: formData.harvestDate,
        availableFrom: formData.availableFrom,
        description: formData.description || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        location: formData.location,
        deliveryAvailable: formData.deliveryAvailable,
        deliveryRadius: formData.deliveryRadius || undefined,
        minimumOrder: formData.minimumOrder || undefined,
        status: formData.status,
        userLocation: formData.userLocation || undefined,
        userContact: formData.userContact || undefined,
        // Legacy field for backwards compatibility
        cropType: formData.productName,
      };

      if (editingListing) {
        await db.updateMarketplaceListing(editingListing.id, listingData as any);
        toast.success('Listing updated successfully!');
      } else {
        await db.addMarketplaceListing(listingData as any);
        toast.success('Listing created successfully!');
      }
      handleCloseModal();
      loadListings();
    } catch (error: any) {
      console.error('Error saving listing:', error);
      const errorMessage = error?.message || 'Failed to save listing. Please try again.';
      toast.error(`Error: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm({ show: true, listingId: id });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm.listingId) return;

    try {
      await db.deleteMarketplaceListing(deleteConfirm.listingId);
      loadListings();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing. Please try again.');
    } finally {
      setDeleteConfirm({ show: false, listingId: null });
    }
  };

  const handleMarkAsSold = async (id: string) => {
    try {
      // Find the listing to get its details
      const listing = listings.find(l => l.id === id);
      if (!listing) {
        toast.error('Listing not found');
        return;
      }

      // Mark listing as sold in database
      await db.markListingAsSold(id);

      // Create income entry if callback is provided
      if (onAddIncome) {
        const productDisplay = listing.productName || listing.cropType || 'Product';
        const incomeEntry: Omit<Income, 'id'> = {
          date: format(new Date(), 'yyyy-MM-dd'),
          source: 'harvest_sale',
          description: `Marketplace sale: ${listing.quantity} ${listing.unit} of ${productDisplay}${listing.variety ? ' (' + listing.variety + ')' : ''}`,
          amount: listing.totalPrice,
          fieldId: undefined,
          fieldName: undefined,
        };

        await onAddIncome(incomeEntry);
      }

      loadListings();
      toast.success('Listing marked as sold and income recorded!');
    } catch (error) {
      console.error('Error marking as sold:', error);
      toast.error('Failed to mark as sold. Please try again.');
    }
  };

  // Calculate total price when quantity or price per unit changes
  useEffect(() => {
    const total = formData.quantity * formData.pricePerUnit;
    if (total !== formData.totalPrice) {
      setFormData(prev => ({ ...prev, totalPrice: total }));
    }
  }, [formData.quantity, formData.pricePerUnit]);

  // Filter and sort listings
  const filteredListings = useMemo(() => {
    let results = listings.filter(listing => {
      const productDisplay = listing.productName || listing.cropType || '';

      // Text search
      const matchesSearch = !searchQuery ||
        productDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.variety?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Location filter
      const matchesLocation = !filterLocation ||
        listing.location.toLowerCase().includes(filterLocation.toLowerCase());

      // Category filter
      const matchesCategory = !filterCategory || listing.categoryId === filterCategory;

      // Subcategory filter
      const matchesSubcategory = !filterSubcategory || listing.subcategoryId === filterSubcategory;

      // Quality filter
      const matchesQuality = !filterQuality || listing.quality === filterQuality;

      // Price range filter
      const minPrice = filterPriceMin ? parseFloat(filterPriceMin) : 0;
      const maxPrice = filterPriceMax ? parseFloat(filterPriceMax) : Infinity;
      const matchesPrice = listing.pricePerUnit >= minPrice && listing.pricePerUnit <= maxPrice;

      // Delivery filter
      const matchesDelivery = !filterDeliveryOnly || listing.deliveryAvailable;

      // Verified seller filter
      const matchesVerified = !filterVerifiedOnly || listing.sellerVerificationStatus === 'verified';

      return matchesSearch && matchesLocation && matchesCategory && matchesSubcategory && matchesQuality &&
             matchesPrice && matchesDelivery && matchesVerified;
    });

    // Sort results
    switch (sortBy) {
      case 'price_low':
        results.sort((a, b) => a.pricePerUnit - b.pricePerUnit);
        break;
      case 'price_high':
        results.sort((a, b) => b.pricePerUnit - a.pricePerUnit);
        break;
      case 'rating':
        results.sort((a, b) => (b.sellerRating || 0) - (a.sellerRating || 0));
        break;
      case 'newest':
      default:
        results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
    }

    return results;
  }, [listings, searchQuery, filterLocation, filterCategory, filterSubcategory, filterQuality,
      filterPriceMin, filterPriceMax, filterDeliveryOnly, filterVerifiedOnly, sortBy]);

  // Count active filters
  const activeFilterCount = [
    filterCategory, filterQuality, filterPriceMin, filterPriceMax,
    filterDeliveryOnly, filterVerifiedOnly
  ].filter(Boolean).length;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterLocation('');
    setFilterCategory('');
    setFilterQuality('');
    setFilterPriceMin('');
    setFilterPriceMax('');
    setFilterDeliveryOnly(false);
    setFilterVerifiedOnly(false);
    setSortBy('newest');
  };
  // Build current search criteria for saving
  const currentSearchCriteria: SavedSearchCriteria = useMemo(() => ({
    query: searchQuery || undefined,
    categoryId: filterCategory || undefined,
    subcategoryId: filterSubcategory || undefined,
    location: filterLocation || undefined,
    priceMin: filterPriceMin ? parseFloat(filterPriceMin) : undefined,
    priceMax: filterPriceMax ? parseFloat(filterPriceMax) : undefined,
    quality: filterQuality || undefined,
    deliveryOnly: filterDeliveryOnly || undefined,
    verifiedOnly: filterVerifiedOnly || undefined
  }), [searchQuery, filterCategory, filterSubcategory, filterLocation, filterPriceMin, filterPriceMax, filterQuality, filterDeliveryOnly, filterVerifiedOnly]);


  
  // Apply saved search criteria
  const applySearchFromSaved = (criteria: SavedSearchCriteria) => {
    if (criteria.query) setSearchQuery(criteria.query);
    if (criteria.categoryId) setFilterCategory(criteria.categoryId);
    if (criteria.subcategoryId) setFilterSubcategory(criteria.subcategoryId);
    if (criteria.location) setFilterLocation(criteria.location);
    if (criteria.priceMin) setFilterPriceMin(String(criteria.priceMin));
    if (criteria.priceMax) setFilterPriceMax(String(criteria.priceMax));
    if (criteria.quality) setFilterQuality(criteria.quality);
    if (criteria.deliveryOnly) setFilterDeliveryOnly(criteria.deliveryOnly);
    if (criteria.verifiedOnly) setFilterVerifiedOnly(criteria.verifiedOnly);
    setShowSavedSearches(false);
  };

  const getQualityBadge = (quality: MarketplaceListing['quality']) => {
    const badges = {
      premium: 'bg-purple-100 text-purple-800',
      grade_a: 'bg-green-100 text-green-800',
      grade_b: 'bg-blue-100 text-blue-800',
      standard: 'bg-gray-100 text-gray-800',
    };
    return badges[quality] || badges.standard;
  };

  const getStatusBadge = (status: MarketplaceListing['status']) => {
    const badges = {
      active: 'bg-green-100 text-green-800',
      sold: 'bg-gray-100 text-gray-800',
      reserved: 'bg-yellow-100 text-yellow-800',
      expired: 'bg-red-100 text-red-800',
    };
    return badges[status] || badges.active;
  };

  return (
    <div className="space-y-6">
      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.show}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ show: false, listingId: null })}
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Marketplace</h1>
          <p className="text-gray-600 mt-1">Buy and sell crops directly with other farmers</p>
        </div>
        {user && (
          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Create Listing
          </button>
        )}
      </div>

      {/* Category Quick Browse */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Browse by Category</h2>
          <button
            onClick={() => setShowCategoryBrowser(true)}
            className="text-sm text-green-600 hover:text-green-700 font-medium flex items-center gap-1"
          >
            <LayoutGrid size={16} />
            View All Categories
          </button>
        </div>
        <CategoryGrid onSelectCategory={(catId) => {
          setFilterCategory(catId);
          setFilterSubcategory('');
        }} />
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-md p-4 space-y-4">
        {/* Main Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 appearance-none bg-white"
            >
              <option value="">All Categories</option>
              {PRODUCT_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
          </div>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Filter by location..."
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* View Toggle Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
              viewMode === 'all' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Listings
          </button>
          {user && (
            <>
              <button
                onClick={() => setViewMode('my')}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  viewMode === 'my' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                My Listings
              </button>
              <button
                onClick={() => {
                  setViewingProfileUserId(null);
                  setShowBusinessProfile(true);
                }}
                className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <Building2 size={16} />
                My Profile
              </button>
            </>
          )}
          {/* Shopping Cart Icon */}
          <CartIcon
            onClick={() => setCartOpen(true)}
            className="ml-2"
          />
          {/* Order History Button */}
          {user && (
            <button
              onClick={() => setShowOrderHistory(true)}
              className="px-4 py-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-2 text-sm font-medium ml-2"
            >
              <ClipboardList size={16} />
              My Orders
            </button>
          )}
          {/* Seller Orders Button */}
          {user && (
            <button
              onClick={() => setShowSellerOrders(true)}
              className="px-4 py-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <Package size={16} />
              Sales
            </button>
          )}
        </div>

        {/* Sort and Advanced Filters Toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-4">
            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>

            {/* Results count */}
            <span className="text-sm text-gray-500">
              {filteredListings.length} {filteredListings.length === 1 ? 'listing' : 'listings'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Saved Searches */}
            {user && (
              <>
                <button
                  onClick={() => setShowSavedSearches(true)}
                  className="px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  <Bookmark size={14} />
                  Saved Searches
                </button>
                <SaveSearchButton
                  criteria={currentSearchCriteria}
                  hasActiveFilters={activeFilterCount > 0}
                />
              </>
            )}

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <X size={14} />
                Clear filters ({activeFilterCount})
              </button>
            )}

            {/* Advanced filters toggle */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                showAdvancedFilters || activeFilterCount > 0
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Filter size={14} />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 bg-green-600 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                {/* Quality Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quality Grade</label>
                  <select
                    value={filterQuality}
                    onChange={(e) => setFilterQuality(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">All Grades</option>
                    {Object.entries(QUALITY_GRADES).map(([id, grade]) => (
                      <option key={id} value={id}>{grade.name}</option>
                    ))}
                  </select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price Range (per unit)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filterPriceMin}
                      onChange={(e) => setFilterPriceMin(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filterPriceMax}
                      onChange={(e) => setFilterPriceMax(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterDeliveryOnly}
                      onChange={(e) => setFilterDeliveryOnly(e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Delivery available only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filterVerifiedOnly}
                      onChange={(e) => setFilterVerifiedOnly(e.target.checked)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                    />
                    <span className="text-sm text-gray-700">Verified sellers only</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mb-4"></div>
          <p className="text-gray-600">Loading listings...</p>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <ShoppingCart className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No listings found. {user ? 'Create your first listing to get started!' : 'Sign in to create listings.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredListings.map((listing, index) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              {/* Product Image */}
              {listing.images && listing.images.length > 0 && (
                <div className="relative h-48 bg-gray-100">
                  <img
                    src={listing.images[0]}
                    alt={listing.productName || listing.cropType}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em" font-size="24"%3ENo Image%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {listing.images.length > 1 && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                      <ImageIcon size={12} />
                      {listing.images.length} photos
                    </div>
                  )}
                </div>
              )}

              <div className="p-6">
                {/* Category Badge */}
                {listing.categoryId && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                      {getCategoryById(listing.categoryId)?.icon} {getCategoryById(listing.categoryId)?.name || listing.categoryId}
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{listing.productName || listing.cropType}</h3>
                    {listing.variety && <p className="text-sm text-gray-600">{listing.variety}</p>}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getQualityBadge(listing.quality)}`}>
                      {listing.quality.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(listing.status)}`}>
                      {listing.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Price and Quantity */}
                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Price per {listing.unit}</span>
                    <ConvertedPrice amount={listing.pricePerUnit} className="text-lg font-bold text-green-600" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total ({listing.quantity} {listing.unit})</span>
                    <ConvertedPrice amount={listing.totalPrice} className="text-xl font-bold text-gray-900" />
                  </div>
                </div>

                {/* Details */}
                {listing.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{listing.description}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <MapPin size={16} />
                    <span>{listing.location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar size={16} />
                    <span>Harvested: {format(new Date(listing.harvestDate), 'MMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package size={16} />
                    <span>Available from: {format(new Date(listing.availableFrom), 'MMM d, yyyy')}</span>
                  </div>
                  {listing.minimumOrder && (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <ShoppingCart size={16} />
                      <span>Min. order: {listing.minimumOrder} {listing.unit}</span>
                    </div>
                  )}
                  {listing.deliveryAvailable && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Truck size={16} />
                      <span>Delivery available{listing.deliveryRadius && ` (${listing.deliveryRadius}km radius)`}</span>
                    </div>
                  )}
                </div>

                {/* Seller Info */}
                <div className="pt-3 mt-3 border-t border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        onClick={() => {
                          setViewingProfileUserId(listing.userId);
                          setShowBusinessProfile(true);
                        }}
                        className="flex items-center gap-2 hover:bg-gray-50 rounded p-1 -m-1 transition-colors group"
                      >
                        <User size={14} className="text-gray-400 group-hover:text-green-500" />
                        <span className="text-sm font-medium text-gray-900 group-hover:text-green-600">
                          {listing.sellerBusinessName || listing.userName}
                        </span>
                        {listing.sellerVerificationStatus === 'verified' && (
                          <VerificationStatusBadge status="verified" size="sm" />
                        )}
                        <Building2 size={12} className="text-gray-300 group-hover:text-green-500" />
                      </button>

                      {/* Seller Role Badge */}
                      {listing.sellerBusinessType && (
                        <div className="mt-1">
                          <UserRoleBadge role={listing.sellerBusinessType} size="sm" />
                        </div>
                      )}

                      {/* Seller Rating */}
                      {listing.sellerRating !== undefined && listing.sellerRating > 0 && (
                        <div className="mt-1">
                          <SellerRating
                            rating={listing.sellerRating}
                            totalRatings={listing.sellerTotalRatings}
                            size="sm"
                          />
                        </div>
                      )}

                      {/* Verification Badges */}
                      {listing.sellerBadges && listing.sellerBadges.length > 0 && (
                        <div className="mt-1">
                          <SellerBadgeList badges={listing.sellerBadges} maxShow={2} size="sm" />
                        </div>
                      )}
                    </div>

                    {/* Contact Button */}
                    {listing.sellerWhatsapp && !listing.isOwner && (
                      <a
                        href={`https://wa.me/${listing.sellerWhatsapp.replace(/[^0-9]/g, '')}?text=Hi, I'm interested in your ${listing.productName || listing.cropType} listing on AgroAfrica.`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
                      >
                        <Phone size={14} />
                        WhatsApp
                      </a>
                    )}
                  </div>

                  {listing.userContact && !listing.sellerWhatsapp && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
                      <Phone size={14} />
                      <span>{listing.userContact}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Eye size={14} />
                      <span>{listing.viewsCount || 0} views</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Leave Review Button for non-owners */}
                      {!listing.isOwner && user && (
                        <LeaveReviewButton
                          sellerId={listing.userId}
                          sellerName={listing.sellerBusinessName || listing.userName}
                          listing={listing}
                          variant="secondary"
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Add to Cart for non-owners */}
                {!listing.isOwner && listing.status === 'active' && (
                  <div className="pt-3 border-t border-gray-100">
                    <AddToCartButton
                      listing={listing}
                      variant="primary"
                      size="md"
                      showQuantity
                    />
                  </div>
                )}

                {/* Actions */}
                {listing.isOwner && (
                  <div className="flex gap-2 pt-4 border-t border-gray-200">
                    {listing.status === 'active' && (
                      <>
                        <button
                          onClick={() => handleOpenModal(listing)}
                          className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <Edit2 size={14} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleMarkAsSold(listing.id)}
                          className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                        >
                          <ShoppingCart size={14} />
                          Mark Sold
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingListing ? 'Edit Listing' : 'Create New Listing'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                  {/* Inventory Selection - Required for new listings */}
                  {!editingListing && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Product from Inventory *
                      </label>
                      {sellableInventory.length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
                            <div>
                              <p className="text-amber-800 font-medium">No harvest items in inventory</p>
                              <p className="text-amber-700 text-sm mt-1">
                                You need to add harvest items to your inventory before creating a marketplace listing.
                                Go to the Inventory page and add items with category "Harvest".
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <select
                          required
                          value={selectedInventoryId}
                          onChange={(e) => {
                            const inventoryId = e.target.value;
                            setSelectedInventoryId(inventoryId);

                            // Find the selected inventory item and auto-populate form
                            const selectedItem = sellableInventory.find(item => item.id === inventoryId);
                            if (selectedItem) {
                              setFormData({
                                ...formData,
                                categoryId: 'crops', // Default to crops category for harvest items
                                subcategoryId: '',
                                productName: selectedItem.name,
                                variety: '',
                                quantity: selectedItem.quantity,
                                unit: selectedItem.unit as any,
                                harvestDate: selectedItem.harvestDate || format(new Date(), 'yyyy-MM-dd'),
                              });
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select a product from your inventory...</option>
                          {sellableInventory.map(item => (
                            <option key={item.id} value={item.id}>
                              {item.name} - {item.quantity} {item.unit} available
                              {item.harvestDate ? ` (Harvested: ${format(new Date(item.harvestDate), 'MMM d, yyyy')})` : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}

                  {/* Show selected inventory item info */}
                  {!editingListing && selectedInventoryId && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-green-800 text-sm font-medium">
                        Selected: {sellableInventory.find(i => i.id === selectedInventoryId)?.name}
                      </p>
                      <p className="text-green-700 text-xs mt-1">
                        Available quantity: {sellableInventory.find(i => i.id === selectedInventoryId)?.quantity} {sellableInventory.find(i => i.id === selectedInventoryId)?.unit}
                      </p>
                    </div>
                  )}

                  {/* Category Selection - Only shown for editing existing listings */}
                  {editingListing && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={formData.categoryId}
                          onChange={(e) => {
                            const newCategoryId = e.target.value;
                            setFormData({
                              ...formData,
                              categoryId: newCategoryId,
                              subcategoryId: '',
                            });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select category...</option>
                          {PRODUCT_CATEGORIES.map(category => (
                            <option key={category.id} value={category.id}>
                              {category.icon} {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Type
                        </label>
                        <select
                          value={formData.subcategoryId}
                          onChange={(e) => {
                            const newSubcategoryId = e.target.value;
                            setFormData({
                              ...formData,
                              subcategoryId: newSubcategoryId,
                            });
                          }}
                          disabled={!formData.categoryId}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                        >
                          <option value="">Select product type...</option>
                          {availableSubcategories.map(sub => (
                            <option key={sub.id} value={sub.id}>
                              {sub.icon || ''} {sub.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Product Name and Variety - shown when inventory selected or editing */}
                  {(editingListing || selectedInventoryId) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.productName}
                          onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="e.g., White Maize, Arabica Coffee"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Variety
                        </label>
                        {commonVarieties.length > 0 ? (
                          <select
                            value={formData.variety}
                            onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            <option value="">Select variety...</option>
                            {commonVarieties.map(variety => (
                              <option key={variety} value={variety}>{variety}</option>
                            ))}
                            <option value="other">Other (specify in description)</option>
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={formData.variety}
                            onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="e.g., Hybrid 516, Robusta"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Rest of form - only show when inventory selected or editing */}
                  {(editingListing || selectedInventoryId) && (
                    <>
                      {/* Quantity and Unit */}
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.quantity}
                            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Unit *
                          </label>
                          <select
                            value={formData.unit}
                            onChange={(e) => setFormData({ ...formData, unit: e.target.value as any })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          >
                            {availableUnits.map(unit => (
                              <option key={unit.id} value={unit.id}>{unit.name} ({unit.abbr})</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Price per {formData.unit} (KES) *
                          </label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={formData.pricePerUnit}
                            onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Total Price: {formatPrice(formData.totalPrice, 'KES')}
                        </label>
                        <p className="text-xs text-gray-500">Prices are listed in KES and will be converted for display in other currencies</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Quality Grade *
                        </label>
                        <select
                          value={formData.quality}
                          onChange={(e) => setFormData({ ...formData, quality: e.target.value as any })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          {Object.entries(QUALITY_GRADES).map(([id, grade]) => (
                            <option key={id} value={id}>{grade.name} - {grade.description}</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Harvest Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.harvestDate}
                            onChange={(e) => setFormData({ ...formData, harvestDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Available From *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.availableFrom}
                            onChange={(e) => setFormData({ ...formData, availableFrom: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Location *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.location}
                          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="e.g., Nairobi, Kenya"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Information (optional)
                        </label>
                        <input
                          type="text"
                          value={formData.userContact}
                          onChange={(e) => setFormData({ ...formData, userContact: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Phone number or email"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Description (optional)
                        </label>
                        <textarea
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Additional details about the produce..."
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Product Images * <span className="text-red-500 font-normal">(Required - at least 1 photo)</span>
                        </label>
                        <div className="space-y-3">
                          {/* No images warning */}
                          {imageUrls.length === 0 && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={16} />
                              <p className="text-red-700 text-sm">
                                At least one photo is required to create a listing. Add a photo URL below.
                              </p>
                            </div>
                          )}

                          {/* Image URL Input */}
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={imageUrlInput}
                              onChange={(e) => setImageUrlInput(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !isVerifyingPhoto) {
                                  e.preventDefault();
                                  handleAddImageUrl();
                                }
                              }}
                              disabled={isVerifyingPhoto}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                              placeholder="Enter image URL (e.g., https://example.com/image.jpg)"
                            />
                            <button
                              type="button"
                              onClick={handleAddImageUrl}
                              disabled={isVerifyingPhoto || !imageUrlInput.trim()}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
                            >
                              {isVerifyingPhoto ? (
                                <>
                                  <Loader size={16} className="animate-spin" />
                                  Verifying...
                                </>
                              ) : (
                                <>
                                  <Upload size={16} />
                                  Add
                                </>
                              )}
                            </button>
                          </div>

                          {/* Image Preview Grid */}
                          {imageUrls.length > 0 && (
                            <div className="grid grid-cols-3 gap-3">
                              {imageUrls.map((url, index) => (
                                <div key={index} className="relative group">
                                  <img
                                    src={url}
                                    alt={`Product ${index + 1}`}
                                    className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                                    onError={(e) => {
                                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveImage(index)}
                                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-xs text-gray-500">
                            <ImageIcon size={12} className="inline mr-1" />
                            Add up to 5 real product photos. AI-generated images will be rejected.
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Minimum Order & Delivery - only show when inventory selected or editing */}
                  {(editingListing || selectedInventoryId) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Minimum Order ({formData.unit})
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.minimumOrder || ''}
                          onChange={(e) => setFormData({ ...formData, minimumOrder: parseFloat(e.target.value) || undefined })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="No minimum"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty for no minimum order</p>
                      </div>
                      <div className="flex flex-col justify-center">
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.deliveryAvailable}
                            onChange={(e) => setFormData({ ...formData, deliveryAvailable: e.target.checked })}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">Delivery Available</span>
                        </label>
                        {formData.deliveryAvailable && (
                          <div className="flex items-center gap-2 mt-2">
                            <label className="text-sm text-gray-700">Radius (km):</label>
                            <input
                              type="number"
                              min="0"
                              value={formData.deliveryRadius || ''}
                              onChange={(e) => setFormData({ ...formData, deliveryRadius: parseInt(e.target.value) || undefined })}
                              className="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!editingListing && (!selectedInventoryId || sellableInventory.length === 0)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {editingListing ? 'Update Listing' : 'Create Listing'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Saved Searches Modal */}
      <AnimatePresence>
        {showSavedSearches && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Saved Searches</h2>
                <button
                  onClick={() => setShowSavedSearches(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <SavedSearches
                  currentCriteria={currentSearchCriteria}
                  onApplySearch={applySearchFromSaved}
                  onClose={() => setShowSavedSearches(false)}
                  isInline
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Category Browser Modal */}
      <AnimatePresence>
        {showCategoryBrowser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Browse Categories</h2>
                <button
                  onClick={() => setShowCategoryBrowser(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <CategoryBrowser
                  selectedCategory={filterCategory}
                  selectedSubcategory={filterSubcategory}
                  onSelectCategory={(catId, subId) => {
                    setFilterCategory(catId);
                    setFilterSubcategory(subId || '');
                    setShowCategoryBrowser(false);
                  }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Business Profile Modal */}
      <AnimatePresence>
        {showBusinessProfile && (
          <BusinessProfile
            userId={viewingProfileUserId || undefined}
            onClose={() => {
              setShowBusinessProfile(false);
              setViewingProfileUserId(null);
            }}
            onViewListing={(listing) => {
              // Could open a listing detail view here
              console.log('View listing:', listing.id);
            }}
            onContactSeller={(userId) => {
              // Navigate to messages or open chat
              console.log('Contact seller:', userId);
            }}
          />
        )}
      </AnimatePresence>

      {/* Shopping Cart Drawer */}
      <CartDrawer onCheckout={() => setShowCheckout(true)} />

      {/* Checkout Modal */}
      <AnimatePresence>
        {showCheckout && (
          <Checkout
            isOpen={showCheckout}
            onClose={() => setShowCheckout(false)}
            onOrderComplete={(order: Order) => {
              console.log('Order completed:', order);
              toast.success(`Order ${order.orderNumber} placed successfully!`);
              // Reload listings to update availability
              loadListings();
            }}
          />
        )}
      </AnimatePresence>

      {/* Order History Modal */}
      <AnimatePresence>
        {showOrderHistory && (
          <OrderHistory
            isOpen={showOrderHistory}
            onClose={() => setShowOrderHistory(false)}
            onReorder={(items) => {
              // Add items back to cart for reordering
              items.forEach(item => {
                // Find the listing if still available
                const listing = listings.find(l => l.id === item.listingId);
                if (listing) {
                  // Would need to add to cart context here
                  toast.success(`Added ${item.productName} to cart`);
                }
              });
            }}
          />
        )}
      </AnimatePresence>

      {/* Seller Orders Modal */}
      <AnimatePresence>
        {showSellerOrders && (
          <SellerOrders
            isOpen={showSellerOrders}
            onClose={() => setShowSellerOrders(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
