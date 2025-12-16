import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, CheckCircle, Truck, XCircle, ChevronRight,
  ChevronDown, Phone, MessageCircle, MapPin, Calendar,
  RefreshCw, ArrowLeft, CreditCard, Loader
} from 'lucide-react';
import { getBuyerOrders, getOrder, cancelOrder, type OrderWithItems } from '../../services/database';
import { formatPrice, getPreferredCurrency } from '../../services/currency';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface OrderHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onReorder?: (items: OrderWithItems['items']) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Pending',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    icon: <Clock size={16} />,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    icon: <CheckCircle size={16} />,
  },
  processing: {
    label: 'Processing',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: <Package size={16} />,
  },
  shipped: {
    label: 'Shipped',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: <Truck size={16} />,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    icon: <CheckCircle size={16} />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    icon: <XCircle size={16} />,
  },
  refunded: {
    label: 'Refunded',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    icon: <RefreshCw size={16} />,
  },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: 'Payment Pending', color: 'text-yellow-600' },
  paid: { label: 'Paid', color: 'text-green-600' },
  failed: { label: 'Payment Failed', color: 'text-red-600' },
  refunded: { label: 'Refunded', color: 'text-gray-600' },
};

export function OrderHistory({ isOpen, onClose, onReorder }: OrderHistoryProps) {
  const { user } = useAuth();
  const currency = getPreferredCurrency();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && user) {
      loadOrders();
    }
  }, [isOpen, user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getBuyerOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOrder = async (orderId: string) => {
    try {
      setLoadingOrderDetails(true);
      const order = await getOrder(orderId);
      if (order) {
        setSelectedOrder(order);
      }
    } catch (error) {
      console.error('Error loading order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
      setCancellingOrder(orderId);
      await cancelOrder(orderId, 'Cancelled by buyer');
      toast.success('Order cancelled successfully');
      await loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Failed to cancel order');
    } finally {
      setCancellingOrder(null);
    }
  };

  const handleReorder = (items: OrderWithItems['items']) => {
    onReorder?.(items);
    onClose();
    toast.success('Items added to cart for reordering');
  };

  const toggleOrderExpanded = (orderId: string) => {
    setExpandedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            {selectedOrder && (
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {selectedOrder ? `Order ${selectedOrder.orderNumber}` : 'Order History'}
              </h2>
              {!selectedOrder && orders.length > 0 && (
                <p className="text-sm text-gray-500">{orders.length} orders</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-16"
              >
                <div className="text-center">
                  <Loader className="animate-spin text-green-600 mx-auto mb-3" size={32} />
                  <p className="text-gray-500">Loading orders...</p>
                </div>
              </motion.div>
            ) : selectedOrder ? (
              <motion.div
                key="order-details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="p-4 space-y-6"
              >
                {/* Order Status Banner */}
                <div className={`rounded-lg p-4 ${STATUS_CONFIG[selectedOrder.status]?.bgColor || 'bg-gray-100'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full bg-white ${STATUS_CONFIG[selectedOrder.status]?.color || 'text-gray-600'}`}>
                      {STATUS_CONFIG[selectedOrder.status]?.icon || <Package size={16} />}
                    </div>
                    <div>
                      <p className={`font-semibold ${STATUS_CONFIG[selectedOrder.status]?.color || 'text-gray-600'}`}>
                        {STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Placed on {formatDateTime(selectedOrder.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center">
                            <Package className="text-gray-400" size={20} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{item.productName}</p>
                            {item.variety && (
                              <p className="text-sm text-gray-500">{item.variety}</p>
                            )}
                            <p className="text-sm text-gray-600">
                              {item.quantity} {item.unit} @ {formatPrice(item.pricePerUnit, currency)}/{item.unit}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              From: {item.sellerName}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(item.totalPrice, currency)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            STATUS_CONFIG[item.itemStatus]?.bgColor || 'bg-gray-100'
                          } ${STATUS_CONFIG[item.itemStatus]?.color || 'text-gray-600'}`}>
                            {STATUS_CONFIG[item.itemStatus]?.label || item.itemStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Delivery Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Delivery Details</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-600 capitalize">{selectedOrder.deliveryMethod}</p>
                        {selectedOrder.deliveryAddress && (
                          <p className="text-gray-900">
                            {selectedOrder.deliveryAddress}
                            {selectedOrder.deliveryCity && `, ${selectedOrder.deliveryCity}`}
                            {selectedOrder.deliveryRegion && `, ${selectedOrder.deliveryRegion}`}
                          </p>
                        )}
                      </div>
                    </div>
                    {selectedOrder.deliveryDate && (
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-gray-900">
                          {formatDate(selectedOrder.deliveryDate)}
                          {selectedOrder.deliveryTimeSlot && ` (${selectedOrder.deliveryTimeSlot})`}
                        </span>
                      </div>
                    )}
                    {selectedOrder.deliveryInstructions && (
                      <p className="text-gray-600 italic">
                        Note: {selectedOrder.deliveryInstructions}
                      </p>
                    )}
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Payment</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-gray-400" />
                        <span className="text-gray-900 capitalize">
                          {selectedOrder.paymentMethod.replace('_', ' ')}
                        </span>
                      </div>
                      <span className={PAYMENT_STATUS_CONFIG[selectedOrder.paymentStatus]?.color || 'text-gray-600'}>
                        {PAYMENT_STATUS_CONFIG[selectedOrder.paymentStatus]?.label || selectedOrder.paymentStatus}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm border-t border-gray-200 pt-3">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Subtotal</span>
                        <span>{formatPrice(selectedOrder.subtotal, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Delivery Fee</span>
                        <span>{selectedOrder.deliveryFee > 0 ? formatPrice(selectedOrder.deliveryFee, currency) : 'Free'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Service Fee</span>
                        <span>{formatPrice(selectedOrder.serviceFee, currency)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-lg pt-2 border-t border-gray-200">
                        <span>Total</span>
                        <span className="text-green-600">{formatPrice(selectedOrder.total, currency)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status History */}
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Order Timeline</h3>
                    <div className="space-y-3">
                      {selectedOrder.statusHistory.map((history, index) => (
                        <div key={history.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full ${
                              index === 0 ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            {index < selectedOrder.statusHistory!.length - 1 && (
                              <div className="w-0.5 h-8 bg-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <p className="font-medium text-gray-900 capitalize">
                              {history.status}
                            </p>
                            {history.note && (
                              <p className="text-sm text-gray-600">{history.note}</p>
                            )}
                            <p className="text-xs text-gray-400">
                              {formatDateTime(history.createdAt)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                  {['pending', 'confirmed'].includes(selectedOrder.status) && (
                    <button
                      onClick={() => handleCancelOrder(selectedOrder.id)}
                      disabled={cancellingOrder === selectedOrder.id}
                      className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle size={18} />
                      {cancellingOrder === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                  {onReorder && selectedOrder.status === 'delivered' && (
                    <button
                      onClick={() => handleReorder(selectedOrder.items)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <RefreshCw size={18} />
                      Reorder
                    </button>
                  )}
                  {selectedOrder.items[0]?.sellerPhone && (
                    <a
                      href={`tel:${selectedOrder.items[0].sellerPhone}`}
                      className="flex items-center gap-2 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Phone size={18} />
                      Call Seller
                    </a>
                  )}
                  {selectedOrder.items[0]?.sellerWhatsapp && (
                    <a
                      href={`https://wa.me/${selectedOrder.items[0].sellerWhatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <MessageCircle size={18} />
                      WhatsApp
                    </a>
                  )}
                </div>
              </motion.div>
            ) : orders.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16 px-4"
              >
                <Package className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No orders yet</h3>
                <p className="text-gray-500 mb-6">
                  When you place orders, they'll appear here
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Start Shopping
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="orders-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-gray-100"
              >
                {orders.map((order) => (
                  <div key={order.id} className="p-4">
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleOrderExpanded(order.id)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${STATUS_CONFIG[order.status]?.bgColor || 'bg-gray-100'}`}>
                          {STATUS_CONFIG[order.status]?.icon || <Package size={20} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              STATUS_CONFIG[order.status]?.bgColor || 'bg-gray-100'
                            } ${STATUS_CONFIG[order.status]?.color || 'text-gray-600'}`}>
                              {STATUS_CONFIG[order.status]?.label || order.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(order.createdAt)} • {order.items.length} item{order.items.length > 1 ? 's' : ''}
                          </p>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {formatPrice(order.total, currency)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ rotate: expandedOrders.has(order.id) ? 180 : 0 }}
                        >
                          <ChevronDown className="text-gray-400" size={20} />
                        </motion.div>
                      </div>
                    </div>

                    {/* Expanded View */}
                    <AnimatePresence>
                      {expandedOrders.has(order.id) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            {/* Items Preview */}
                            <div className="space-y-2 mb-4">
                              {order.items.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600">
                                    {item.quantity} {item.unit} {item.productName}
                                  </span>
                                  <span className="text-gray-900">{formatPrice(item.totalPrice, currency)}</span>
                                </div>
                              ))}
                              {order.items.length > 3 && (
                                <p className="text-sm text-gray-500">
                                  +{order.items.length - 3} more items
                                </p>
                              )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewOrder(order.id);
                                }}
                                disabled={loadingOrderDetails}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                {loadingOrderDetails ? (
                                  <Loader className="animate-spin" size={14} />
                                ) : (
                                  <ChevronRight size={14} />
                                )}
                                View Details
                              </button>
                              {['pending', 'confirmed'].includes(order.status) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelOrder(order.id);
                                  }}
                                  disabled={cancellingOrder === order.id}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <XCircle size={14} />
                                  Cancel
                                </button>
                              )}
                              {onReorder && order.status === 'delivered' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReorder(order.items);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                                >
                                  <RefreshCw size={14} />
                                  Reorder
                                </button>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {!selectedOrder && orders.length > 0 && (
          <div className="p-4 bg-gray-50 border-t border-gray-200">
            <button
              onClick={loadOrders}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
              Refresh Orders
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default OrderHistory;
