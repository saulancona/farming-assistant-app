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
  X,
  Activity,
  Filter
} from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
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
import {
  useMonthActivities,
  getActivityConfig,
  groupActivitiesByDate,
  ACTIVITY_TYPE_CONFIG,
  type CalendarActivity
} from '../hooks/useCalendarActivities';

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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [showActivities, setShowActivities] = useState(true);
  const [activityFilter, setActivityFilter] = useState<string[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const isSwahili = i18n.language === 'sw';

  // Fetch activities for current month
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  const { data: activities = [] } = useMonthActivities(
    user?.id,
    currentYear,
    currentMonth
  );

  // Group activities by date for easy lookup
  const activitiesByDate = useMemo(() => {
    const filtered = activityFilter.length > 0
      ? activities.filter(a => activityFilter.includes(a.activityType))
      : activities;
    return groupActivitiesByDate(filtered);
  }, [activities, activityFilter]);

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

  // Day detail popup state
  const [showDayDetail, setShowDayDetail] = useState(false);
  const [dayDetailDate, setDayDetailDate] = useState<Date | null>(null);

  const handleDayClick = (date: Date) => {
    setDayDetailDate(date);
    setShowDayDetail(true);
    setSelectedDate(date);
  };

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
      const fieldName = newTask.fieldId === 'all' ? 'All Fields' : selectedField?.name;
      await onAddTask({
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        status: 'pending',
        dueDate: format(addEventDate, 'yyyy-MM-dd'),
        fieldId: newTask.fieldId || undefined,
        fieldName: fieldName
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

      // Get activities for this day
      const dateKey = format(currentDay, 'yyyy-MM-dd');
      const dayActivities = showActivities ? (activitiesByDate[dateKey] || []) : [];

      const isCurrentMonth = isSameMonth(currentDay, monthStart);
      const isSelected = selectedDate && isSameDay(currentDay, selectedDate);
      const isTodayDate = isToday(currentDay);

      // Total items for the day
      const totalItems = dayEvents.length + dayActivities.length;

      days.push(
        <motion.div
          key={currentDay.toISOString()}
          whileHover={{ scale: 1.02 }}
          onClick={() => handleDayClick(currentDay)}
          className={`
            min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors group
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
            <div className="flex items-center gap-1">
              {/* Activity indicator dots */}
              {dayActivities.length > 0 && (
                <div className="flex -space-x-1">
                  {Array.from(new Set(dayActivities.map(a => a.activityType))).slice(0, 3).map((type, i) => {
                    const config = getActivityConfig(type);
                    return (
                      <span
                        key={i}
                        className={`w-2 h-2 rounded-full ${config.bgColor} border border-white`}
                        title={config.labelEn}
                      />
                    );
                  })}
                </div>
              )}
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
          </div>

          <div className="space-y-1">
            {/* Show regular events */}
            {dayEvents.slice(0, 2).map(event => (
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

            {/* Show activity items */}
            {showActivities && dayActivities.slice(0, Math.max(0, 3 - dayEvents.length)).map(activity => {
              const config = getActivityConfig(activity.activityType);
              return (
                <div
                  key={activity.id}
                  className={`${config.bgColor} text-gray-700 text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1`}
                >
                  <span>{activity.icon || config.icon}</span>
                  <span className="truncate">{isSwahili && activity.titleSw ? activity.titleSw : activity.title}</span>
                </div>
              );
            })}

            {totalItems > 3 && (
              <div className="text-xs text-gray-500 pl-1">
                +{totalItems - 3} more
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

  const getSelectedDateActivities = (): CalendarActivity[] => {
    if (!selectedDate || !showActivities) return [];
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const dayActivities = activitiesByDate[dateKey] || [];
    return activityFilter.length > 0
      ? dayActivities.filter(a => activityFilter.includes(a.activityType))
      : dayActivities;
  };

  // Get events and activities for day detail popup
  const getDayDetailEvents = () => {
    if (!dayDetailDate) return [];
    return events.filter(event => {
      const eventDate = safeParseDateISO(event.date);
      return eventDate && isSameDay(eventDate, dayDetailDate);
    });
  };

  const getDayDetailActivities = (): CalendarActivity[] => {
    if (!dayDetailDate) return [];
    const dateKey = format(dayDetailDate, 'yyyy-MM-dd');
    const dayActivities = activitiesByDate[dateKey] || [];
    return activityFilter.length > 0
      ? dayActivities.filter(a => activityFilter.includes(a.activityType))
      : dayActivities;
  };

  const toggleActivityFilter = (type: string) => {
    setActivityFilter(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
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

        {/* Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Activity Toggle */}
          <button
            onClick={() => setShowActivities(!showActivities)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              showActivities
                ? 'bg-green-100 text-green-700 border border-green-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            {t('calendar.activities', 'Activities')}
          </button>

          {/* Filter Button */}
          {showActivities && (
            <div className="relative">
              <button
                onClick={() => setShowFilterMenu(!showFilterMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activityFilter.length > 0
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}
              >
                <Filter className="w-4 h-4" />
                {activityFilter.length > 0 ? `${activityFilter.length} filtered` : t('calendar.filter', 'Filter')}
              </button>

              {/* Filter Dropdown */}
              <AnimatePresence>
                {showFilterMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border p-2 z-50 w-64 max-h-80 overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-2 pb-2 border-b">
                      <span className="text-sm font-medium text-gray-700">
                        {t('calendar.filterActivities', 'Filter Activities')}
                      </span>
                      {activityFilter.length > 0 && (
                        <button
                          onClick={() => setActivityFilter([])}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="space-y-1">
                      {Object.entries(ACTIVITY_TYPE_CONFIG).map(([type, config]) => (
                        <label
                          key={type}
                          className="flex items-center gap-2 p-1.5 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={activityFilter.length === 0 || activityFilter.includes(type)}
                            onChange={() => toggleActivityFilter(type)}
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className={`w-5 h-5 rounded flex items-center justify-center ${config.bgColor}`}>
                            {config.icon}
                          </span>
                          <span className="text-sm text-gray-700">
                            {isSwahili ? config.labelSw : config.labelEn}
                          </span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
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
          {/* Selected Date Events & Activities */}
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

              {getSelectedDateEvents().length === 0 && getSelectedDateActivities().length === 0 ? (
                <p className="text-sm text-gray-500">
                  {t('calendar.noEvents', 'No events or activities')}
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {/* Scheduled Events */}
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

                  {/* Activity Log Items */}
                  {showActivities && getSelectedDateActivities().map(activity => {
                    const config = getActivityConfig(activity.activityType);
                    return (
                      <div
                        key={activity.id}
                        className={`p-2 ${config.bgColor} rounded-lg`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{activity.icon || config.icon}</span>
                          <span className="text-sm font-medium text-gray-800">
                            {isSwahili && activity.titleSw ? activity.titleSw : activity.title}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-xs text-gray-600 ml-6 mt-0.5">
                            {isSwahili && activity.descriptionSw ? activity.descriptionSw : activity.description}
                          </p>
                        )}
                        {activity.fieldName && (
                          <p className="text-xs text-gray-500 ml-6">
                            {activity.fieldName}
                          </p>
                        )}
                        {activity.activityTime && (
                          <p className="text-xs text-gray-400 ml-6">
                            {activity.activityTime.substring(0, 5)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {onAddTask && (
                <button
                  onClick={() => handleOpenAddModal(selectedDate)}
                  className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('calendar.addEvent', 'Add Event')}
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
            <h3 className="font-semibold text-gray-900 mb-3">
              {t('calendar.legend', 'Legend')}
            </h3>
            <div className="space-y-2">
              {/* Event types */}
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                {t('calendar.events', 'Events')}
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-sm text-gray-600">{t('calendar.planting', 'Planting')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-sm text-gray-600">{t('calendar.harvest', 'Harvest')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-sm text-gray-600">{t('calendar.tasks', 'Tasks')}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span className="text-sm text-gray-600">{t('calendar.urgent', 'Urgent')}</span>
              </div>

              {/* Activity types */}
              {showActivities && (
                <>
                  <div className="text-xs font-medium text-gray-500 uppercase mt-3 mb-1">
                    {t('calendar.activityTypes', 'Activities')}
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {Object.entries(ACTIVITY_TYPE_CONFIG).slice(0, 8).map(([type, config]) => (
                      <div key={type} className="flex items-center gap-1">
                        <span className="text-xs">{config.icon}</span>
                        <span className="text-xs text-gray-600 truncate">
                          {isSwahili ? config.labelSw : config.labelEn}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
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
                      <option value="all">All Fields</option>
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

      {/* Day Detail Popup Modal */}
      <AnimatePresence>
        {showDayDetail && dayDetailDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowDayDetail(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-green-600 to-green-700 text-white">
                <div>
                  <h2 className="text-xl font-bold">
                    {format(dayDetailDate, 'EEEE')}
                  </h2>
                  <p className="text-green-100 text-sm">
                    {format(dayDetailDate, 'MMMM d, yyyy')}
                  </p>
                </div>
                <button
                  onClick={() => setShowDayDetail(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Summary Stats */}
                <div className="flex gap-3">
                  <div className="flex-1 bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">
                      {getDayDetailEvents().length}
                    </p>
                    <p className="text-xs text-blue-600">
                      {t('calendar.events', 'Events')}
                    </p>
                  </div>
                  <div className="flex-1 bg-purple-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">
                      {getDayDetailActivities().length}
                    </p>
                    <p className="text-xs text-purple-600">
                      {t('calendar.activities', 'Activities')}
                    </p>
                  </div>
                </div>

                {/* Events Section */}
                {getDayDetailEvents().length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" />
                      {t('calendar.scheduledEvents', 'Scheduled Events')}
                    </h3>
                    <div className="space-y-2">
                      {getDayDetailEvents().map(event => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => {
                            onEventClick?.(event);
                            setShowDayDetail(false);
                          }}
                          className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                        >
                          <div className={`p-2 rounded-lg ${event.color} text-white flex-shrink-0`}>
                            {getEventIcon(event.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900">{event.title}</p>
                            {event.description && (
                              <p className="text-sm text-gray-500 mt-0.5">{event.description}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              {event.fieldName && (
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                  {event.fieldName}
                                </span>
                              )}
                              {event.priority && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  event.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                  event.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                                  event.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {event.priority}
                                </span>
                              )}
                              {event.status && (
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  event.status === 'completed' ? 'bg-green-100 text-green-700' :
                                  event.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {event.status.replace('_', ' ')}
                                </span>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activities Section */}
                {showActivities && getDayDetailActivities().length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      {t('calendar.activityLog', 'Activity Log')}
                    </h3>
                    <div className="space-y-2">
                      {getDayDetailActivities().map((activity, index) => {
                        const config = getActivityConfig(activity.activityType);
                        return (
                          <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-3 ${config.bgColor} rounded-lg`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="text-xl flex-shrink-0">
                                {activity.icon || config.icon}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">
                                  {isSwahili && activity.titleSw ? activity.titleSw : activity.title}
                                </p>
                                {activity.description && (
                                  <p className="text-sm text-gray-600 mt-0.5">
                                    {isSwahili && activity.descriptionSw ? activity.descriptionSw : activity.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded">
                                    {isSwahili ? config.labelSw : config.labelEn}
                                  </span>
                                  {activity.fieldName && (
                                    <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded">
                                      {activity.fieldName}
                                    </span>
                                  )}
                                  {activity.activityTime && (
                                    <span className="text-xs text-gray-400">
                                      {activity.activityTime.substring(0, 5)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {getDayDetailEvents().length === 0 && getDayDetailActivities().length === 0 && (
                  <div className="text-center py-8">
                    <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">
                      {t('calendar.noEventsForDay', 'No events or activities')}
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      {t('calendar.noEventsDesc', 'This day has no scheduled events or logged activities')}
                    </p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => setShowDayDetail(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  {t('common.close', 'Close')}
                </button>
                {onAddTask && (
                  <button
                    onClick={() => {
                      setShowDayDetail(false);
                      handleOpenAddModal(dayDetailDate);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {t('calendar.addTask', 'Add Task')}
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
