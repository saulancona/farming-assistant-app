import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Sprout,
  Wheat,
  CloudRain,
  Droplets,
  Bug,
  ShoppingCart,
  CheckCircle,
  Clock,
  Plus,
  X
} from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  isValid
} from 'date-fns';
import type { CalendarEvent, Field, Task } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface FarmCalendarProps {
  fields: Field[];
  tasks: Task[];
  onEventClick?: (event: CalendarEvent) => void;
  onAddEvent?: (date: Date) => void;
  onAddTask?: (task: Omit<Task, 'id'>) => Promise<void>;
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

export default function FarmCalendar({ fields, tasks, onEventClick, onAddTask }: FarmCalendarProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<'month' | 'week'>('month');

  // Modal state for adding tasks
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEventDate, setAddEventDate] = useState<Date | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    fieldId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAddModal = (date: Date) => {
    if (!user) {
      toast.error(t('common.signInRequired', 'Please sign in to add tasks'));
      return;
    }
    setAddEventDate(date);
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      fieldId: ''
    });
    setShowAddModal(true);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddTask || !addEventDate) return;

    setIsSubmitting(true);
    try {
      const selectedField = fields.find(f => f.id === newTask.fieldId);
      await onAddTask({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: 'pending',
        dueDate: format(addEventDate, 'yyyy-MM-dd'),
        fieldId: newTask.fieldId || undefined,
        fieldName: selectedField?.name
      });
      setShowAddModal(false);
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error(t('common.error', 'Failed to add task. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate events from fields and tasks
  useEffect(() => {
    const generatedEvents: CalendarEvent[] = [];

    // Add planting dates from fields
    fields.forEach(field => {
      if (field.plantingDate) {
        generatedEvents.push({
          id: `planting-${field.id}`,
          type: 'planting',
          title: `Plant ${field.cropType}`,
          description: `Planting in ${field.name}`,
          date: field.plantingDate,
          color: 'bg-green-500',
          fieldId: field.id,
          fieldName: field.name
        });
      }

      // Add harvest dates
      if (field.expectedHarvest) {
        generatedEvents.push({
          id: `harvest-${field.id}`,
          type: 'harvest',
          title: `Harvest ${field.cropType}`,
          description: `Expected harvest from ${field.name}`,
          date: field.expectedHarvest,
          color: 'bg-amber-500',
          fieldId: field.id,
          fieldName: field.name
        });
      }
    });

    // Add tasks
    tasks.forEach(task => {
      generatedEvents.push({
        id: `task-${task.id}`,
        type: 'task',
        title: task.title,
        description: task.description,
        date: task.dueDate,
        color: task.priority === 'urgent' ? 'bg-red-500' :
               task.priority === 'high' ? 'bg-orange-500' :
               task.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500',
        fieldId: task.fieldId,
        fieldName: task.fieldName,
        priority: task.priority,
        status: task.status,
        relatedId: task.id
      });
    });

    setEvents(generatedEvents);
  }, [fields, tasks]);

  const getEventIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'planting':
        return <Sprout className="w-3 h-3" />;
      case 'harvest':
        return <Wheat className="w-3 h-3" />;
      case 'weather_alert':
        return <CloudRain className="w-3 h-3" />;
      case 'irrigation':
        return <Droplets className="w-3 h-3" />;
      case 'spray':
        return <Bug className="w-3 h-3" />;
      case 'market':
        return <ShoppingCart className="w-3 h-3" />;
      case 'task':
        return <CheckCircle className="w-3 h-3" />;
      default:
        return <Clock className="w-3 h-3" />;
    }
  };

  const renderCalendarDays = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days: React.JSX.Element[] = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day;
      const dayEvents = events.filter(event => {
        const eventDate = safeParseDateISO(event.date);
        return eventDate && isSameDay(eventDate, currentDay);
      });
      const isCurrentMonth = isSameMonth(currentDay, monthStart);
      const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
      const isTodayDate = isToday(currentDay);

      days.push(
        <motion.div
          key={currentDay.toISOString()}
          whileHover={{ scale: 1.02 }}
          onClick={() => setSelectedDate(currentDay)}
          className={`
            min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors
            ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : 'bg-white'}
            ${isSelected ? 'ring-2 ring-green-500 ring-inset' : ''}
            ${isTodayDate ? 'bg-green-50' : ''}
            hover:bg-gray-50
          `}
        >
          <div className="flex items-center justify-between mb-1">
            <span className={`
              text-sm font-medium
              ${isTodayDate ? 'bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center' : ''}
            `}>
              {format(currentDay, 'd')}
            </span>
            {isCurrentMonth && onAddTask && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenAddModal(currentDay);
                }}
                className="p-1 hover:bg-gray-200 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Plus className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {dayEvents.slice(0, 3).map(event => (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                className={`
                  ${event.color} text-white text-xs px-1.5 py-0.5 rounded truncate
                  flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity
                `}
              >
                {getEventIcon(event.type)}
                <span className="truncate">{event.title}</span>
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-500 pl-1">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </motion.div>
      );

      day = addDays(day, 1);
    }

    return days;
  };

  const getSelectedDateEvents = () => {
    if (!selectedDate) return [];
    return events.filter(event => {
      const eventDate = safeParseDateISO(event.date);
      return eventDate && isSameDay(eventDate, selectedDate);
    });
  };

  const upcomingEvents = events
    .filter(event => {
      const eventDate = safeParseDateISO(event.date);
      return eventDate && eventDate >= new Date();
    })
    .sort((a, b) => {
      const dateA = safeParseDateISO(a.date);
      const dateB = safeParseDateISO(b.date);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            {t('calendar.title', 'Farm Calendar')}
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            {t('calendar.subtitle', 'Plan and track your farming activities')}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setView('month')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'month' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView('week')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              view === 'week' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
            }`}
          >
            Week
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-md overflow-hidden"
          >
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between p-4 border-b">
              <button
                onClick={() => setCurrentDate(subMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {format(currentDate, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day Headers */}
            <div className="grid grid-cols-7 bg-gray-50">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="p-2 text-center text-sm font-medium text-gray-600">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
              {renderCalendarDays()}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Selected Date Events */}
          {selectedDate && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-xl shadow-md p-4"
            >
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-gray-900">
                  {format(selectedDate, 'MMMM d, yyyy')}
                </h3>
              </div>

              {getSelectedDateEvents().length === 0 ? (
                <p className="text-sm text-gray-500">No events scheduled</p>
              ) : (
                <div className="space-y-2">
                  {getSelectedDateEvents().map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick?.(event)}
                      className="p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${event.color}`} />
                        <span className="text-sm font-medium">{event.title}</span>
                      </div>
                      {event.fieldName && (
                        <p className="text-xs text-gray-500 ml-4">{event.fieldName}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {onAddTask && (
                <button
                  onClick={() => handleOpenAddModal(selectedDate)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Event
                </button>
              )}
            </motion.div>
          )}

          {/* Upcoming Events */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-md p-4"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Upcoming Events</h3>

            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming events</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className={`p-1.5 rounded-lg ${event.color} text-white`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {event.title}
                      </p>
                      <p className="text-xs text-gray-500">
                        {safeParseDateISO(event.date) ? format(safeParseDateISO(event.date)!, 'MMM d, yyyy') : 'No date'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Legend */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl shadow-md p-4"
          >
            <h3 className="font-semibold text-gray-900 mb-3">Legend</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-sm text-gray-600">Planting</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-sm text-gray-600">Harvest</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-sm text-gray-600">Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-sm text-gray-600">Urgent</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add Task Modal */}
      <AnimatePresence>
        {showAddModal && addEventDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Task for {format(addEventDate, 'MMMM d, yyyy')}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleAddTask} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter task title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Enter task description"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as Task['priority'] })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {fields.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Related Field (Optional)
                    </label>
                    <select
                      value={newTask.fieldId}
                      onChange={(e) => setNewTask({ ...newTask, fieldId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      <option value="">No specific field</option>
                      {fields.map(field => (
                        <option key={field.id} value={field.id}>
                          {field.name} - {field.cropType}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !newTask.title.trim()}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
