import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, CheckCircle, Clock, AlertCircle, Calendar, X } from 'lucide-react';
import { format, isPast, isToday, isTomorrow, parseISO, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';
import type { Task, Field } from '../types';

interface TaskManagerProps {
  tasks: Task[];
  fields: Field[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTask: (id: string, task: Partial<Task>) => void;
  onDeleteTask: (id: string) => void;
}

// Helper to safely parse ISO date strings
const safeParseDateISO = (dateStr: string | undefined | null): Date | null => {
  if (!dateStr) return null;
  try {
    const date = parseISO(dateStr);
    return isValid(date) ? date : null;
  } catch {
    return null;
  }
};

export default function TaskManager({ tasks, fields, onAddTask, onUpdateTask, onDeleteTask }: TaskManagerProps) {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filterStatus, setFilterStatus] = useState<Task['status'] | 'all'>('all');
  const [formData, setFormData] = useState<Omit<Task, 'id'>>({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium',
    status: 'pending',
    fieldId: '',
    fieldName: '',
    assignedTo: '',
  });

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        description: task.description || '',
        dueDate: task.dueDate,
        priority: task.priority,
        status: task.status,
        fieldId: task.fieldId || '',
        fieldName: task.fieldName || '',
        assignedTo: task.assignedTo || '',
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: '',
        description: '',
        dueDate: format(new Date(), 'yyyy-MM-dd'),
        priority: 'medium',
        status: 'pending',
        fieldId: '',
        fieldName: '',
        assignedTo: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedField = fields.find(f => f.id === formData.fieldId);
    const taskData: any = {
      title: formData.title,
      description: formData.description,
      dueDate: formData.dueDate,
      priority: formData.priority,
      status: formData.status,
      completedAt: formData.status === 'completed' ? new Date().toISOString() : undefined,
    };

    // Only include fieldId and fieldName if a field was actually selected
    if (formData.fieldId && selectedField) {
      taskData.fieldId = formData.fieldId;
      taskData.fieldName = selectedField.name;
    }

    // Only include assignedTo if provided
    if (formData.assignedTo) {
      taskData.assignedTo = formData.assignedTo;
    }

    if (editingTask) {
      onUpdateTask(editingTask.id, taskData);
    } else {
      onAddTask(taskData);
    }
    handleCloseModal();
  };

  const handleToggleComplete = (task: Task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    onUpdateTask(task.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low':
        return 'bg-gray-100 text-gray-800';
      case 'medium':
        return 'bg-blue-100 text-blue-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'urgent':
        return 'bg-red-100 text-red-800';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return t('tasks.pending', 'Pending');
      case 'in_progress':
        return t('tasks.inProgress', 'In Progress');
      case 'completed':
        return t('tasks.completed', 'Completed');
      case 'cancelled':
        return t('tasks.cancelled', 'Cancelled');
    }
  };

  const getDueDateLabel = (dueDate: string | undefined | null) => {
    const date = safeParseDateISO(dueDate);
    if (!date) return 'No date';
    if (isToday(date)) return t('tasks.today', 'Today');
    if (isTomorrow(date)) return t('tasks.tomorrow', 'Tomorrow');
    if (isPast(date)) return t('tasks.overdue', 'Overdue');
    return format(date, 'MMM d, yyyy');
  };

  const getDueDateColor = (dueDate: string | undefined | null, status: Task['status']) => {
    if (status === 'completed') return 'text-gray-500';
    const date = safeParseDateISO(dueDate);
    if (!date) return 'text-gray-500';
    if (isPast(date)) return 'text-red-600 font-semibold';
    if (isToday(date) || isTomorrow(date)) return 'text-orange-600 font-semibold';
    return 'text-gray-600';
  };

  const filteredTasks = filterStatus === 'all'
    ? tasks
    : tasks.filter(t => t.status === filterStatus);

  const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => {
    if (t.status !== 'pending' && t.status !== 'in_progress') return false;
    const dueDate = safeParseDateISO(t.dueDate);
    return dueDate && isPast(dueDate);
  }).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('tasks.managerTitle', 'Task Manager')}</h1>
          <p className="text-gray-600 mt-1">{t('tasks.scheduleDesc', 'Schedule and track farm tasks')}</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
        >
          <Plus size={20} />
          {t('tasks.addTask', 'Add Task')}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('tasks.totalTasks', 'Total Tasks')}</p>
              <p className="text-3xl font-bold text-gray-900">{tasks.length}</p>
            </div>
            <div className="bg-gray-100 p-3 rounded-lg">
              <Clock className="text-gray-600" size={24} />
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
              <p className="text-sm text-gray-600 mb-1">{t('tasks.pending', 'Pending')}</p>
              <p className="text-3xl font-bold text-blue-600">{pendingTasks}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Clock className="text-blue-600" size={24} />
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
              <p className="text-sm text-gray-600 mb-1">{t('tasks.completed', 'Completed')}</p>
              <p className="text-3xl font-bold text-green-600">{completedTasks}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="text-green-600" size={24} />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-md p-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{t('tasks.overdue', 'Overdue')}</p>
              <p className="text-3xl font-bold text-red-600">{overdueTasks}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-lg">
              <AlertCircle className="text-red-600" size={24} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="flex gap-2 overflow-x-auto">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                filterStatus === status
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? t('tasks.allTasks', 'All Tasks') : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.map((task, index) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start gap-4">
              <button
                onClick={() => handleToggleComplete(task)}
                className={`flex-shrink-0 mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                  task.status === 'completed'
                    ? 'bg-green-600 border-green-600'
                    : 'border-gray-300 hover:border-green-600'
                }`}
              >
                {task.status === 'completed' && (
                  <CheckCircle size={16} className="text-white" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1">
                    <h3 className={`text-lg font-semibold ${
                      task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'
                    }`}>
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenModal(task)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-red-600" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <div className={`flex items-center gap-1 ${getDueDateColor(task.dueDate, task.status)}`}>
                    <Calendar size={14} />
                    <span>{getDueDateLabel(task.dueDate)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {t(`tasks.${task.priority}`, task.priority.toUpperCase())}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusLabel(task.status)}
                  </span>
                  {task.fieldName && (
                    <span className="text-gray-600">
                      📍 {task.fieldName}
                    </span>
                  )}
                  {task.assignedTo && (
                    <span className="text-gray-600">
                      👤 {task.assignedTo}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl shadow-md">
            <Clock className="mx-auto text-gray-400 mb-4" size={48} />
            <p className="text-gray-600">
              {filterStatus === 'all'
                ? t('tasks.noTasksYet', 'No tasks yet. Add your first task to get started!')
                : t('tasks.noTasksFilter', 'No {{status}} tasks found.', { status: filterStatus })}
            </p>
          </div>
        )}
      </div>

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
                    {editingTask ? t('tasks.editTask', 'Edit Task') : t('tasks.addNewTask', 'Add New Task')}
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
                      {t('tasks.taskTitle', 'Task Title')}
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="e.g., Apply fertilizer to North Field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tasks.descriptionOptional', 'Description (optional)')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Additional details..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tasks.dueDate', 'Due Date')}
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tasks.priority', 'Priority')}
                    </label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task['priority'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="low">{t('tasks.low', 'Low')}</option>
                      <option value="medium">{t('tasks.medium', 'Medium')}</option>
                      <option value="high">{t('tasks.high', 'High')}</option>
                      <option value="urgent">{t('tasks.urgent', 'Urgent')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tasks.status', 'Status')}
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Task['status'] })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="pending">{t('tasks.pending', 'Pending')}</option>
                      <option value="in_progress">{t('tasks.inProgress', 'In Progress')}</option>
                      <option value="completed">{t('tasks.completed', 'Completed')}</option>
                      <option value="cancelled">{t('tasks.cancelled', 'Cancelled')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tasks.fieldOptional', 'Field (optional)')}
                    </label>
                    <select
                      value={formData.fieldId}
                      onChange={(e) => setFormData({ ...formData, fieldId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">{t('expenses.none', 'None')}</option>
                      {fields.map((field) => (
                        <option key={field.id} value={field.id}>
                          {field.name} - {field.cropType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('tasks.assignedToOptional', 'Assigned To (optional)')}
                    </label>
                    <input
                      type="text"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      placeholder="Person's name"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      {t('common.save', 'Save')}
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
