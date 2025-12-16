import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ChevronLeft, ChevronRight, MapPin, Truck, Package,
  CreditCard, Phone, CheckCircle, Calendar,
  Clock, User, Mail
} from 'lucide-react';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatPrice, getPreferredCurrency } from '../../services/currency';
import { createOrder, type CreateOrderData } from '../../services/database';
import { showNewOrderNotification } from '../../services/notifications';
import type { DeliveryDetails, PaymentMethod, Order } from '../../types';
import toast from 'react-hot-toast';

interface CheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  onOrderComplete: (order: Order) => void;
}

type CheckoutStep = 'delivery' | 'payment' | 'review' | 'confirm';

const DELIVERY_TIME_SLOTS = [
  { id: 'morning', label: 'Morning', time: '8:00 AM - 12:00 PM' },
  { id: 'afternoon', label: 'Afternoon', time: '12:00 PM - 4:00 PM' },
  { id: 'evening', label: 'Evening', time: '4:00 PM - 8:00 PM' },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; description: string; icon: React.ReactNode }[] = [
  {
    id: 'mpesa',
    label: 'M-Pesa',
    description: 'Pay with M-Pesa mobile money',
    icon: <Phone size={20} />,
  },
  {
    id: 'cash_on_delivery',
    label: 'Cash on Delivery',
    description: 'Pay when you receive your order',
    icon: <CreditCard size={20} />,
  },
  {
    id: 'bank_transfer',
    label: 'Bank Transfer',
    description: 'Pay via bank transfer',
    icon: <CreditCard size={20} />,
  },
];

export function Checkout({ isOpen, onClose, onOrderComplete }: CheckoutProps) {
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const currency = getPreferredCurrency();

  const [step, setStep] = useState<CheckoutStep>('delivery');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delivery form state
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails>({
    method: 'delivery',
    address: '',
    city: '',
    region: '',
    country: 'Kenya',
    deliveryDate: '',
    deliveryTimeSlot: '',
    instructions: '',
  });

  // Contact info
  const [contactInfo, setContactInfo] = useState({
    name: user?.user_metadata?.name || '',
    phone: '',
    email: user?.email || '',
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mpesa');
  const [notes, setNotes] = useState('');

  // Fees
  const deliveryFee = deliveryDetails.method === 'delivery' ? 200 : 0;
  const serviceFee = Math.round(subtotal * 0.02); // 2% service fee
  const total = subtotal + deliveryFee + serviceFee;

  // Get minimum delivery date (tomorrow)
  const getMinDeliveryDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const validateDeliveryStep = () => {
    if (!contactInfo.name.trim()) {
      toast.error('Please enter your name');
      return false;
    }
    if (!contactInfo.phone.trim()) {
      toast.error('Please enter your phone number');
      return false;
    }
    if (deliveryDetails.method === 'delivery') {
      if (!deliveryDetails.address?.trim()) {
        toast.error('Please enter your delivery address');
        return false;
      }
      if (!deliveryDetails.city?.trim()) {
        toast.error('Please enter your city');
        return false;
      }
    }
    if (!deliveryDetails.deliveryDate) {
      toast.error('Please select a delivery date');
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (step === 'delivery') {
      if (!validateDeliveryStep()) return;
      setStep('payment');
    } else if (step === 'payment') {
      setStep('review');
    } else if (step === 'review') {
      handlePlaceOrder();
    }
  };

  const handlePreviousStep = () => {
    if (step === 'payment') setStep('delivery');
    else if (step === 'review') setStep('payment');
  };

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);

    try {
      // Build order data for database
      const orderData: CreateOrderData = {
        buyerName: contactInfo.name,
        buyerPhone: contactInfo.phone,
        buyerEmail: contactInfo.email || undefined,
        deliveryMethod: deliveryDetails.method,
        deliveryAddress: deliveryDetails.address,
        deliveryCity: deliveryDetails.city,
        deliveryRegion: deliveryDetails.region,
        deliveryDate: deliveryDetails.deliveryDate,
        deliveryTimeSlot: deliveryDetails.deliveryTimeSlot,
        deliveryInstructions: deliveryDetails.instructions,
        items: items.map(item => ({
          listingId: item.listingId,
          sellerId: item.listing.userId,
          sellerName: item.listing.sellerBusinessName || item.listing.userName,
          sellerPhone: item.listing.userContact,
          sellerWhatsapp: item.listing.sellerWhatsapp,
          productName: item.listing.productName,
          variety: item.listing.variety,
          quantity: item.quantity,
          unit: item.listing.unit,
          pricePerUnit: item.priceAtAdd,
          totalPrice: item.priceAtAdd * item.quantity,
        })),
        subtotal,
        deliveryFee,
        serviceFee,
        total,
        paymentMethod,
        buyerNotes: notes || undefined,
      };

      // Save order to database
      const savedOrder = await createOrder(orderData);

      // Build order object for callback
      const order: Order = {
        id: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        userId: savedOrder.buyerId,
        buyerName: savedOrder.buyerName,
        buyerPhone: savedOrder.buyerPhone,
        buyerEmail: savedOrder.buyerEmail,
        items: savedOrder.items.map(item => ({
          id: item.id,
          listingId: item.listingId || '',
          productName: item.productName,
          variety: item.variety,
          quantity: item.quantity,
          unit: item.unit,
          pricePerUnit: item.pricePerUnit,
          totalPrice: item.totalPrice,
          sellerId: item.sellerId,
          sellerName: item.sellerName,
          sellerPhone: item.sellerPhone,
          sellerWhatsapp: item.sellerWhatsapp,
        })),
        delivery: deliveryDetails,
        subtotal: savedOrder.subtotal,
        deliveryFee: savedOrder.deliveryFee,
        serviceFee: savedOrder.serviceFee,
        total: savedOrder.total,
        paymentMethod: savedOrder.paymentMethod as PaymentMethod,
        paymentStatus: savedOrder.paymentStatus as 'pending' | 'paid' | 'failed' | 'refunded',
        status: savedOrder.status as 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded',
        statusHistory: [
          {
            status: 'pending',
            timestamp: savedOrder.createdAt,
            note: 'Order placed',
          },
        ],
        notes,
        createdAt: savedOrder.createdAt,
        updatedAt: savedOrder.updatedAt || savedOrder.createdAt,
      };

      // Show confirmation
      setStep('confirm');

      // Send notification to sellers about their new orders
      // Group items by seller and notify each one
      const itemsBySeller = savedOrder.items.reduce((acc: Record<string, typeof savedOrder.items>, item: typeof savedOrder.items[0]) => {
        if (!acc[item.sellerId]) {
          acc[item.sellerId] = [];
        }
        acc[item.sellerId].push(item);
        return acc;
      }, {});

      // Notify each seller (this shows notification if they have permissions)
      for (const sellerItems of Object.values(itemsBySeller)) {
        const firstItem = sellerItems[0];
        const totalForSeller = sellerItems.reduce((sum: number, item: typeof firstItem) => sum + item.totalPrice, 0);
        const productNames = sellerItems.map((item: typeof firstItem) => item.productName).join(', ');

        // Try to show notification (will only work if user has granted permission)
        showNewOrderNotification(
          savedOrder.orderNumber,
          contactInfo.name,
          productNames,
          sellerItems.length > 1 ? sellerItems.length : firstItem.quantity,
          sellerItems.length > 1 ? 'items' : firstItem.unit,
          totalForSeller,
          currency
        ).catch(() => {
          // Notification failed (permissions not granted, etc.) - that's OK
        });
      }

      // Clear cart and notify parent
      clearCart();
      onOrderComplete(order);
    } catch (error) {
      console.error('Error placing order:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

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
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {step !== 'confirm' && step !== 'delivery' && (
              <button
                onClick={handlePreviousStep}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
            )}
            <h2 className="text-xl font-bold text-gray-900">
              {step === 'delivery' && 'Delivery Details'}
              {step === 'payment' && 'Payment Method'}
              {step === 'review' && 'Review Order'}
              {step === 'confirm' && 'Order Confirmed'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Progress Steps */}
        {step !== 'confirm' && (
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between">
              {(['delivery', 'payment', 'review'] as CheckoutStep[]).map((s, index) => (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step === s
                        ? 'bg-green-600 text-white'
                        : index < ['delivery', 'payment', 'review'].indexOf(step)
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < 2 && (
                    <div
                      className={`w-20 sm:w-32 h-1 mx-2 rounded ${
                        index < ['delivery', 'payment', 'review'].indexOf(step)
                          ? 'bg-green-500'
                          : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <AnimatePresence mode="wait">
            {/* Delivery Step */}
            {step === 'delivery' && (
              <motion.div
                key="delivery"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Contact Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          value={contactInfo.name}
                          onChange={(e) => setContactInfo({ ...contactInfo, name: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="John Doe"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="tel"
                          value={contactInfo.phone}
                          onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="+254..."
                        />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email (optional)
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })}
                        className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery Method */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Delivery Method</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setDeliveryDetails({ ...deliveryDetails, method: 'delivery' })}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        deliveryDetails.method === 'delivery'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Truck className={deliveryDetails.method === 'delivery' ? 'text-green-600' : 'text-gray-400'} size={24} />
                      <p className="font-medium text-gray-900 mt-2">Delivery</p>
                      <p className="text-sm text-gray-500">+{formatPrice(200, currency)}</p>
                    </button>
                    <button
                      onClick={() => setDeliveryDetails({ ...deliveryDetails, method: 'pickup' })}
                      className={`p-4 border-2 rounded-lg text-left transition-colors ${
                        deliveryDetails.method === 'pickup'
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Package className={deliveryDetails.method === 'pickup' ? 'text-green-600' : 'text-gray-400'} size={24} />
                      <p className="font-medium text-gray-900 mt-2">Pickup</p>
                      <p className="text-sm text-gray-500">Free</p>
                    </button>
                  </div>
                </div>

                {/* Address (for delivery) */}
                {deliveryDetails.method === 'delivery' && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900">Delivery Address</h3>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Street Address *
                      </label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-3 text-gray-400" size={18} />
                        <textarea
                          value={deliveryDetails.address}
                          onChange={(e) => setDeliveryDetails({ ...deliveryDetails, address: e.target.value })}
                          rows={2}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Building name, street, area..."
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          City *
                        </label>
                        <input
                          type="text"
                          value={deliveryDetails.city}
                          onChange={(e) => setDeliveryDetails({ ...deliveryDetails, city: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Nairobi"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Region
                        </label>
                        <input
                          type="text"
                          value={deliveryDetails.region}
                          onChange={(e) => setDeliveryDetails({ ...deliveryDetails, region: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="Nairobi County"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Delivery Date & Time */}
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">
                    {deliveryDetails.method === 'delivery' ? 'Delivery' : 'Pickup'} Date & Time
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="date"
                          value={deliveryDetails.deliveryDate}
                          onChange={(e) => setDeliveryDetails({ ...deliveryDetails, deliveryDate: e.target.value })}
                          min={getMinDeliveryDate()}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Slot
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                          value={deliveryDetails.deliveryTimeSlot}
                          onChange={(e) => setDeliveryDetails({ ...deliveryDetails, deliveryTimeSlot: e.target.value })}
                          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="">Select time</option>
                          {DELIVERY_TIME_SLOTS.map(slot => (
                            <option key={slot.id} value={slot.id}>
                              {slot.label} ({slot.time})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Instructions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Instructions (optional)
                  </label>
                  <textarea
                    value={deliveryDetails.instructions}
                    onChange={(e) => setDeliveryDetails({ ...deliveryDetails, instructions: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Gate code, landmark, etc..."
                  />
                </div>
              </motion.div>
            )}

            {/* Payment Step */}
            {step === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-medium text-gray-900">Select Payment Method</h3>
                <div className="space-y-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id)}
                      className={`w-full p-4 border-2 rounded-lg text-left flex items-center gap-4 transition-colors ${
                        paymentMethod === method.id
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`p-2 rounded-lg ${paymentMethod === method.id ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        {method.icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{method.label}</p>
                        <p className="text-sm text-gray-500">{method.description}</p>
                      </div>
                      {paymentMethod === method.id && (
                        <CheckCircle className="ml-auto text-green-600" size={20} />
                      )}
                    </button>
                  ))}
                </div>

                {/* Order Notes */}
                <div className="pt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Order Notes (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Any special requests for the seller..."
                  />
                </div>
              </motion.div>
            )}

            {/* Review Step */}
            {step === 'review' && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Order Summary */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Order Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-lg overflow-hidden flex items-center justify-center">
                            {item.listing.images?.[0] ? (
                              <img src={item.listing.images[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="text-gray-400" size={16} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{item.listing.productName}</p>
                            <p className="text-xs text-gray-500">{item.quantity} {item.listing.unit}</p>
                          </div>
                        </div>
                        <p className="font-medium text-gray-900">
                          {formatPrice(item.priceAtAdd * item.quantity, currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Details */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    {deliveryDetails.method === 'delivery' ? 'Delivery' : 'Pickup'} Details
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> {contactInfo.name}</p>
                    <p><span className="text-gray-500">Phone:</span> {contactInfo.phone}</p>
                    {deliveryDetails.method === 'delivery' && (
                      <p><span className="text-gray-500">Address:</span> {deliveryDetails.address}, {deliveryDetails.city}</p>
                    )}
                    <p>
                      <span className="text-gray-500">Date:</span> {deliveryDetails.deliveryDate}
                      {deliveryDetails.deliveryTimeSlot && ` (${DELIVERY_TIME_SLOTS.find(s => s.id === deliveryDetails.deliveryTimeSlot)?.time})`}
                    </p>
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Payment</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm">
                      {PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}
                    </p>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Price Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span>{formatPrice(subtotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Delivery Fee</span>
                      <span>{deliveryFee > 0 ? formatPrice(deliveryFee, currency) : 'Free'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Service Fee (2%)</span>
                      <span>{formatPrice(serviceFee, currency)}</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200">
                      <span>Total</span>
                      <span className="text-green-600">{formatPrice(total, currency)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirmation Step */}
            {step === 'confirm' && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-8"
              >
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="text-green-600" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h3>
                <p className="text-gray-600 mb-6">
                  Your order has been received and sellers have been notified.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 inline-block">
                  <p className="text-sm text-gray-500">Order Total</p>
                  <p className="text-2xl font-bold text-green-600">{formatPrice(total, currency)}</p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Continue Shopping
                  </button>
                  {/* Future: Add View Order Details button */}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer with actions */}
        {step !== 'confirm' && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-gray-600">Total</span>
              <span className="text-xl font-bold text-gray-900">{formatPrice(total, currency)}</span>
            </div>
            <button
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Processing...
                </>
              ) : (
                <>
                  {step === 'review' ? 'Place Order' : 'Continue'}
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default Checkout;
