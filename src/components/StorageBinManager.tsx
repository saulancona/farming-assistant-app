import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Warehouse, AlertTriangle, Box, X } from 'lucide-react';
import type { StorageBin } from '../types';

interface StorageBinManagerProps {
  bins: StorageBin[];
  onAddBin: (bin: Omit<StorageBin, 'id'>) => void;
  onUpdateBin: (id: string, bin: Partial<StorageBin>) => void;
  onDeleteBin: (id: string) => void;
}

export default function StorageBinManager({ bins, onAddBin, onUpdateBin, onDeleteBin }: StorageBinManagerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBin, setEditingBin] = useState<StorageBin | null>(null);
  const [formData, setFormData] = useState<Omit<StorageBin, 'id'>>(({
    name: '',
    type: 'grain',
    capacity: 0,
    currentQuantity: 0,
    unit: 'tons',
    commodity: '',
    location: '',
    notes: '',
  }));

  const handleOpenModal = (bin?: StorageBin) => {
    if (bin) {
      setEditingBin(bin);
      setFormData({
        name: bin.name,
        type: bin.type,
        capacity: bin.capacity,
        currentQuantity: bin.currentQuantity,
        unit: bin.unit,
        commodity: bin.commodity || '',
        location: bin.location || '',
        notes: bin.notes || '',
      });
    } else {
      setEditingBin(null);
      setFormData({
        name: '',
        type: 'grain',
        capacity: 0,
        currentQuantity: 0,
        unit: 'tons',
        commodity: '',
        location: '',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBin(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBin) {
      onUpdateBin(editingBin.id, formData);
    } else {
      onAddBin(formData);
    }
    handleCloseModal();
  };

  const getTypeColor = (type: StorageBin['type']) => {
    switch (type) {
      case 'grain':
        return 'bg-amber-100 text-amber-800';
      case 'equipment':
        return 'bg-gray-100 text-gray-800';
      case 'cold_storage':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const getTypeLabel = (type: StorageBin['type']) => {
    switch (type) {
      case 'grain':
        return 'Grain Storage';
      case 'equipment':
        return 'Equipment';
      case 'cold_storage':
        return 'Cold Storage';
      default:
        return 'General';
    }
  };

  const getUtilization = (bin: StorageBin) => {
    return (bin.currentQuantity / bin.capacity) * 100;
  };

  const isNearCapacity = (bin: StorageBin) => {
    return getUtilization(bin) >= 90;
  };

  const totalCapacity = bins.reduce((sum, bin) => sum + bin.capacity, 0);
  const totalUsed = bins.reduce((sum, bin) => sum + bin.currentQuantity, 0);
  const averageUtilization = bins.length > 0 ? (totalUsed / totalCapacity) * 100 : 0;
  const nearCapacityBins = bins.filter(isNearCapacity);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storage Bins</h1>
          <p className="text-gray-600 mt-1">Manage farm storage facilities</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          Add Storage Bin
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
              <p className="text-sm text-gray-600 mb-1">Total Bins</p>
              <p className="text-3xl font-bold text-gray-900">{bins.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Warehouse className="text-blue-600" size={24} />
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
              <p className="text-sm text-gray-600 mb-1">Capacity Used</p>
              <p className="text-3xl font-bold text-gray-900">{averageUtilization.toFixed(0)}%</p>
              <p className="text-xs text-gray-500 mt-1">{totalUsed.toLocaleString()} / {totalCapacity.toLocaleString()}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Box className="text-green-600" size={24} />
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
              <p className="text-sm text-gray-600 mb-1">Near Capacity</p>
              <p className="text-3xl font-bold text-orange-600">{nearCapacityBins.length}</p>
              <p className="text-xs text-gray-500 mt-1">≥90% full</p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <AlertTriangle className="text-orange-600" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Storage Bins Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bins.map((bin, index) => (
          <motion.div
            key={bin.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className={`bg-white rounded-xl shadow-md p-6 ${
              isNearCapacity(bin) ? 'ring-2 ring-orange-500' : ''
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{bin.name}</h3>
                  {isNearCapacity(bin) && (
                    <AlertTriangle size={16} className="text-orange-600" />
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(bin.type)}`}>
                  {getTypeLabel(bin.type)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleOpenModal(bin)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <Edit2 size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => onDeleteBin(bin.id)}
                  className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={16} className="text-red-600" />
                </button>
              </div>
            </div>

            {bin.commodity && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">Commodity</p>
                <p className="text-sm font-medium text-gray-900">{bin.commodity}</p>
              </div>
            )}

            {bin.location && (
              <div className="mb-3">
                <p className="text-sm text-gray-600">Location</p>
                <p className="text-sm font-medium text-gray-900">{bin.location}</p>
              </div>
            )}

            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Capacity</span>
                <span className="font-semibold text-gray-900">
                  {bin.currentQuantity.toLocaleString()} / {bin.capacity.toLocaleString()} {bin.unit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    isNearCapacity(bin) ? 'bg-orange-600' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(getUtilization(bin), 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">{getUtilization(bin).toFixed(1)}% utilized</p>
            </div>

            {bin.notes && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-sm text-gray-600">{bin.notes}</p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {bins.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <Warehouse className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">No storage bins yet. Add your first storage bin to get started!</p>
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
                    {editingBin ? 'Edit Storage Bin' : 'Add New Storage Bin'}
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
                      Bin Name
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., North Grain Silo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as StorageBin['type'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="grain">Grain Storage</option>
                      <option value="equipment">Equipment Storage</option>
                      <option value="cold_storage">Cold Storage</option>
                      <option value="general">General Storage</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Capacity
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Quantity
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={formData.currentQuantity}
                        onChange={(e) => setFormData({ ...formData, currentQuantity: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                    </div>
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
                      placeholder="e.g., tons, kg, m³"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Commodity (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.commodity}
                      onChange={(e) => setFormData({ ...formData, commodity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., Maize, Wheat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., North barn, Section A"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      rows={3}
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
                      {editingBin ? 'Update' : 'Add'} Bin
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
