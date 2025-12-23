import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Sprout, Calendar, MapPin, X, Check, ChevronRight, Package, Scale } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Field, InventoryItem } from '../types';
import TalkingButton from './TalkingButton';

interface FieldsManagerProps {
  fields: Field[];
  onAddField: (field: Omit<Field, 'id'>) => void;
  onUpdateField: (id: string, field: Partial<Field>) => void;
  onDeleteField: (id: string) => void;
  onAddInventory?: (item: Omit<InventoryItem, 'id'>) => void;
  readOnly?: boolean;
  onRequestAuth?: () => void;
}

interface HarvestFormData {
  quantity: number;
  unit: string;
  quality: 'excellent' | 'good' | 'average' | 'poor';
  notes: string;
}

const FIELD_STATUSES: Field['status'][] = ['planted', 'growing', 'ready', 'harvested'];

const STATUS_CONFIG = {
  planted: {
    color: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    icon: '🌱',
    label: 'Planted',
    labelSw: 'Imepandwa',
  },
  growing: {
    color: 'bg-green-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    icon: '🌿',
    label: 'Growing',
    labelSw: 'Inakua',
  },
  ready: {
    color: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    icon: '🌾',
    label: 'Ready',
    labelSw: 'Tayari',
  },
  harvested: {
    color: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    icon: '✅',
    label: 'Harvested',
    labelSw: 'Imevunwa',
  },
};

// Helper to safely format dates
const safeFormatDate = (dateStr: string | undefined | null, formatStr: string): string => {
  if (!dateStr) return 'Not set';
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? format(date, formatStr) : 'Invalid date';
  } catch {
    return 'Invalid date';
  }
};

export default function FieldsManager({
  fields,
  onAddField,
  onUpdateField,
  onDeleteField,
  onAddInventory,
  readOnly = false,
  onRequestAuth
}: FieldsManagerProps) {
  const { t, i18n } = useTranslation();
  const isSwahili = i18n.language === 'sw';
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
  const [harvestingField, setHarvestingField] = useState<Field | null>(null);
  const [farmSizeUnit, setFarmSizeUnit] = useState<'acres' | 'hectares'>('acres');
  const [formData, setFormData] = useState<Omit<Field, 'id'>>({
    name: '',
    cropType: '',
    area: 0,
    plantingDate: '',
    expectedHarvest: '',
    status: 'planted',
    notes: '',
  });
  const [harvestData, setHarvestData] = useState<HarvestFormData>({
    quantity: 0,
    unit: 'kg',
    quality: 'good',
    notes: '',
  });

  // Load unit preference from localStorage and listen for changes
  useEffect(() => {
    const loadUnitPreference = () => {
      const savedSettings = localStorage.getItem('farmSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setFarmSizeUnit(settings.farmSizeUnit || 'acres');
        } catch (error) {
          console.error('Error loading unit preference:', error);
        }
      }
    };

    loadUnitPreference();

    // Listen for settings changes
    const handleSettingsSaved = () => {
      loadUnitPreference();
    };

    window.addEventListener('settingsSaved', handleSettingsSaved);
    return () => window.removeEventListener('settingsSaved', handleSettingsSaved);
  }, []);

  // Helper function to convert area for display
  const convertAreaForDisplay = (areaInAcres: number): number => {
    if (farmSizeUnit === 'hectares') {
      return parseFloat((areaInAcres * 0.404686).toFixed(2));
    }
    return areaInAcres;
  };

  // Helper function to convert area back to acres for storage
  const convertAreaToAcres = (displayArea: number): number => {
    if (farmSizeUnit === 'hectares') {
      return parseFloat((displayArea / 0.404686).toFixed(2));
    }
    return displayArea;
  };

  const handleOpenModal = (field?: Field) => {
    if (field) {
      setEditingField(field);
      setFormData({
        name: field.name,
        cropType: field.cropType,
        area: convertAreaForDisplay(field.area),
        plantingDate: field.plantingDate,
        expectedHarvest: field.expectedHarvest,
        status: field.status,
        notes: field.notes || '',
      });
    } else {
      setEditingField(null);
      setFormData({
        name: '',
        cropType: '',
        area: 0,
        plantingDate: '',
        expectedHarvest: '',
        status: 'planted',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingField(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert area back to acres for storage
    const dataToSave = {
      ...formData,
      area: convertAreaToAcres(formData.area)
    };

    if (editingField) {
      onUpdateField(editingField.id, dataToSave);
    } else {
      onAddField(dataToSave);
    }
    handleCloseModal();
  };

  const handleStatusChange = (field: Field, newStatus: Field['status']) => {
    if (readOnly) {
      onRequestAuth?.();
      return;
    }

    // If changing to harvested, open harvest modal
    if (newStatus === 'harvested' && field.status !== 'harvested') {
      setHarvestingField(field);
      setHarvestData({
        quantity: 0,
        unit: 'kg',
        quality: 'good',
        notes: '',
      });
    } else {
      onUpdateField(field.id, { status: newStatus });
    }
  };

  const handleHarvestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!harvestingField) return;

    // Update field status to harvested
    onUpdateField(harvestingField.id, { status: 'harvested' });

    // Create inventory item from harvest
    if (onAddInventory) {
      const harvestItem: Omit<InventoryItem, 'id'> = {
        name: `${harvestingField.cropType} - ${harvestingField.name}`,
        category: 'harvest',
        quantity: harvestData.quantity,
        unit: harvestData.unit,
        minQuantity: 0,
        notes: `Quality: ${harvestData.quality}. ${harvestData.notes}`.trim(),
        fieldId: harvestingField.id,
        harvestDate: new Date().toISOString().split('T')[0],
      };
      onAddInventory(harvestItem);
    }

    setHarvestingField(null);
  };

  const getStatusIndex = (status: Field['status']) => FIELD_STATUSES.indexOf(status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('fields.titleFull', 'Fields & Crops')}</h1>
          <p className="text-gray-600 mt-1">{t('fields.manageDesc', 'Manage your fields and track crop progress')}</p>
        </div>
        <TalkingButton
          voiceLabel={readOnly ? t('fields.signInVoice', "Sign In to Add Field. You need to sign in before you can add new fields.") : t('fields.addFieldVoice', "Add Field. Click to add a new field and track your crops.")}
          onClick={() => readOnly ? onRequestAuth?.() : handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          {readOnly ? t('fields.signInToAdd', 'Sign In to Add Field') : t('fields.addField', 'Add Field')}
        </TalkingButton>
      </div>

      {/* Fields Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {fields.map((field, index) => {
          const statusConfig = STATUS_CONFIG[field.status];
          const currentStatusIndex = getStatusIndex(field.status);

          return (
            <motion.div
              key={field.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all border-l-4 ${statusConfig.color.replace('bg-', 'border-')}`}
            >
              {/* Header */}
              <div className={`${statusConfig.bgLight} px-5 py-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{statusConfig.icon}</span>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{field.name}</h3>
                      <p className={`text-sm font-medium ${statusConfig.textColor}`}>
                        {field.cropType}
                      </p>
                    </div>
                  </div>
                  {!readOnly && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleOpenModal(field)}
                        className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                        title={t('common.edit', 'Edit')}
                      >
                        <Edit2 size={16} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => onDeleteField(field.id)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                        title={t('common.delete', 'Delete')}
                      >
                        <Trash2 size={16} className="text-red-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Progress */}
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                  {t('fields.cropProgress', 'Crop Progress')}
                </p>
                <div className="flex items-center gap-1">
                  {FIELD_STATUSES.map((status, idx) => {
                    const config = STATUS_CONFIG[status];
                    const isActive = idx <= currentStatusIndex;
                    const isCurrent = status === field.status;

                    return (
                      <div key={status} className="flex items-center flex-1">
                        <button
                          onClick={() => handleStatusChange(field, status)}
                          disabled={readOnly}
                          className={`
                            relative flex-1 h-2 rounded-full transition-all
                            ${isActive ? config.color : 'bg-gray-200'}
                            ${!readOnly ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}
                          `}
                          title={isSwahili ? config.labelSw : config.label}
                        >
                          {isCurrent && (
                            <motion.div
                              layoutId={`indicator-${field.id}`}
                              className="absolute -top-1 -bottom-1 left-0 right-0 rounded-full ring-2 ring-offset-1 ring-gray-400"
                            />
                          )}
                        </button>
                        {idx < FIELD_STATUSES.length - 1 && (
                          <ChevronRight size={12} className="mx-0.5 text-gray-300 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2">
                  {FIELD_STATUSES.map((status) => {
                    const config = STATUS_CONFIG[status];
                    const isCurrent = status === field.status;
                    return (
                      <span
                        key={status}
                        className={`text-xs ${isCurrent ? config.textColor + ' font-semibold' : 'text-gray-400'}`}
                      >
                        {isSwahili ? config.labelSw : config.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Details */}
              <div className="px-5 py-4 space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin size={16} className="text-gray-400 flex-shrink-0" />
                  <span>{convertAreaForDisplay(field.area)} {farmSizeUnit === 'hectares' ? t('fields.hectares', 'hectares') : t('fields.acres', 'acres')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar size={16} className="text-gray-400 flex-shrink-0" />
                  <span>{t('fields.planted', 'Planted')}: {safeFormatDate(field.plantingDate, 'MMM d, yyyy')}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Sprout size={16} className="text-gray-400 flex-shrink-0" />
                  <span>{t('fields.harvest', 'Harvest')}: {safeFormatDate(field.expectedHarvest, 'MMM d, yyyy')}</span>
                </div>
                {field.notes && (
                  <p className="text-sm text-gray-500 italic line-clamp-2 pt-2 border-t border-gray-100">
                    {field.notes}
                  </p>
                )}
              </div>

              {/* Quick Action for Ready status */}
              {field.status === 'ready' && !readOnly && (
                <div className="px-5 pb-4">
                  <button
                    onClick={() => handleStatusChange(field, 'harvested')}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all font-medium shadow-md"
                  >
                    <Package size={18} />
                    {t('fields.recordHarvest', 'Record Harvest')}
                  </button>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {fields.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <Sprout className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">{t('fields.noFields', 'No fields yet. Add your first field to get started!')}</p>
        </div>
      )}

      {/* Add/Edit Field Modal */}
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
                    {editingField ? t('fields.editField', 'Edit Field') : t('fields.addNewField', 'Add New Field')}
                  </h2>
                  <TalkingButton
                    voiceLabel={t('fields.closeVoice', "Close. Click to close this form without saving.")}
                    onClick={handleCloseModal}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </TalkingButton>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.fieldName', 'Field Name')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder={t('fields.fieldNamePlaceholder', 'e.g., North Field')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.cropType', 'Crop Type')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cropType}
                      onChange={(e) => setFormData({ ...formData, cropType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder={t('fields.cropTypePlaceholder', 'e.g., Maize, Wheat')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {farmSizeUnit === 'hectares' ? t('fields.areaLabelHectares', 'Area (hectares)') : t('fields.areaLabel', 'Area (acres)')}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: parseFloat(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.plantingDate', 'Planting Date')}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.plantingDate}
                      onChange={(e) => setFormData({ ...formData, plantingDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.expectedHarvest', 'Expected Harvest')}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.expectedHarvest}
                      onChange={(e) => setFormData({ ...formData, expectedHarvest: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.status', 'Status')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Field['status'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      {FIELD_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_CONFIG[status].icon} {isSwahili ? STATUS_CONFIG[status].labelSw : STATUS_CONFIG[status].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.notesOptional', 'Notes (optional)')}
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder={t('fields.notesPlaceholder', 'Any additional notes...')}
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <TalkingButton
                      type="button"
                      voiceLabel={t('fields.cancelVoice', "Cancel. Click to close this form without saving any changes.")}
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('common.cancel', 'Cancel')}
                    </TalkingButton>
                    <TalkingButton
                      type="submit"
                      voiceLabel={editingField ? t('fields.updateVoice', "Update Field. Click to save your changes to this field.") : t('fields.addNewVoice', "Add Field. Click to add this new field to your farm.")}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {editingField ? t('fields.update', 'Update') : t('fields.add', 'Add')} {t('fields.field', 'Field')}
                    </TalkingButton>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Harvest Modal */}
      <AnimatePresence>
        {harvestingField && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl max-w-md w-full"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Package className="text-amber-600" size={24} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900">
                        {t('fields.recordHarvest', 'Record Harvest')}
                      </h2>
                      <p className="text-sm text-gray-600">
                        {harvestingField.name} - {harvestingField.cropType}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setHarvestingField(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleHarvestSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Scale size={14} className="inline mr-1" />
                        {t('fields.harvestQuantity', 'Quantity')}
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.1"
                        value={harvestData.quantity}
                        onChange={(e) => setHarvestData({ ...harvestData, quantity: parseFloat(e.target.value) })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('fields.harvestUnit', 'Unit')}
                      </label>
                      <select
                        value={harvestData.unit}
                        onChange={(e) => setHarvestData({ ...harvestData, unit: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      >
                        <option value="kg">{t('fields.unitKg', 'Kilograms (kg)')}</option>
                        <option value="tonnes">{t('fields.unitTonnes', 'Tonnes')}</option>
                        <option value="bags">{t('fields.unitBags', 'Bags')}</option>
                        <option value="crates">{t('fields.unitCrates', 'Crates')}</option>
                        <option value="bunches">{t('fields.unitBunches', 'Bunches')}</option>
                        <option value="pieces">{t('fields.unitPieces', 'Pieces')}</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.harvestQuality', 'Quality')}
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['excellent', 'good', 'average', 'poor'] as const).map((quality) => (
                        <button
                          key={quality}
                          type="button"
                          onClick={() => setHarvestData({ ...harvestData, quality })}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                            harvestData.quality === quality
                              ? quality === 'excellent' ? 'bg-green-500 text-white' :
                                quality === 'good' ? 'bg-blue-500 text-white' :
                                quality === 'average' ? 'bg-amber-500 text-white' :
                                'bg-red-500 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {quality === 'excellent' && '⭐'}
                          {quality === 'good' && '👍'}
                          {quality === 'average' && '👌'}
                          {quality === 'poor' && '👎'}
                          <span className="ml-1 capitalize">{t(`fields.quality${quality.charAt(0).toUpperCase() + quality.slice(1)}`, quality)}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('fields.harvestNotes', 'Notes (optional)')}
                    </label>
                    <textarea
                      value={harvestData.notes}
                      onChange={(e) => setHarvestData({ ...harvestData, notes: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                      placeholder={t('fields.harvestNotesPlaceholder', 'Any notes about this harvest...')}
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm text-amber-800">
                      <Check size={14} className="inline mr-1" />
                      {t('fields.harvestInventoryNote', 'This harvest will be automatically added to your inventory.')}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setHarvestingField(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg hover:from-amber-600 hover:to-amber-700 transition-all font-medium"
                    >
                      <Check size={18} className="inline mr-1" />
                      {t('fields.saveHarvest', 'Save Harvest')}
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
