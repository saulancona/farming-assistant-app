import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, Clock, CheckCircle, Truck, XCircle, ChevronRight,
  ChevronDown, Phone, MessageCircle, MapPin, Calendar,
  RefreshCw, ArrowLeft, Loader, AlertCircle, Check
} from 'lucide-react';
import { getSellerOrders, updateOrderItemStatus, type OrderWithItems } from '../../services/database';
import { formatPrice, getPreferredCurrency } from '../../services/currency';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SellerOrdersProps {
  isOpen: boolean;
  onClose: () => void;
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
  preparing: {
    label: 'Preparing',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    icon: <Package size={16} />,
  },
  ready: {
    label: 'Ready',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
    icon: <Check size={16} />,
  },
  shipped: {
    label: 'Shipped',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100',
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
};

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  pending: { label: 'Order Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  confirmed: { label: 'Order Confirmed', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  processing: { label: 'Processing', color: 'text-purple-600', bgColor: 'bg-purple-100' },
  shipped: { label: 'Shipped', color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  delivered: { label: 'Delivered', color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelled', color: 'text-red-600', bgColor: 'bg-red-100' },
  refunded: { label: 'Refunded', color: 'text-gray-600', bgColor: 'bg-gray-100' },
};

// Status flow for seller items
const ITEM_STATUS_FLOW = ['pending', 'confirmed', 'preparing', 'ready', 'shipped', 'delivered'];

export function SellerOrders({ isOpen, onClose }: SellerOrdersProps) {
  const { user } = useAuth();
  const currency = getPreferredCurrency();

  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithItems | null>(null);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (isOpen && user) {
      loadOrders();
    }
  }, [isOpen, user]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await getSellerOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading seller orders:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemStatus = async (_orderId: string, itemId: string, newStatus: string) => {
    try {
      setUpdatingItem(itemId);
      await updateOrderItemStatus(itemId, newStatus);
      toast.success(`Item status updated to ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      await loadOrders();
    } catch (error) {
      console.error('Error updating item status:', error);
      toast.error('Failed to update item status');
    } finally {
      setUpdatingItem(null);
    }
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const currentIndex = ITEM_STATUS_FLOW.indexOf(currentStatus);
    if (currentIndex === -1 || currentIndex >= ITEM_STATUS_FLOW.length - 1) {
      return null;
    }
    return ITEM_STATUS_FLOW[currentIndex + 1];
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

  // Filter orders based on status
  const filteredOrders = statusFilter === 'all'
    ? orders
    : orders.filter(order => {
        // Check if any item in the order matches the filter
        return order.items.some(item => item.itemStatus === statusFilter);
      });

  // Count orders by status
  const statusCounts = orders.reduce((acc, order) => {
    order.items.forEach(item => {
      acc[item.itemStatus] = (acc[item.itemStatus] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

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
        className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
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
                {selectedOrder ? `Order ${selectedOrder.orderNumber}` : 'Seller Orders Dashboard'}
              </h2>
              {!selectedOrder && (
                <p className="text-sm text-gray-500">
                  {orders.reduce((sum, o) => sum + o.items.length, 0)} items across {orders.length} orders
                </p>
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

        {/* Status Filter Tabs */}
        {!selectedOrder && !loading && orders.length > 0 && (
          <div className="flex items-center gap-2 p-4 border-b border-gray-100 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors ${
                statusFilter === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({orders.reduce((sum, o) => sum + o.items.length, 0)})
            </button>
            {ITEM_STATUS_FLOW.slice(0, -1).map(status => {
              const count = statusCounts[status] || 0;
              if (count === 0) return null;
              const config = STATUS_CONFIG[status];
              return (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 text-sm rounded-full whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    statusFilter === status
                      ? `${config.bgColor} ${config.color} font-medium`
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {config.icon}
                  {config.label} ({count})
                </button>
              );
            })}
          </div>
        )}

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
                <div className={`rounded-lg p-4 ${ORDER_STATUS_CONFIG[selectedOrder.status]?.bgColor || 'bg-gray-100'}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`font-semibold ${ORDER_STATUS_CONFIG[selectedOrder.status]?.color || 'text-gray-600'}`}>
                        {ORDER_STATUS_CONFIG[selectedOrder.status]?.label || selectedOrder.status}
                      </p>
                      <p className="text-sm text-gray-600">
                        Ordered on {formatDateTime(selectedOrder.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Order Total</p>
                      <p className="text-lg font-bold text-gray-900">{formatPrice(selectedOrder.total, currency)}</p>
                    </div>
                  </div>
                </div>

                {/* Buyer Info */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Buyer Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                    <p><span className="text-gray-500">Name:</span> {selectedOrder.buyerName}</p>
                    <p><span className="text-gray-500">Phone:</span> {selectedOrder.buyerPhone}</p>
                    {selectedOrder.buyerEmail && (
                      <p><span className="text-gray-500">Email:</span> {selectedOrder.buyerEmail}</p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <a
                        href={`tel:${selectedOrder.buyerPhone}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Phone size={12} />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${selectedOrder.buyerPhone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <MessageCircle size={12} />
                        WhatsApp
                      </a>
                    </div>
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
                      <div className="flex items-start gap-2 pt-2 border-t border-gray-200">
                        <AlertCircle size={16} className="text-amber-500 mt-0.5" />
                        <p className="text-gray-600">{selectedOrder.deliveryInstructions}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Your Items */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Your Items to Fulfill</h3>
                  <div className="space-y-3">
                    {selectedOrder.items.map((item) => {
                      const nextStatus = getNextStatus(item.itemStatus);
                      return (
                        <div
                          key={item.id}
                          className="border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <p className="font-medium text-gray-900">{item.productName}</p>
                              {item.variety && (
                                <p className="text-sm text-gray-500">{item.variety}</p>
                              )}
                              <p className="text-sm text-gray-600 mt-1">
                                {item.quantity} {item.unit} @ {formatPrice(item.pricePerUnit, currency)}/{item.unit}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-gray-900">{formatPrice(item.totalPrice, currency)}</p>
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                                STATUS_CONFIG[item.itemStatus]?.bgColor || 'bg-gray-100'
                              } ${STATUS_CONFIG[item.itemStatus]?.color || 'text-gray-600'}`}>
                                {STATUS_CONFIG[item.itemStatus]?.icon}
                                {STATUS_CONFIG[item.itemStatus]?.label || item.itemStatus}
                              </span>
                            </div>
                          </div>

                          {/* Status Update Actions */}
                          {nextStatus && item.itemStatus !== 'cancelled' && (
                            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                              <button
                                onClick={() => handleUpdateItemStatus(selectedOrder.id, item.id, nextStatus)}
                                disabled={updatingItem === item.id}
                                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                              >
                                {updatingItem === item.id ? (
                                  <Loader className="animate-spin" size={16} />
                                ) : (
                                  STATUS_CONFIG[nextStatus]?.icon
                                )}
                                Mark as {STATUS_CONFIG[nextStatus]?.label}
                              </button>
                              {item.itemStatus === 'pending' && (
                                <button
                                  onClick={() => handleUpdateItemStatus(selectedOrder.id, item.id, 'cancelled')}
                                  disabled={updatingItem === item.id}
                                  className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                >
                                  <XCircle size={16} />
                                  Cancel
                                </button>
                              )}
                            </div>
                          )}

                          {/* Seller Notes */}
                          {item.sellerNotes && (
                            <p className="text-sm text-gray-500 mt-2 italic">
                              Note: {item.sellerNotes}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Buyer Notes */}
                {selectedOrder.buyerNotes && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Buyer Notes</h3>
                    <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-900">
                      {selectedOrder.buyerNotes}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : filteredOrders.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-16 px-4"
              >
                <Package className="mx-auto text-gray-300 mb-4" size={64} />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {statusFilter !== 'all' ? `No ${STATUS_CONFIG[statusFilter]?.label} items` : 'No orders yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {statusFilter !== 'all'
                    ? 'Try a different filter or check back later'
                    : 'When buyers order your products, they\'ll appear here'}
                </p>
                {statusFilter !== 'all' && (
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Show All Orders
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="orders-list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="divide-y divide-gray-100"
              >
                {filteredOrders.map((order) => (
                  <div key={order.id} className="p-4">
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleOrderExpanded(order.id)}
                    >
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${ORDER_STATUS_CONFIG[order.status]?.bgColor || 'bg-gray-100'}`}>
                          <Package size={20} className={ORDER_STATUS_CONFIG[order.status]?.color || 'text-gray-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              ORDER_STATUS_CONFIG[order.status]?.bgColor || 'bg-gray-100'
                            } ${ORDER_STATUS_CONFIG[order.status]?.color || 'text-gray-600'}`}>
                              {ORDER_STATUS_CONFIG[order.status]?.label || order.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">
                            {formatDate(order.createdAt)} • {order.buyerName}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {order.items.map((item) => (
                              <span
                                key={item.id}
                                className={`text-xs px-2 py-0.5 rounded ${
                                  STATUS_CONFIG[item.itemStatus]?.bgColor || 'bg-gray-100'
                                } ${STATUS_CONFIG[item.itemStatus]?.color || 'text-gray-600'}`}
                              >
                                {item.productName}: {STATUS_CONFIG[item.itemStatus]?.label || item.itemStatus}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatPrice(order.items.reduce((sum, item) => sum + item.totalPrice, 0), currency)}
                          </p>
                          <p className="text-xs text-gray-500">{order.items.length} items</p>
                        </div>
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
                            {/* Items */}
                            <div className="space-y-2 mb-4">
                              {order.items.map((item) => (
                                <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 rounded p-2">
                                  <div>
                                    <span className="font-medium text-gray-900">{item.productName}</span>
                                    <span className="text-gray-500"> - {item.quantity} {item.unit}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-900">{formatPrice(item.totalPrice, currency)}</span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      STATUS_CONFIG[item.itemStatus]?.bgColor || 'bg-gray-100'
                                    } ${STATUS_CONFIG[item.itemStatus]?.color || 'text-gray-600'}`}>
                                      {STATUS_CONFIG[item.itemStatus]?.label}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedOrder(order);
                                }}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                              >
                                <ChevronRight size={14} />
                                Manage Order
                              </button>
                              <a
                                href={`tel:${order.buyerPhone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                              >
                                <Phone size={14} />
                                Call Buyer
                              </a>
                              <a
                                href={`https://wa.me/${order.buyerPhone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                              >
                                <MessageCircle size={14} />
                                WhatsApp
                              </a>
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

export default SellerOrders;
