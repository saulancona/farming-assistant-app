import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import type { CartItem, MarketplaceListing } from '../types';
import toast from 'react-hot-toast';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isLoading: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  addItem: (listing: MarketplaceListing, quantity?: number) => void;
  removeItem: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (listingId: string) => number;
  isInCart: (listingId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'agroafrica_cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    loadCart();
  }, [user]);

  const loadCart = () => {
    try {
      const storageKey = user ? `${CART_STORAGE_KEY}_${user.id}` : CART_STORAGE_KEY;
      const savedCart = localStorage.getItem(storageKey);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setItems(parsedCart.items || []);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      saveCart();
    }
  }, [items, isLoading, user]);

  const saveCart = () => {
    try {
      const storageKey = user ? `${CART_STORAGE_KEY}_${user.id}` : CART_STORAGE_KEY;
      const cartData = {
        items,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(storageKey, JSON.stringify(cartData));
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  // Calculate totals
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + (item.priceAtAdd * item.quantity), 0);

  const addItem = useCallback((listing: MarketplaceListing, quantity: number = 1) => {
    // Don't allow adding own listings
    if (listing.isOwner) {
      toast.error("You can't add your own listing to cart");
      return;
    }

    setItems(currentItems => {
      const existingItemIndex = currentItems.findIndex(item => item.listingId === listing.id);

      if (existingItemIndex >= 0) {
        // Update existing item quantity
        const updatedItems = [...currentItems];
        const existingItem = updatedItems[existingItemIndex];
        const newQuantity = existingItem.quantity + quantity;

        // Check if new quantity exceeds available
        if (newQuantity > listing.quantity) {
          toast.error(`Only ${listing.quantity} ${listing.unit} available`);
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: listing.quantity,
          };
        } else {
          updatedItems[existingItemIndex] = {
            ...existingItem,
            quantity: newQuantity,
          };
          toast.success(`Updated quantity to ${newQuantity} ${listing.unit}`);
        }
        return updatedItems;
      } else {
        // Add new item
        const newItem: CartItem = {
          id: `cart_${listing.id}_${Date.now()}`,
          listingId: listing.id,
          listing,
          quantity: Math.min(quantity, listing.quantity),
          priceAtAdd: listing.pricePerUnit,
          addedAt: new Date().toISOString(),
        };
        toast.success(`Added ${listing.productName} to cart`);
        return [...currentItems, newItem];
      }
    });
  }, []);

  const removeItem = useCallback((listingId: string) => {
    setItems(currentItems => {
      const item = currentItems.find(i => i.listingId === listingId);
      if (item) {
        toast.success(`Removed ${item.listing.productName} from cart`);
      }
      return currentItems.filter(item => item.listingId !== listingId);
    });
  }, []);

  const updateQuantity = useCallback((listingId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(listingId);
      return;
    }

    setItems(currentItems => {
      return currentItems.map(item => {
        if (item.listingId === listingId) {
          const maxQuantity = item.listing.quantity;
          if (quantity > maxQuantity) {
            toast.error(`Only ${maxQuantity} ${item.listing.unit} available`);
            return { ...item, quantity: maxQuantity };
          }
          return { ...item, quantity };
        }
        return item;
      });
    });
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    toast.success('Cart cleared');
  }, []);

  const getItemQuantity = useCallback((listingId: string): number => {
    const item = items.find(i => i.listingId === listingId);
    return item?.quantity || 0;
  }, [items]);

  const isInCart = useCallback((listingId: string): boolean => {
    return items.some(item => item.listingId === listingId);
  }, [items]);

  const value: CartContextType = {
    items,
    itemCount,
    subtotal,
    isLoading,
    isOpen,
    setIsOpen,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    isInCart,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
