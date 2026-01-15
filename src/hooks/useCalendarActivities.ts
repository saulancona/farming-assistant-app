import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface CalendarActivity {
  id: string;
  activityType: string;
  title: string;
  titleSw: string | null;
  description: string | null;
  descriptionSw: string | null;
  activityDate: string;
  activityTime: string | null;
  relatedId: string | null;
  relatedType: string | null;
  fieldId: string | null;
  fieldName: string | null;
  icon: string | null;
  color: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// Activity type display mapping
export const ACTIVITY_TYPE_CONFIG: Record<string, {
  icon: string;
  color: string;
  labelEn: string;
  labelSw: string;
  bgColor: string;
}> = {
  mission_step_completed: {
    icon: '🎯',
    color: 'blue',
    bgColor: 'bg-blue-100',
    labelEn: 'Mission Step',
    labelSw: 'Hatua ya Misheni',
  },
  mission_completed: {
    icon: '🏆',
    color: 'gold',
    bgColor: 'bg-yellow-100',
    labelEn: 'Mission Complete',
    labelSw: 'Misheni Imekamilika',
  },
  challenge_completed: {
    icon: '🎯',
    color: 'orange',
    bgColor: 'bg-orange-100',
    labelEn: 'Challenge Complete',
    labelSw: 'Changamoto Imekamilika',
  },
  harvest_recorded: {
    icon: '🌾',
    color: 'amber',
    bgColor: 'bg-amber-100',
    labelEn: 'Harvest',
    labelSw: 'Mavuno',
  },
  harvest_sold: {
    icon: '💰',
    color: 'green',
    bgColor: 'bg-green-100',
    labelEn: 'Sale',
    labelSw: 'Mauzo',
  },
  task_completed: {
    icon: '✅',
    color: 'green',
    bgColor: 'bg-green-100',
    labelEn: 'Task Done',
    labelSw: 'Kazi Imekamilika',
  },
  expense_logged: {
    icon: '💸',
    color: 'red',
    bgColor: 'bg-red-100',
    labelEn: 'Expense',
    labelSw: 'Gharama',
  },
  income_logged: {
    icon: '💵',
    color: 'green',
    bgColor: 'bg-green-100',
    labelEn: 'Income',
    labelSw: 'Mapato',
  },
  story_milestone_uploaded: {
    icon: '📸',
    color: 'purple',
    bgColor: 'bg-purple-100',
    labelEn: 'Story Photo',
    labelSw: 'Picha ya Hadithi',
  },
  story_quest_completed: {
    icon: '🌟',
    color: 'purple',
    bgColor: 'bg-purple-100',
    labelEn: 'Story Complete',
    labelSw: 'Hadithi Imekamilika',
  },
  article_completed: {
    icon: '📚',
    color: 'indigo',
    bgColor: 'bg-indigo-100',
    labelEn: 'Article Read',
    labelSw: 'Makala Imesomwa',
  },
  video_completed: {
    icon: '🎬',
    color: 'indigo',
    bgColor: 'bg-indigo-100',
    labelEn: 'Video Watched',
    labelSw: 'Video Imetazamwa',
  },
  photo_submitted: {
    icon: '📷',
    color: 'cyan',
    bgColor: 'bg-cyan-100',
    labelEn: 'Photo Submitted',
    labelSw: 'Picha Imetumwa',
  },
  streak_milestone: {
    icon: '🔥',
    color: 'orange',
    bgColor: 'bg-orange-100',
    labelEn: 'Streak Milestone',
    labelSw: 'Lengo la Mfululizo',
  },
  achievement_unlocked: {
    icon: '🏅',
    color: 'gold',
    bgColor: 'bg-yellow-100',
    labelEn: 'Achievement',
    labelSw: 'Mafanikio',
  },
  field_planted: {
    icon: '🌱',
    color: 'green',
    bgColor: 'bg-green-100',
    labelEn: 'Field Planted',
    labelSw: 'Shamba Limepandwa',
  },
  field_harvested: {
    icon: '🌾',
    color: 'amber',
    bgColor: 'bg-amber-100',
    labelEn: 'Field Harvested',
    labelSw: 'Shamba Limevunwa',
  },
  marketplace_purchase: {
    icon: '🛒',
    color: 'green',
    bgColor: 'bg-green-100',
    labelEn: 'Purchase',
    labelSw: 'Ununuzi',
  },
  marketplace_sale: {
    icon: '💰',
    color: 'emerald',
    bgColor: 'bg-emerald-100',
    labelEn: 'Sale',
    labelSw: 'Mauzo',
  },
  pest_diagnosis: {
    icon: '🐛',
    color: 'amber',
    bgColor: 'bg-amber-100',
    labelEn: 'Pest Diagnosis',
    labelSw: 'Uchunguzi wa Wadudu',
  },
  input_cost_logged: {
    icon: '💰',
    color: 'blue',
    bgColor: 'bg-blue-100',
    labelEn: 'Input Cost',
    labelSw: 'Gharama ya Pembejeo',
  },
};

/**
 * Get activity type configuration
 */
export function getActivityConfig(activityType: string) {
  return ACTIVITY_TYPE_CONFIG[activityType] || {
    icon: '📋',
    color: 'gray',
    bgColor: 'bg-gray-100',
    labelEn: 'Activity',
    labelSw: 'Shughuli',
  };
}

/**
 * Hook to fetch calendar activities for a user
 */
export function useCalendarActivities(
  userId: string | undefined,
  startDate?: Date,
  endDate?: Date,
  activityTypes?: string[]
) {
  return useQuery({
    queryKey: ['calendarActivities', userId, startDate?.toISOString(), endDate?.toISOString(), activityTypes],
    queryFn: async (): Promise<CalendarActivity[]> => {
      if (!userId) return [];

      const { data, error } = await supabase.rpc('get_calendar_activities', {
        p_user_id: userId,
        p_start_date: startDate?.toISOString().split('T')[0] || null,
        p_end_date: endDate?.toISOString().split('T')[0] || null,
        p_activity_types: activityTypes || null,
      });

      if (error) {
        console.error('[Calendar] Error fetching activities:', error);
        return [];
      }

      return (data || []).map((activity: any) => ({
        id: activity.id,
        activityType: activity.activity_type,
        title: activity.title,
        titleSw: activity.title_sw,
        description: activity.description,
        descriptionSw: activity.description_sw,
        activityDate: activity.activity_date,
        activityTime: activity.activity_time,
        relatedId: activity.related_id,
        relatedType: activity.related_type,
        fieldId: activity.field_id,
        fieldName: activity.field_name,
        icon: activity.icon,
        color: activity.color,
        metadata: activity.metadata || {},
        createdAt: activity.created_at,
      }));
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook to fetch activities for a specific month
 */
export function useMonthActivities(userId: string | undefined, year: number, month: number) {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  return useCalendarActivities(userId, startDate, endDate);
}

/**
 * Hook to fetch activities for a specific date
 */
export function useDateActivities(userId: string | undefined, date: Date) {
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  return useCalendarActivities(userId, startDate, endDate);
}

/**
 * Group activities by date
 */
export function groupActivitiesByDate(activities: CalendarActivity[]): Record<string, CalendarActivity[]> {
  return activities.reduce((groups, activity) => {
    const date = activity.activityDate;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(activity);
    return groups;
  }, {} as Record<string, CalendarActivity[]>);
}

/**
 * Get activities count by date (for calendar dots)
 */
export function getActivityCountsByDate(activities: CalendarActivity[]): Record<string, number> {
  return activities.reduce((counts, activity) => {
    const date = activity.activityDate;
    counts[date] = (counts[date] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
}

/**
 * Get activity types present on each date (for colored dots)
 */
export function getActivityTypesByDate(activities: CalendarActivity[]): Record<string, Set<string>> {
  return activities.reduce((types, activity) => {
    const date = activity.activityDate;
    if (!types[date]) {
      types[date] = new Set();
    }
    types[date].add(activity.activityType);
    return types;
  }, {} as Record<string, Set<string>>);
}

export default useCalendarActivities;
