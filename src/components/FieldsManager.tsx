import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Sprout, Calendar, MapPin, X } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Field } from '../types';
import TalkingButton from './TalkingButton';

interface FieldsManagerProps {
  fields: Field[];
  onAddField: (field: Omit<Field, 'id'>) => void;
  onUpdateField: (id: string, field: Partial<Field>) => void;
  onDeleteField: (id: string) => void;
  readOnly?: boolean;
  onRequestAuth?: () => void;
}

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

export default function FieldsManager({ fields, onAddField, onUpdateField, onDeleteField, readOnly = false, onRequestAuth }: FieldsManagerProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<Field | null>(null);
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
        area: convertAreaForDisplay(field.area), // Convert for display
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

  const getStatusColor = (status: Field['status']) => {
    switch (status) {
      case 'planted':
        return 'bg-blue-100 text-blue-800';
      case 'growing':
        return 'bg-green-100 text-green-800';
      case 'ready':
        return 'bg-yellow-100 text-yellow-800';
      case 'harvested':
        return 'bg-gray-100 text-gray-800';
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {fields.map((field, index) => (
          <motion.div
            key={field.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 p-2 rounded-lg">
                  <Sprout className="text-primary-600" size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{field.name}</h3>
                  <p className="text-sm text-gray-600">{field.cropType}</p>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(field.status)}`}>
                {field.status}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin size={16} className="text-gray-400" />
                <span>{convertAreaForDisplay(field.area)} {farmSizeUnit === 'hectares' ? t('fields.hectares', 'hectares') : t('fields.acres', 'acres')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                <span>{t('fields.planted', 'Planted')}: {safeFormatDate(field.plantingDate, 'MMM d, yyyy')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar size={16} className="text-gray-400" />
                <span>{t('fields.harvest', 'Harvest')}: {safeFormatDate(field.expectedHarvest, 'MMM d, yyyy')}</span>
              </div>
            </div>

            {field.notes && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{field.notes}</p>
            )}

            {!readOnly && (
              <div className="flex gap-2 pt-4 border-t">
                <TalkingButton
                  voiceLabel={t('fields.editVoice', `Edit ${field.name}. Click to edit this field's details.`)}
                  onClick={() => handleOpenModal(field)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  <Edit2 size={16} />
                  {t('common.edit', 'Edit')}
                </TalkingButton>
                <TalkingButton
                  voiceLabel={t('fields.deleteVoice', `Delete ${field.name}. Warning: This will permanently delete this field.`)}
                  onClick={() => onDeleteField(field.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm"
                >
                  <Trash2 size={16} />
                  {t('common.delete', 'Delete')}
                </TalkingButton>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {fields.length === 0 && (
        <div className="text-center py-12">
          <Sprout className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600">{t('fields.noFields', 'No fields yet. Add your first field to get started!')}</p>
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
                      <option value="planted">{t('fields.statusPlanted', 'Planted')}</option>
                      <option value="growing">{t('fields.statusGrowing', 'Growing')}</option>
                      <option value="ready">{t('fields.statusReady', 'Ready')}</option>
                      <option value="harvested">{t('fields.statusHarvested', 'Harvested')}</option>
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
    </div>
  );
}
