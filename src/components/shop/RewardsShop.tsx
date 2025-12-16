import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingBag,
  Gift,
  Coins,
  ChevronRight,
  Package,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  useRewardItems,
  useFeaturedRewardItems,
  useUserPoints,
  useUserRedemptions,
  useRedeemItem,
  getRewardCategoryInfo,
  getRedemptionStatusInfo,
  canAffordItem,
  isInStock,
  formatPoints,
  getAllRewardCategories,
} from '../../hooks/useRewardsShop';
import type { RewardItem, RewardCategory } from '../../types';

interface RewardsShopProps {
  userId: string | undefined;
}

export default function RewardsShop({ userId }: RewardsShopProps) {
  const { t, i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';

  const { data: userPoints } = useUserPoints(userId);
  const { data: featuredItems } = useFeaturedRewardItems();
  const { data: allItems } = useRewardItems();
  const { data: redemptions } = useUserRedemptions(userId);
  const redeemMutation = useRedeemItem();

  const [activeTab, setActiveTab] = useState<'shop' | 'orders'>('shop');
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<RewardItem | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');

  const categories = getAllRewardCategories();
  const points = userPoints?.totalPoints || 0;

  // Filter items
  const filteredItems = allItems?.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleRedeem = async () => {
    if (!userId || !selectedItem) return;

    try {
      await redeemMutation.mutateAsync({
        userId,
        itemId: selectedItem.id,
        deliveryAddress: deliveryAddress || undefined,
        deliveryPhone: deliveryPhone || undefined,
      });
      setSelectedItem(null);
      setDeliveryAddress('');
      setDeliveryPhone('');
      setActiveTab('orders');
    } catch (error) {
      console.error('Failed to redeem:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Points Balance */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16" />

        <div className="relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
                <Coins className="w-7 h-7" />
              </div>
              <div>
                <p className="text-violet-100 text-sm">{t('shop.yourBalance', 'Your Balance')}</p>
                <p className="text-3xl font-bold">{formatPoints(points)} <span className="text-lg font-normal">pts</span></p>
              </div>
            </div>
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8" />
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-violet-200" />
              <span className="text-violet-100">
                {userPoints?.lifetimePoints || 0} {t('shop.lifetimeEarned', 'lifetime earned')}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('shop')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'shop'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          {t('shop.tab.shop', 'Shop')}
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Package className="w-4 h-4" />
          {t('shop.tab.orders', 'My Orders')}
          {redemptions && redemptions.length > 0 && (
            <span className="px-1.5 py-0.5 bg-violet-500 text-white text-xs rounded-full">
              {redemptions.length}
            </span>
          )}
        </button>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'shop' && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            {/* Search and Filter */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={t('shop.search', 'Search items...')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-violet-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {t('shop.all', 'All')}
              </button>
              {categories.map((category) => {
                const info = getRewardCategoryInfo(category);
                return (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      selectedCategory === category
                        ? 'bg-violet-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {info.icon} {isSwahili ? info.nameSw : info.name}
                  </button>
                );
              })}
            </div>

            {/* Featured Section */}
            {selectedCategory === 'all' && featuredItems && featuredItems.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-violet-500" />
                  {t('shop.featured', 'Featured Items')}
                </h3>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                  {featuredItems.map((item) => (
                    <FeaturedItemCard
                      key={item.id}
                      item={item}
                      userPoints={points}
                      isSwahili={isSwahili}
                      onClick={() => setSelectedItem(item)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Items Grid */}
            <div className="grid grid-cols-2 gap-3">
              {filteredItems && filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    userPoints={points}
                    isSwahili={isSwahili}
                    onClick={() => setSelectedItem(item)}
                  />
                ))
              ) : (
                <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {t('shop.noItems', 'No items found')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'orders' && (
          <motion.div
            key="orders"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {redemptions && redemptions.length > 0 ? (
              redemptions.map((redemption) => (
                <OrderCard key={redemption.id} redemption={redemption} isSwahili={isSwahili} />
              ))
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                <Package className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p className="text-gray-500 dark:text-gray-400">
                  {t('shop.noOrders', 'No orders yet')}
                </p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  {t('shop.startShopping', 'Redeem your points for rewards!')}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Item Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Item Image */}
              {selectedItem.imageUrl ? (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name}
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-6xl">
                    {getRewardCategoryInfo(selectedItem.category).icon}
                  </span>
                </div>
              )}

              <div className="p-4 space-y-4">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {isSwahili && selectedItem.nameSw ? selectedItem.nameSw : selectedItem.name}
                      </h3>
                      {selectedItem.partnerName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {t('shop.by', 'by')} {selectedItem.partnerName}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedItem(null)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-2">
                    {isSwahili && selectedItem.descriptionSw
                      ? selectedItem.descriptionSw
                      : selectedItem.description}
                  </p>
                </div>

                {/* Price and Stock */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('shop.price', 'Price')}</p>
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {selectedItem.pointsCost} pts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('shop.stock', 'Stock')}</p>
                    <p className={`font-medium ${
                      selectedItem.stockQuantity === -1
                        ? 'text-emerald-600'
                        : selectedItem.stockQuantity > 10
                        ? 'text-emerald-600'
                        : selectedItem.stockQuantity > 0
                        ? 'text-amber-600'
                        : 'text-red-600'
                    }`}>
                      {selectedItem.stockQuantity === -1
                        ? t('shop.unlimited', 'Unlimited')
                        : selectedItem.stockQuantity > 0
                        ? `${selectedItem.stockQuantity} ${t('shop.left', 'left')}`
                        : t('shop.outOfStock', 'Out of stock')}
                    </p>
                  </div>
                </div>

                {/* Delivery Info */}
                {selectedItem.category !== 'vouchers' && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {t('shop.deliveryInfo', 'Delivery Information')}
                    </h4>
                    <input
                      type="text"
                      placeholder={t('shop.address', 'Delivery Address')}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                    <input
                      type="tel"
                      placeholder={t('shop.phone', 'Phone Number')}
                      value={deliveryPhone}
                      onChange={(e) => setDeliveryPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                )}

                {/* Redeem Button */}
                <button
                  onClick={handleRedeem}
                  disabled={
                    !canAffordItem(points, selectedItem.pointsCost) ||
                    !isInStock(selectedItem.stockQuantity) ||
                    redeemMutation.isPending
                  }
                  className={`w-full py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors ${
                    canAffordItem(points, selectedItem.pointsCost) && isInStock(selectedItem.stockQuantity)
                      ? 'bg-violet-600 text-white hover:bg-violet-700'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {redeemMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : !isInStock(selectedItem.stockQuantity) ? (
                    t('shop.outOfStock', 'Out of Stock')
                  ) : !canAffordItem(points, selectedItem.pointsCost) ? (
                    <>
                      {t('shop.needMore', 'Need')} {selectedItem.pointsCost - points} {t('shop.morePoints', 'more points')}
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-5 h-5" />
                      {t('shop.redeem', 'Redeem for')} {selectedItem.pointsCost} pts
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Featured Item Card
function FeaturedItemCard({
  item,
  userPoints,
  isSwahili,
  onClick,
}: {
  item: RewardItem;
  userPoints: number;
  isSwahili: boolean;
  onClick: () => void;
}) {
  const categoryInfo = getRewardCategoryInfo(item.category);
  const affordable = canAffordItem(userPoints, item.pointsCost);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="flex-shrink-0 w-40 bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all text-left"
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-24 object-cover" />
      ) : (
        <div className="w-full h-24 bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
          <span className="text-4xl">{categoryInfo.icon}</span>
        </div>
      )}
      <div className="p-3">
        <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-1">
          {isSwahili && item.nameSw ? item.nameSw : item.name}
        </p>
        <p className={`text-sm font-bold ${affordable ? 'text-violet-600' : 'text-gray-400'}`}>
          {item.pointsCost} pts
        </p>
      </div>
    </motion.button>
  );
}

// Item Card
function ItemCard({
  item,
  userPoints,
  isSwahili,
  onClick,
}: {
  item: RewardItem;
  userPoints: number;
  isSwahili: boolean;
  onClick: () => void;
}) {
  const categoryInfo = getRewardCategoryInfo(item.category);
  const affordable = canAffordItem(userPoints, item.pointsCost);
  const inStock = isInStock(item.stockQuantity);

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      disabled={!inStock}
      className={`bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 text-left transition-all ${
        inStock ? 'hover:shadow-md' : 'opacity-60'
      }`}
    >
      {item.imageUrl ? (
        <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover" />
      ) : (
        <div className="w-full h-28 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center">
          <span className="text-4xl">{categoryInfo.icon}</span>
        </div>
      )}
      <div className="p-3">
        <p className="font-medium text-gray-900 dark:text-white text-sm line-clamp-2">
          {isSwahili && item.nameSw ? item.nameSw : item.name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p className={`text-sm font-bold ${affordable ? 'text-violet-600' : 'text-gray-400'}`}>
            {item.pointsCost} pts
          </p>
          {item.partnerName && (
            <p className="text-xs text-gray-400 truncate max-w-[60%]">{item.partnerName}</p>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// Order Card
function OrderCard({
  redemption,
  isSwahili,
}: {
  redemption: {
    id: string;
    pointsSpent: number;
    status: string;
    redemptionCode?: string;
    createdAt: string;
    itemName?: string;
    itemNameSw?: string;
    itemCategory?: string;
  };
  isSwahili: boolean;
}) {
  const statusInfo = getRedemptionStatusInfo(redemption.status as any);
  const categoryInfo = getRewardCategoryInfo(redemption.itemCategory as any || 'vouchers');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700"
    >
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-2xl">
          {categoryInfo.icon}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">
            {isSwahili && redemption.itemNameSw ? redemption.itemNameSw : redemption.itemName}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {redemption.pointsSpent} pts • {new Date(redemption.createdAt).toLocaleDateString()}
          </p>
          {redemption.redemptionCode && (
            <p className="text-xs font-mono text-violet-600 dark:text-violet-400 mt-1">
              Code: {redemption.redemptionCode}
            </p>
          )}
        </div>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium bg-${statusInfo.color}-100 dark:bg-${statusInfo.color}-900/30 text-${statusInfo.color}-600 dark:text-${statusInfo.color}-400`}
        >
          {statusInfo.icon} {isSwahili ? statusInfo.nameSw : statusInfo.name}
        </span>
      </div>
    </motion.div>
  );
}

// Compact widget for dashboard
export function ShopWidget({ userId, onClick }: { userId: string | undefined; onClick?: () => void }) {
  const { t } = useTranslation();
  const { data: userPoints } = useUserPoints(userId);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="w-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-lg p-3 text-white text-left hover:shadow-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5" />
          <div>
            <p className="text-sm font-medium">{t('shop.rewardsShop', 'Rewards Shop')}</p>
            <p className="text-xs text-violet-100">
              {formatPoints(userPoints?.totalPoints || 0)} {t('shop.pointsAvailable', 'points available')}
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" />
      </div>
    </motion.button>
  );
}
