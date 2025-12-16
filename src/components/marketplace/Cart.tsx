import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ShoppingCart, Trash2, Plus, Minus, Package,
  MapPin, Truck, ChevronRight, AlertCircle
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice, getPreferredCurrency } from '../../services/currency';
import type { CartItem } from '../../types';
import toast from 'react-hot-toast';

// ==========================================
// Cart Icon with Badge (for header)
// ==========================================
interface CartIconProps {
  onClick: () => void;
  className?: string;
}

export function CartIcon({ onClick, className = '' }: CartIconProps) {
  const { itemCount } = useCart();

  return (
    <button
      onClick={onClick}
      className={`relative p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingCart size={24} />
      {itemCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 bg-green-600 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
        >
          {itemCount > 99 ? '99+' : itemCount}
        </motion.span>
      )}
    </button>
  );
}

// ==========================================
// Add to Cart Button
// ==========================================
interface AddToCartButtonProps {
  listing: any; // MarketplaceListing
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  showQuantity?: boolean;
}

export function AddToCartButton({
  listing,
  variant = 'primary',
  size = 'md',
  showQuantity = false
}: AddToCartButtonProps) {
  const { user } = useAuth();
  const { addItem, updateQuantity, getItemQuantity, isInCart } = useCart();

  // Get minimum order quantity (default to 1 if not set)
  const minOrder = listing.minimumOrder || 1;

  const [quantity, setQuantity] = useState(minOrder);

  const currentQuantity = getItemQuantity(listing.id);
  const inCart = isInCart(listing.id);

  // Don't show for own listings
  if (listing.isOwner) return null;

  const handleAdd = () => {
    if (!user) {
      toast.error('Please sign in to add items to cart');
      return;
    }

    // Validate minimum order
    if (quantity < minOrder) {
      toast.error(`Minimum order is ${minOrder} ${listing.unit}`);
      return;
    }

    addItem(listing, quantity);
    setQuantity(minOrder);
  };

  const handleIncrement = () => {
    if (inCart) {
      updateQuantity(listing.id, currentQuantity + 1);
    } else {
      setQuantity((prev: number) => Math.min(prev + 1, listing.quantity));
    }
  };

  const handleDecrement = () => {
    if (inCart) {
      // Don't go below minimum order when in cart
      if (currentQuantity > minOrder) {
        updateQuantity(listing.id, currentQuantity - 1);
      } else {
        toast.error(`Minimum order is ${minOrder} ${listing.unit}`);
      }
    } else {
      // Don't go below minimum order when selecting quantity
      setQuantity((prev: number) => Math.max(minOrder, prev - 1));
    }
  };

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-2.5',
  };

  const variantClasses = {
    primary: 'bg-green-600 text-white hover:bg-green-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    icon: 'bg-green-50 text-green-600 hover:bg-green-100 p-2',
  };

  // If in cart and showing quantity controls
  if (inCart && showQuantity) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrement}
          disabled={currentQuantity <= minOrder}
          className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Minus size={16} />
        </button>
        <span className="w-8 text-center font-medium">{currentQuantity}</span>
        <button
          onClick={handleIncrement}
          disabled={currentQuantity >= listing.quantity}
          className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
        </button>
      </div>
    );
  }

  // Icon variant
  if (variant === 'icon') {
    return (
      <button
        onClick={handleAdd}
        className={`rounded-lg transition-colors ${variantClasses.icon}`}
        title="Add to cart"
      >
        {inCart ? (
          <span className="flex items-center gap-1">
            <ShoppingCart size={16} />
            <span className="text-xs font-medium">{currentQuantity}</span>
          </span>
        ) : (
          <Plus size={16} />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-2">
      {/* Minimum order notice */}
      {minOrder > 1 && !inCart && (
        <p className="text-xs text-orange-600 flex items-center gap-1">
          <AlertCircle size={12} />
          Min. order: {minOrder} {listing.unit}
        </p>
      )}
      <div className="flex items-center gap-2">
        {showQuantity && !inCart && (
          <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={handleDecrement}
              className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={quantity <= minOrder}
            >
              <Minus size={14} />
            </button>
            <span className="w-10 text-center text-sm">{quantity}</span>
            <button
              onClick={handleIncrement}
              className="p-1.5 hover:bg-gray-100 transition-colors disabled:opacity-50"
              disabled={quantity >= listing.quantity}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
        <button
          onClick={handleAdd}
          className={`rounded-lg font-medium transition-colors flex items-center gap-1.5 ${sizeClasses[size]} ${variantClasses[variant]}`}
        >
          <ShoppingCart size={size === 'sm' ? 14 : 16} />
          {inCart ? `In Cart (${currentQuantity})` : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}

// ==========================================
// Cart Item Row
// ==========================================
interface CartItemRowProps {
  item: CartItem;
  onRemove: () => void;
  onUpdateQuantity: (quantity: number) => void;
}

function CartItemRow({ item, onRemove, onUpdateQuantity }: CartItemRowProps) {
  const currency = getPreferredCurrency();
  const { listing } = item;
  const minOrder = listing.minimumOrder || 1;

  const handleDecrement = () => {
    if (item.quantity > minOrder) {
      onUpdateQuantity(item.quantity - 1);
    } else {
      toast.error(`Minimum order is ${minOrder} ${listing.unit}`);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex gap-3 p-3 bg-white rounded-lg border border-gray-100"
    >
      {/* Product Image */}
      <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden">
        {listing.images?.[0] ? (
          <img
            src={listing.images[0]}
            alt={listing.productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="text-gray-400" size={24} />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{listing.productName}</h4>
        <p className="text-sm text-gray-500">
          {formatPrice(item.priceAtAdd, currency)}/{listing.unit}
        </p>
        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
          <MapPin size={10} />
          {listing.location}
        </p>

        {/* Minimum order notice */}
        {minOrder > 1 && (
          <p className="text-xs text-orange-500 mt-0.5">
            Min: {minOrder} {listing.unit}
          </p>
        )}

        {/* Quantity Controls */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={handleDecrement}
            disabled={item.quantity <= minOrder}
            className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Minus size={14} />
          </button>
          <span className="w-10 text-center text-sm font-medium">
            {item.quantity} {listing.unit}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.quantity + 1)}
            disabled={item.quantity >= listing.quantity}
            className="p-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Price & Remove */}
      <div className="flex flex-col items-end justify-between">
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 size={16} />
        </button>
        <p className="font-semibold text-gray-900">
          {formatPrice(item.priceAtAdd * item.quantity, currency)}
        </p>
      </div>
    </motion.div>
  );
}

// ==========================================
// Cart Drawer
// ==========================================
interface CartDrawerProps {
  onCheckout: () => void;
}

export function CartDrawer({ onCheckout }: CartDrawerProps) {
  const { items, subtotal, isOpen, setIsOpen, removeItem, updateQuantity, clearCart } = useCart();
  const currency = getPreferredCurrency();

  // Group items by seller
  const itemsBySeller = items.reduce((acc, item) => {
    const sellerId = item.listing.userId;
    const sellerName = item.listing.sellerBusinessName || item.listing.userName;
    if (!acc[sellerId]) {
      acc[sellerId] = {
        sellerId,
        sellerName,
        items: [],
        subtotal: 0,
      };
    }
    acc[sellerId].items.push(item);
    acc[sellerId].subtotal += item.priceAtAdd * item.quantity;
    return acc;
  }, {} as Record<string, { sellerId: string; sellerName: string; items: CartItem[]; subtotal: number }>);

  const sellerGroups = Object.values(itemsBySeller);
  const hasMultipleSellers = sellerGroups.length > 1;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 bg-gray-50 z-50 flex flex-col shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
              <div className="flex items-center gap-2">
                <ShoppingCart className="text-green-600" size={24} />
                <h2 className="text-lg font-bold text-gray-900">Your Cart</h2>
                {items.length > 0 && (
                  <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingCart className="text-gray-300 mb-4" size={64} />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
                  <p className="text-gray-500 mb-4">Browse the marketplace and add products to your cart</p>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Browse Products
                  </button>
                </div>
              ) : (
                <>
                  {/* Multiple sellers notice */}
                  {hasMultipleSellers && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg text-sm">
                      <AlertCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                      <p className="text-blue-700">
                        You're ordering from {sellerGroups.length} different sellers. Each may have separate delivery.
                      </p>
                    </div>
                  )}

                  {/* Items grouped by seller */}
                  {sellerGroups.map((group) => (
                    <div key={group.sellerId} className="space-y-3">
                      {hasMultipleSellers && (
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-700">
                            From: {group.sellerName}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatPrice(group.subtotal, currency)}
                          </p>
                        </div>
                      )}
                      <AnimatePresence mode="popLayout">
                        {group.items.map((item) => (
                          <CartItemRow
                            key={item.id}
                            item={item}
                            onRemove={() => removeItem(item.listingId)}
                            onUpdateQuantity={(qty) => updateQuantity(item.listingId, qty)}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ))}

                  {/* Clear cart */}
                  <button
                    onClick={clearCart}
                    className="w-full py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Clear Cart
                  </button>
                </>
              )}
            </div>

            {/* Footer with totals and checkout */}
            {items.length > 0 && (
              <div className="p-4 bg-white border-t border-gray-200 space-y-3">
                {/* Delivery estimate */}
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Truck size={16} />
                  <span>Delivery details at checkout</span>
                </div>

                {/* Subtotal */}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(subtotal, currency)}
                  </span>
                </div>

                {/* Checkout button */}
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCheckout();
                  }}
                  className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  Proceed to Checkout
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default CartDrawer;
