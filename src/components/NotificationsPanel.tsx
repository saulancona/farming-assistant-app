import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckSquare, CloudRain, X } from 'lucide-react';
import type { Task, WeatherData } from '../types';
import { differenceInDays, isPast, parseISO } from 'date-fns';

interface NotificationsPanelProps {
  tasks: Task[];
  weatherData: WeatherData | null;
}

interface Notification {
  id: string;
  type: 'task' | 'weather';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  icon: any;
}

export default function NotificationsPanel({ tasks, weatherData }: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const panelRef = useRef<HTMLDivElement>(null);

  // Load dismissed notifications from localStorage
  useEffect(() => {
    const dismissed = localStorage.getItem('dismissedNotifications');
    if (dismissed) {
      try {
        setDismissedIds(new Set(JSON.parse(dismissed)));
      } catch (error) {
        console.error('Error loading dismissed notifications:', error);
      }
    }
  }, []);

  // Save dismissed notifications to localStorage
  useEffect(() => {
    localStorage.setItem('dismissedNotifications', JSON.stringify(Array.from(dismissedIds)));
  }, [dismissedIds]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Generate notifications
  const notifications = useMemo(() => {
    const notifs: Notification[] = [];

    // Task reminders - tasks due within 7 days or overdue
    tasks.forEach(task => {
      // Skip if task is completed or has no due date
      if (task.status === 'completed' || !task.dueDate) {
        return;
      }

      try {
        const dueDate = parseISO(task.dueDate);
        // Check if the parsed date is valid
        if (isNaN(dueDate.getTime())) {
          return;
        }

        const daysUntilDue = differenceInDays(dueDate, new Date());
        const isOverdue = isPast(dueDate) && !task.completedAt;

        if (isOverdue) {
          notifs.push({
            id: `task-overdue-${task.id}`,
            type: 'task',
            title: 'Overdue Task',
            message: `"${task.title}" was due ${Math.abs(daysUntilDue)} days ago`,
            priority: 'high',
            icon: CheckSquare
          });
        } else if (daysUntilDue >= 0 && daysUntilDue <= 7) {
          notifs.push({
            id: `task-upcoming-${task.id}`,
            type: 'task',
            title: 'Upcoming Task',
            message: `"${task.title}" is due in ${daysUntilDue} day${daysUntilDue !== 1 ? 's' : ''}`,
            priority: daysUntilDue <= 2 ? 'high' : 'medium',
            icon: CheckSquare
          });
        }
      } catch (error) {
        // Skip tasks with invalid dates
        console.warn('Invalid task date for task:', task.id, task.dueDate);
      }
    });

    // Weather alerts
    if (weatherData && weatherData.sprayWindow && !weatherData.sprayWindow.isIdeal) {
      notifs.push({
        id: 'weather-spray-window',
        type: 'weather',
        title: 'Weather Alert',
        message: weatherData.sprayWindow.reason,
        priority: 'low',
        icon: CloudRain
      });
    }

    // Filter out dismissed notifications
    return notifs.filter(n => !dismissedIds.has(n.id));
  }, [tasks, weatherData, dismissedIds]);

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleClearAll = () => {
    const allIds = notifications.map(n => n.id);
    setDismissedIds(prev => {
      const newSet = new Set(prev);
      allIds.forEach(id => newSet.add(id));
      return newSet;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
        aria-label={`Notifications${notifications.length > 0 ? `, ${notifications.length} unread` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Bell size={24} aria-hidden="true" />
        {notifications.length > 0 && (
          <span
            className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center"
            aria-hidden="true"
          >
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[600px] overflow-hidden flex flex-col"
            role="dialog"
            aria-label="Notifications panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Notifications
                {notifications.length > 0 && (
                  <span className="ml-2 text-sm text-gray-500">({notifications.length})</span>
                )}
              </h3>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                  aria-label="Clear all notifications"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">No new notifications</p>
                  <p className="text-sm text-gray-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="p-2 space-y-2">
                  {notifications.map((notification) => {
                    const Icon = notification.icon;
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className={`p-3 rounded-lg border ${getPriorityColor(notification.priority)} relative group`}
                      >
                        <button
                          onClick={(e) => handleDismiss(notification.id, e)}
                          className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white rounded"
                          aria-label={`Dismiss notification: ${notification.title}`}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5">
                            <Icon size={18} />
                          </div>
                          <div className="flex-1 pr-6">
                            <p className="font-semibold text-sm">{notification.title}</p>
                            <p className="text-sm mt-0.5 opacity-90">{notification.message}</p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
