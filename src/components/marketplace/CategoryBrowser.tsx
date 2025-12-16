import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronDown, Search, ArrowLeft, Package, Grid, List } from 'lucide-react';
import { PRODUCT_CATEGORIES, getCategoryById } from '../../constants/marketplaceCategories';
import type { ProductCategory } from '../../constants/marketplaceCategories';

interface CategoryBrowserProps {
  onSelectCategory: (categoryId: string, subcategoryId?: string) => void;
  selectedCategory?: string;
  selectedSubcategory?: string;
  showBackButton?: boolean;
  onBack?: () => void;
}

export function CategoryBrowser({
  onSelectCategory,
  selectedCategory,
  selectedSubcategory,
  showBackButton = false,
  onBack
}: CategoryBrowserProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(selectedCategory || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return PRODUCT_CATEGORIES;

    const query = searchQuery.toLowerCase();
    return PRODUCT_CATEGORIES.filter(category => {
      const matchesCategory = category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query);

      const matchesSubcategory = category.subcategories.some(sub =>
        sub.name.toLowerCase().includes(query) ||
        sub.commonVarieties?.some(v => v.toLowerCase().includes(query))
      );

      return matchesCategory || matchesSubcategory;
    }).map(category => {
      // If searching, also filter subcategories
      if (query) {
        const filteredSubs = category.subcategories.filter(sub =>
          sub.name.toLowerCase().includes(query) ||
          sub.commonVarieties?.some(v => v.toLowerCase().includes(query))
        );
        return {
          ...category,
          subcategories: filteredSubs.length > 0 ? filteredSubs : category.subcategories
        };
      }
      return category;
    });
  }, [searchQuery]);

  // Get listing counts per category (mock data - would come from API in real app)
  const getCategoryCount = (categoryId: string): number => {
    // This would be replaced with actual API data
    const mockCounts: Record<string, number> = {
      grains: 24, legumes: 18, vegetables: 45, fruits: 32,
      roots_tubers: 12, cash_crops: 28, herbs_spices: 15, oilseeds: 8,
      livestock: 22, animal_products: 19, processed: 14, inputs: 11
    };
    return mockCounts[categoryId] || 0;
  };

  const handleCategoryClick = (category: ProductCategory) => {
    if (expandedCategory === category.id) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category.id);
    }
  };

  const handleSelectCategory = (categoryId: string) => {
    onSelectCategory(categoryId);
  };

  const handleSelectSubcategory = (categoryId: string, subcategoryId: string) => {
    onSelectCategory(categoryId, subcategoryId);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {showBackButton && onBack && (
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">Browse Categories</h2>
              <p className="text-sm text-gray-600">Find products by category</p>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search categories or products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="p-4">
        {filteredCategories.length === 0 ? (
          <div className="text-center py-8">
            <Package className="mx-auto text-gray-400 mb-3" size={48} />
            <p className="text-gray-600">No categories found matching "{searchQuery}"</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.02 }}
                className={`relative bg-gradient-to-br from-gray-50 to-white border-2 rounded-xl p-4 cursor-pointer transition-all ${
                  selectedCategory === category.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-green-300'
                }`}
                onClick={() => handleSelectCategory(category.id)}
              >
                {/* Category Icon */}
                <div className="text-4xl mb-3">{category.icon}</div>

                {/* Category Name */}
                <h3 className="font-semibold text-gray-900 mb-1">{category.name}</h3>

                {/* Description */}
                <p className="text-xs text-gray-500 mb-2 line-clamp-2">{category.description}</p>

                {/* Subcategory count */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">{category.subcategories.length} types</span>
                  <span className="text-green-600 font-medium">{getCategoryCount(category.id)} listings</span>
                </div>

                {/* Expand indicator */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCategoryClick(category);
                  }}
                  className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <ChevronDown
                    size={16}
                    className={`text-gray-400 transition-transform ${
                      expandedCategory === category.id ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Expanded Subcategories */}
                <AnimatePresence>
                  {expandedCategory === category.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 pt-3 border-t border-gray-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-wrap gap-1">
                        {category.subcategories.slice(0, 6).map((sub) => (
                          <button
                            key={sub.id}
                            onClick={() => handleSelectSubcategory(category.id, sub.id)}
                            className={`text-xs px-2 py-1 rounded-full transition-colors ${
                              selectedSubcategory === sub.id
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-green-100'
                            }`}
                          >
                            {sub.name}
                          </button>
                        ))}
                        {category.subcategories.length > 6 && (
                          <span className="text-xs text-gray-400 px-2 py-1">
                            +{category.subcategories.length - 6} more
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        ) : (
          /* List View */
          <div className="space-y-2">
            {filteredCategories.map((category) => (
              <div key={category.id}>
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all ${
                    selectedCategory === category.id
                      ? 'bg-green-50 border border-green-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleCategoryClick(category)}
                >
                  {/* Icon */}
                  <span className="text-3xl">{category.icon}</span>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{category.name}</h3>
                    <p className="text-sm text-gray-500">{category.description}</p>
                  </div>

                  {/* Stats */}
                  <div className="text-right">
                    <span className="text-sm font-medium text-green-600">{getCategoryCount(category.id)} listings</span>
                    <p className="text-xs text-gray-400">{category.subcategories.length} types</p>
                  </div>

                  {/* Expand Arrow */}
                  <ChevronRight
                    size={20}
                    className={`text-gray-400 transition-transform ${
                      expandedCategory === category.id ? 'rotate-90' : ''
                    }`}
                  />
                </motion.div>

                {/* Expanded Subcategories */}
                <AnimatePresence>
                  {expandedCategory === category.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-14 mt-1 mb-2"
                    >
                      <div className="bg-gray-50 rounded-lg p-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {category.subcategories.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => handleSelectSubcategory(category.id, sub.id)}
                              className={`text-left p-2 rounded-lg transition-colors ${
                                selectedSubcategory === sub.id
                                  ? 'bg-green-500 text-white'
                                  : 'hover:bg-white text-gray-700'
                              }`}
                            >
                              <div className="font-medium text-sm">{sub.name}</div>
                              {sub.commonVarieties && sub.commonVarieties.length > 0 && (
                                <div className={`text-xs mt-0.5 ${
                                  selectedSubcategory === sub.id ? 'text-green-100' : 'text-gray-400'
                                }`}>
                                  {sub.commonVarieties.slice(0, 2).join(', ')}
                                  {sub.commonVarieties.length > 2 && '...'}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>

                        {/* View All Button */}
                        <button
                          onClick={() => handleSelectCategory(category.id)}
                          className="mt-3 w-full py-2 text-sm text-green-600 hover:text-green-700 font-medium flex items-center justify-center gap-1"
                        >
                          View all {category.name}
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Categories (Popular) */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Categories</h3>
        <div className="flex flex-wrap gap-2">
          {['vegetables', 'fruits', 'grains', 'livestock', 'cash_crops'].map((catId) => {
            const category = getCategoryById(catId);
            if (!category) return null;
            return (
              <button
                key={catId}
                onClick={() => handleSelectCategory(catId)}
                className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1 transition-colors ${
                  selectedCategory === catId
                    ? 'bg-green-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50'
                }`}
              >
                <span>{category.icon}</span>
                <span>{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compact Category Chips for displaying selected filter
interface CategoryChipProps {
  categoryId: string;
  subcategoryId?: string;
  onRemove: () => void;
}

export function CategoryChip({ categoryId, subcategoryId, onRemove }: CategoryChipProps) {
  const category = getCategoryById(categoryId);
  if (!category) return null;

  const subcategory = subcategoryId
    ? category.subcategories.find(s => s.id === subcategoryId)
    : null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm">
      <span>{category.icon}</span>
      <span>{subcategory ? subcategory.name : category.name}</span>
      <button
        onClick={onRemove}
        className="ml-1 p-0.5 hover:bg-green-200 rounded-full transition-colors"
      >
        <span className="sr-only">Remove</span>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// Category Grid for Homepage/Landing
export function CategoryGrid({ onSelectCategory }: { onSelectCategory: (categoryId: string) => void }) {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {PRODUCT_CATEGORIES.map((category) => (
        <motion.button
          key={category.id}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectCategory(category.id)}
          className="flex flex-col items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all"
        >
          <span className="text-3xl mb-2">{category.icon}</span>
          <span className="text-sm font-medium text-gray-700 text-center">{category.name}</span>
        </motion.button>
      ))}
    </div>
  );
}
