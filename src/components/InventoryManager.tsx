import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Package, AlertTriangle, TrendingDown, X } from 'lucide-react';
import type { InventoryItem } from '../types';

interface InventoryManagerProps {
  inventory: InventoryItem[];
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (id: string, item: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
}

export default function InventoryManager({ inventory, onAddItem, onUpdateItem, onDeleteItem }: InventoryManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [filterCategory, setFilterCategory] = useState<InventoryItem['category'] | 'all'>('all');
  const [formData, setFormData] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    category: 'other',
    quantity: 0,
    unit: '',
    minQuantity: 0,
    costPerUnit: 0,
    supplier: '',
    notes: '',
  });

  const handleOpenModal = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        unit: item.unit,
        minQuantity: item.minQuantity,
        costPerUnit: item.costPerUnit || 0,
        supplier: item.supplier || '',
        notes: item.notes || '',
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        category: 'other',
        quantity: 0,
        unit: '',
        minQuantity: 0,
        costPerUnit: 0,
        supplier: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      onUpdateItem(editingItem.id, formData);
    } else {
      onAddItem(formData);
    }
    handleCloseModal();
  };

  const getCategoryColor = (category: InventoryItem['category']) => {
    switch (category) {
      case 'seeds':
        return 'bg-green-100 text-green-800';
      case 'fertilizer':
        return 'bg-blue-100 text-blue-800';
      case 'pesticide':
        return 'bg-red-100 text-red-800';
      case 'equipment':
        return 'bg-orange-100 text-orange-800';
      case 'fuel':
        return 'bg-yellow-100 text-yellow-800';
      case 'tools':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: InventoryItem['category']) => {
    return category.charAt(0).toUpperCase() + category.slice(1);
  };

  const isLowStock = (item: InventoryItem) => item.quantity <= item.minQuantity;

  const filteredInventory = filterCategory === 'all'
    ? inventory
    : inventory.filter(i => i.category === filterCategory);

  const totalItems = inventory.length;
  const lowStockItems = inventory.filter(isLowStock).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.quantity * (item.costPerUnit || 0)), 0);

  const categoryTotals = inventory.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Track supplies and equipment</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          Add Item
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Items</p>
              <p className="text-3xl font-bold text-gray-900">{totalItems}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <Package className="text-gray-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Low Stock Items</p>
              <p className="text-3xl font-bold text-red-600">{lowStockItems}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Value</p>
              <p className="text-3xl font-bold text-green-600">${totalValue.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingDown className="text-green-600" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'seeds', 'fertilizer', 'pesticide', 'equipment', 'fuel', 'tools', 'other'] as const).map((category) => (
            <button
              key={category}
              onClick={() => setFilterCategory(category)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filterCategory === category
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category === 'all' ? 'All Items' : getCategoryLabel(category)}
              {category !== 'all' && categoryTotals[category] && (
                <span className="ml-2">({categoryTotals[category]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredInventory.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow ${
              isLowStock(item) ? 'ring-2 ring-red-500' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-gray-900">{item.name}</h3>
                  {isLowStock(item) && (
                    <AlertTriangle size={16} className="text-red-600" />
                  )}
                </div>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(item.category)}`}>
                  {getCategoryLabel(item.category)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenModal(item)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => onDeleteItem(item.id)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600">Quantity</span>
                  <span className={`font-semibold ${isLowStock(item) ? 'text-red-600' : 'text-gray-900'}`}>
                    {item.quantity} {item.unit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      isLowStock(item) ? 'bg-red-600' : 'bg-green-600'
                    }`}
                    style={{
                      width: `${Math.min((item.quantity / (item.minQuantity * 2)) * 100, 100)}%`
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Min: {item.minQuantity} {item.unit}
                </p>
              </div>

              {item.costPerUnit && item.costPerUnit > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Value</span>
                  <span className="font-semibold text-gray-900">
                    ${(item.quantity * item.costPerUnit).toLocaleString()}
                  </span>
                </div>
              )}

              {item.supplier && (
                <div className="text-sm">
                  <span className="text-gray-600">Supplier: </span>
                  <span className="text-gray-900">{item.supplier}</span>
                </div>
              )}

              {item.notes && (
                <p className="text-sm text-gray-600 line-clamp-2">{item.notes}</p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredInventory.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-md">
          <Package className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">
            {filterCategory === 'all'
              ? 'No inventory items yet. Add your first item to get started!'
              : `No ${filterCategory} items found.`}
          </p>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {editingItem ? 'Edit Item' : 'Add New Item'}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Item Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., NPK Fertilizer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as InventoryItem['category'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="seeds">Seeds</option>
                      <option value="fertilizer">Fertilizer</option>
                      <option value="pesticide">Pesticide</option>
                      <option value="equipment">Equipment</option>
                      <option value="fuel">Fuel</option>
                      <option value="tools">Tools</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.unit}
                        onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        placeholder="kg, L, bags"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Quantity (Alert Level)
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.minQuantity}
                      onChange={(e) => setFormData({ ...formData, minQuantity: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Per Unit (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.costPerUnit}
                      onChange={(e) => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Additional information..."
                    />
                  </div>

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
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {editingItem ? 'Update' : 'Add'} Item
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
