// Push Notification Service for AgroAfrica
// Handles weather alerts, task reminders, and other critical notifications

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, any>;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported in this browser');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      // Save preference
      localStorage.setItem('agroafrica_notifications_enabled', 'true');
      console.log('Notification permission granted');
    }

    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

// Show a notification
export async function showNotification(payload: NotificationPayload): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('Notifications not supported');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notification permission not granted');
    return false;
  }

  try {
    // Try to use service worker for better reliability
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        badge: payload.badge || '/icon-192.png',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction || false,
      });
      return true;
    } else {
      // Fallback to regular notification
      new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/icon-192.png',
        tag: payload.tag,
        data: payload.data,
        requireInteraction: payload.requireInteraction || false,
      });
      return true;
    }
  } catch (error) {
    console.error('Error showing notification:', error);
    return false;
  }
}

// Weather alert notification types
export type WeatherAlertType =
  | 'frost'
  | 'storm'
  | 'hail'
  | 'drought'
  | 'flood'
  | 'heat_wave'
  | 'high_wind'
  | 'spray_window';

// Show weather alert notification
export async function showWeatherAlert(
  alertType: WeatherAlertType,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): Promise<boolean> {
  const alertConfig: Record<WeatherAlertType, { title: string; emoji: string }> = {
    frost: { title: 'Frost Warning', emoji: '🥶' },
    storm: { title: 'Storm Alert', emoji: '⛈️' },
    hail: { title: 'Hail Warning', emoji: '🌨️' },
    drought: { title: 'Drought Alert', emoji: '🏜️' },
    flood: { title: 'Flood Warning', emoji: '🌊' },
    heat_wave: { title: 'Heat Wave Alert', emoji: '🌡️' },
    high_wind: { title: 'High Wind Warning', emoji: '💨' },
    spray_window: { title: 'Ideal Spray Window', emoji: '✅' },
  };

  const config = alertConfig[alertType];

  return showNotification({
    title: `${config.emoji} ${config.title}`,
    body: message,
    tag: `weather-${alertType}`,
    requireInteraction: severity === 'critical' || severity === 'high',
    data: {
      type: 'weather_alert',
      alertType,
      severity,
      timestamp: Date.now(),
    },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

// Show task reminder notification
export async function showTaskReminder(
  taskTitle: string,
  dueDate: string,
  priority: 'low' | 'medium' | 'high' | 'urgent'
): Promise<boolean> {
  const priorityEmoji: Record<string, string> = {
    low: '📋',
    medium: '📝',
    high: '⚠️',
    urgent: '🚨',
  };

  return showNotification({
    title: `${priorityEmoji[priority]} Task Reminder`,
    body: `${taskTitle}\nDue: ${dueDate}`,
    tag: `task-reminder-${taskTitle}`,
    requireInteraction: priority === 'urgent',
    data: {
      type: 'task_reminder',
      taskTitle,
      dueDate,
      priority,
    },
    actions: [
      { action: 'complete', title: 'Mark Complete' },
      { action: 'snooze', title: 'Snooze 1hr' },
    ],
  });
}

// Show market price alert
export async function showMarketPriceAlert(
  commodity: string,
  priceChange: number,
  currentPrice: number,
  currency: string
): Promise<boolean> {
  const isIncrease = priceChange > 0;
  const emoji = isIncrease ? '📈' : '📉';
  const changeText = isIncrease ? 'increased' : 'decreased';

  return showNotification({
    title: `${emoji} ${commodity} Price ${changeText}`,
    body: `${commodity} has ${changeText} by ${Math.abs(priceChange).toFixed(1)}%\nCurrent: ${currency} ${currentPrice.toFixed(2)}`,
    tag: `market-${commodity}`,
    data: {
      type: 'market_price',
      commodity,
      priceChange,
      currentPrice,
    },
  });
}

// Check and trigger weather notifications based on weather data
export async function checkWeatherAndNotify(weatherData: {
  current: {
    temp: number;
    humidity: number;
    windSpeed: number;
    condition: string;
    icon?: string;
  };
  alerts?: Array<{
    event: string;
    description: string;
    start: number;
    end: number;
  }>;
}): Promise<void> {
  // Check if notifications are enabled in settings
  const notificationsEnabled = localStorage.getItem('agroafrica_notifications_enabled') === 'true';
  const weatherAlertsEnabled = localStorage.getItem('agroafrica_weather_alerts') !== 'false';

  if (!notificationsEnabled || !weatherAlertsEnabled) return;
  if (Notification.permission !== 'granted') return;

  const { current, alerts } = weatherData;
  const now = Date.now();

  // Don't spam notifications - minimum 1 hour between alerts of same type
  const minInterval = 60 * 60 * 1000; // 1 hour

  // Check for frost (temp below 2°C)
  if (current.temp < 2) {
    const lastFrostAlert = parseInt(localStorage.getItem('agroafrica_last_frost_alert') || '0');
    if (now - lastFrostAlert > minInterval) {
      await showWeatherAlert(
        'frost',
        `Temperature is ${current.temp.toFixed(1)}°C. Protect sensitive crops from frost damage.`,
        current.temp < 0 ? 'critical' : 'high'
      );
      localStorage.setItem('agroafrica_last_frost_alert', now.toString());
    }
  }

  // Check for extreme heat (temp above 35°C)
  if (current.temp > 35) {
    const lastHeatAlert = parseInt(localStorage.getItem('agroafrica_last_heat_alert') || '0');
    if (now - lastHeatAlert > minInterval) {
      await showWeatherAlert(
        'heat_wave',
        `Temperature is ${current.temp.toFixed(1)}°C. Increase irrigation and provide shade for livestock.`,
        current.temp > 40 ? 'critical' : 'high'
      );
      localStorage.setItem('agroafrica_last_heat_alert', now.toString());
    }
  }

  // Check for high winds (above 40 km/h)
  if (current.windSpeed > 40) {
    const lastWindAlert = parseInt(localStorage.getItem('agroafrica_last_wind_alert') || '0');
    if (now - lastWindAlert > minInterval) {
      await showWeatherAlert(
        'high_wind',
        `Wind speed is ${current.windSpeed.toFixed(0)} km/h. Avoid spraying and secure loose structures.`,
        current.windSpeed > 60 ? 'critical' : 'high'
      );
      localStorage.setItem('agroafrica_last_wind_alert', now.toString());
    }
  }

  // Check for storm conditions
  const weatherCondition = current.condition?.toLowerCase() || '';
  if (weatherCondition.includes('storm') || weatherCondition.includes('thunder')) {
    const lastStormAlert = parseInt(localStorage.getItem('agroafrica_last_storm_alert') || '0');
    if (now - lastStormAlert > minInterval) {
      await showWeatherAlert(
        'storm',
        `${current.condition || 'Storm conditions detected'}. Take shelter and protect equipment.`,
        'high'
      );
      localStorage.setItem('agroafrica_last_storm_alert', now.toString());
    }
  }

  // Check ideal spray window (low wind, no rain, moderate humidity)
  const isIdealSpray =
    current.windSpeed < 15 &&
    current.humidity > 40 &&
    current.humidity < 90 &&
    !weatherCondition.includes('rain') &&
    !weatherCondition.includes('storm');

  if (isIdealSpray) {
    const lastSprayAlert = parseInt(localStorage.getItem('agroafrica_last_spray_alert') || '0');
    // Only notify once per 4 hours for spray window
    if (now - lastSprayAlert > 4 * 60 * 60 * 1000) {
      await showWeatherAlert(
        'spray_window',
        `Good conditions for spraying: Wind ${current.windSpeed.toFixed(0)} km/h, Humidity ${current.humidity}%`,
        'low'
      );
      localStorage.setItem('agroafrica_last_spray_alert', now.toString());
    }
  }

  // Process API alerts if available
  if (alerts && alerts.length > 0) {
    for (const alert of alerts) {
      const alertKey = `agroafrica_alert_${alert.event.replace(/\s/g, '_')}`;
      const lastAlert = parseInt(localStorage.getItem(alertKey) || '0');

      if (now - lastAlert > minInterval) {
        await showNotification({
          title: `⚠️ ${alert.event}`,
          body: alert.description.substring(0, 200),
          tag: `api-alert-${alert.event}`,
          requireInteraction: true,
          data: {
            type: 'weather_api_alert',
            event: alert.event,
            start: alert.start,
            end: alert.end,
          },
        });
        localStorage.setItem(alertKey, now.toString());
      }
    }
  }
}

// Schedule periodic weather checks (call this on app load)
export function startWeatherNotificationService(): void {
  // Check weather every 30 minutes
  const checkInterval = 30 * 60 * 1000;

  // Store interval ID for cleanup
  const intervalId = setInterval(async () => {
    try {
      // Get cached weather data
      const cachedWeather = localStorage.getItem('weatherData');
      if (cachedWeather) {
        const weatherData = JSON.parse(cachedWeather);
        await checkWeatherAndNotify(weatherData);
      }
    } catch (error) {
      console.error('Error in weather notification check:', error);
    }
  }, checkInterval);

  // Store for cleanup
  (window as any).__weatherNotificationInterval = intervalId;
}

// Stop the weather notification service
export function stopWeatherNotificationService(): void {
  const intervalId = (window as any).__weatherNotificationInterval;
  if (intervalId) {
    clearInterval(intervalId);
    delete (window as any).__weatherNotificationInterval;
  }
}

// ==========================================
// Order Notifications
// ==========================================

// Show new order notification for sellers
export async function showNewOrderNotification(
  orderNumber: string,
  buyerName: string,
  productName: string,
  quantity: number,
  unit: string,
  totalPrice: number,
  currency: string
): Promise<boolean> {
  return showNotification({
    title: `🛒 New Order Received!`,
    body: `${buyerName} ordered ${quantity} ${unit} of ${productName} (${currency} ${totalPrice.toFixed(2)})`,
    tag: `order-${orderNumber}`,
    requireInteraction: true,
    data: {
      type: 'new_order',
      orderNumber,
      buyerName,
      productName,
      quantity,
      totalPrice,
    },
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  });
}

// Show order status update notification for buyers
export async function showOrderStatusNotification(
  orderNumber: string,
  status: string,
  productName: string
): Promise<boolean> {
  const statusConfig: Record<string, { title: string; emoji: string }> = {
    confirmed: { title: 'Order Confirmed', emoji: '✅' },
    processing: { title: 'Order Processing', emoji: '📦' },
    shipped: { title: 'Order Shipped', emoji: '🚚' },
    delivered: { title: 'Order Delivered', emoji: '🎉' },
    cancelled: { title: 'Order Cancelled', emoji: '❌' },
  };

  const config = statusConfig[status] || { title: `Order ${status}`, emoji: '📋' };

  return showNotification({
    title: `${config.emoji} ${config.title}`,
    body: `Your order ${orderNumber} for ${productName} has been ${status}`,
    tag: `order-status-${orderNumber}`,
    data: {
      type: 'order_status',
      orderNumber,
      status,
    },
  });
}

// ==========================================
// Morning Briefing Notification
// ==========================================

export interface MorningBriefingData {
  weather: {
    temp: number;
    condition: string;
    humidity: number;
    windSpeed: number;
    high?: number;
    low?: number;
  } | null;
  activities: Array<{
    title: string;
    activityType: string;
    time?: string;
  }>;
  tasks: Array<{
    title: string;
    priority: string;
  }>;
  date: Date;
}

// Format activities for notification body
function formatActivitiesForBriefing(activities: MorningBriefingData['activities']): string {
  if (activities.length === 0) return '';

  const activityLines = activities.slice(0, 3).map(a => {
    const time = a.time ? `${a.time.substring(0, 5)} - ` : '';
    return `• ${time}${a.title}`;
  });

  if (activities.length > 3) {
    activityLines.push(`  +${activities.length - 3} more`);
  }

  return activityLines.join('\n');
}

// Format tasks for notification body
function formatTasksForBriefing(tasks: MorningBriefingData['tasks']): string {
  if (tasks.length === 0) return '';

  const priorityEmoji: Record<string, string> = {
    urgent: '🚨',
    high: '⚠️',
    medium: '📋',
    low: '📝',
  };

  const taskLines = tasks.slice(0, 3).map(t => {
    const emoji = priorityEmoji[t.priority] || '📋';
    return `${emoji} ${t.title}`;
  });

  if (tasks.length > 3) {
    taskLines.push(`  +${tasks.length - 3} more`);
  }

  return taskLines.join('\n');
}

// Show morning briefing notification
export async function showMorningBriefing(data: MorningBriefingData): Promise<boolean> {
  // Check if morning briefing is enabled
  const briefingEnabled = localStorage.getItem('agroafrica_morning_briefing') !== 'false';
  if (!briefingEnabled) return false;

  if (Notification.permission !== 'granted') return false;

  const dateStr = data.date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  // Build notification body
  const bodyParts: string[] = [];

  // Weather section
  if (data.weather) {
    const weatherEmoji = getWeatherEmoji(data.weather.condition);
    const tempRange = data.weather.high && data.weather.low
      ? ` (${Math.round(data.weather.low)}°-${Math.round(data.weather.high)}°)`
      : '';
    bodyParts.push(`${weatherEmoji} ${Math.round(data.weather.temp)}°C${tempRange} - ${data.weather.condition}`);

    // Add spray window info
    if (data.weather.windSpeed < 15 && data.weather.humidity >= 40 && data.weather.humidity <= 90) {
      bodyParts.push('✅ Good conditions for spraying');
    }
  }

  // Activities section
  if (data.activities.length > 0) {
    bodyParts.push('');
    bodyParts.push(`📅 ${data.activities.length} scheduled:`);
    bodyParts.push(formatActivitiesForBriefing(data.activities));
  }

  // Tasks section
  if (data.tasks.length > 0) {
    bodyParts.push('');
    bodyParts.push(`📋 ${data.tasks.length} tasks:`);
    bodyParts.push(formatTasksForBriefing(data.tasks));
  }

  // If nothing to show, show a simple greeting
  if (bodyParts.length === 0 || (data.activities.length === 0 && data.tasks.length === 0 && !data.weather)) {
    bodyParts.push('No activities or tasks scheduled for today.');
    bodyParts.push('Have a great day on the farm! 🌾');
  }

  return showNotification({
    title: `☀️ Good Morning! ${dateStr}`,
    body: bodyParts.join('\n'),
    tag: 'morning-briefing',
    requireInteraction: false,
    data: {
      type: 'morning_briefing',
      date: data.date.toISOString(),
      activityCount: data.activities.length,
      taskCount: data.tasks.length,
    },
  });
}

// Helper to get weather emoji
function getWeatherEmoji(condition: string): string {
  const lower = condition.toLowerCase();
  if (lower.includes('clear') || lower.includes('sunny')) return '☀️';
  if (lower.includes('cloud')) return '☁️';
  if (lower.includes('rain')) return '🌧️';
  if (lower.includes('storm') || lower.includes('thunder')) return '⛈️';
  if (lower.includes('snow')) return '❄️';
  if (lower.includes('fog') || lower.includes('mist')) return '🌫️';
  if (lower.includes('wind')) return '💨';
  return '🌤️';
}

// Check if it's time for morning briefing (around 7 AM)
function shouldShowMorningBriefing(): boolean {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Check if it's between 6:55 AM and 7:10 AM
  if (hour === 6 && minute >= 55) return true;
  if (hour === 7 && minute <= 10) return true;

  return false;
}

// Check if briefing was already shown today
function wasBriefingShownToday(): boolean {
  const lastBriefing = localStorage.getItem('agroafrica_last_morning_briefing');
  if (!lastBriefing) return false;

  const lastDate = new Date(parseInt(lastBriefing));
  const today = new Date();

  return (
    lastDate.getFullYear() === today.getFullYear() &&
    lastDate.getMonth() === today.getMonth() &&
    lastDate.getDate() === today.getDate()
  );
}

// Mark briefing as shown for today
function markBriefingShown(): void {
  localStorage.setItem('agroafrica_last_morning_briefing', Date.now().toString());
}

// Fetch today's activities from Supabase
async function fetchTodayActivities(userId: string): Promise<MorningBriefingData['activities']> {
  try {
    const { supabase } = await import('../lib/supabase');
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase.rpc('get_calendar_activities', {
      p_user_id: userId,
      p_start_date: today,
      p_end_date: today,
      p_activity_types: null,
    });

    if (error) {
      console.error('[MorningBriefing] Error fetching activities:', error);
      return [];
    }

    return (data || []).map((activity: any) => ({
      title: activity.title,
      activityType: activity.activity_type,
      time: activity.activity_time,
    }));
  } catch (error) {
    console.error('[MorningBriefing] Error:', error);
    return [];
  }
}

// Fetch today's tasks
async function fetchTodayTasks(userId: string): Promise<MorningBriefingData['tasks']> {
  try {
    const { supabase } = await import('../lib/supabase');
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('tasks')
      .select('title, priority')
      .eq('user_id', userId)
      .eq('due_date', today)
      .neq('status', 'completed')
      .order('priority', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[MorningBriefing] Error fetching tasks:', error);
      return [];
    }

    return (data || []).map((task: any) => ({
      title: task.title,
      priority: task.priority || 'medium',
    }));
  } catch (error) {
    console.error('[MorningBriefing] Error:', error);
    return [];
  }
}

// Main function to check and send morning briefing
export async function checkAndSendMorningBriefing(userId: string): Promise<void> {
  // Check if enabled
  const briefingEnabled = localStorage.getItem('agroafrica_morning_briefing') !== 'false';
  const notificationsEnabled = localStorage.getItem('agroafrica_notifications_enabled') === 'true';

  if (!briefingEnabled || !notificationsEnabled) return;
  if (Notification.permission !== 'granted') return;

  // Check if it's time and not already shown
  if (!shouldShowMorningBriefing()) return;
  if (wasBriefingShownToday()) return;

  try {
    // Fetch weather data from cache
    const cachedWeather = localStorage.getItem('weatherData');
    let weather: MorningBriefingData['weather'] = null;

    if (cachedWeather) {
      const weatherData = JSON.parse(cachedWeather);
      weather = {
        temp: weatherData.current?.temp || 0,
        condition: weatherData.current?.condition || 'Unknown',
        humidity: weatherData.current?.humidity || 0,
        windSpeed: weatherData.current?.windSpeed || 0,
        high: weatherData.forecast?.[0]?.high,
        low: weatherData.forecast?.[0]?.low,
      };
    }

    // Fetch today's activities and tasks
    const [activities, tasks] = await Promise.all([
      fetchTodayActivities(userId),
      fetchTodayTasks(userId),
    ]);

    // Send the briefing
    const sent = await showMorningBriefing({
      weather,
      activities,
      tasks,
      date: new Date(),
    });

    if (sent) {
      markBriefingShown();
      console.log('[MorningBriefing] Sent successfully');
    }
  } catch (error) {
    console.error('[MorningBriefing] Error sending briefing:', error);
  }
}

// Start the morning briefing service
let morningBriefingIntervalId: ReturnType<typeof setInterval> | null = null;

export function startMorningBriefingService(userId: string): void {
  if (morningBriefingIntervalId) {
    clearInterval(morningBriefingIntervalId);
  }

  // Check immediately on start
  checkAndSendMorningBriefing(userId);

  // Check every 5 minutes
  morningBriefingIntervalId = setInterval(() => {
    checkAndSendMorningBriefing(userId);
  }, 5 * 60 * 1000);

  // Store for cleanup
  (window as any).__morningBriefingInterval = morningBriefingIntervalId;
}

// Stop the morning briefing service
export function stopMorningBriefingService(): void {
  if (morningBriefingIntervalId) {
    clearInterval(morningBriefingIntervalId);
    morningBriefingIntervalId = null;
  }

  const storedId = (window as any).__morningBriefingInterval;
  if (storedId) {
    clearInterval(storedId);
    delete (window as any).__morningBriefingInterval;
  }
}

// Manual trigger for testing
export async function triggerMorningBriefing(userId: string): Promise<boolean> {
  try {
    const cachedWeather = localStorage.getItem('weatherData');
    let weather: MorningBriefingData['weather'] = null;

    if (cachedWeather) {
      const weatherData = JSON.parse(cachedWeather);
      weather = {
        temp: weatherData.current?.temp || 0,
        condition: weatherData.current?.condition || 'Unknown',
        humidity: weatherData.current?.humidity || 0,
        windSpeed: weatherData.current?.windSpeed || 0,
        high: weatherData.forecast?.[0]?.high,
        low: weatherData.forecast?.[0]?.low,
      };
    }

    const [activities, tasks] = await Promise.all([
      fetchTodayActivities(userId),
      fetchTodayTasks(userId),
    ]);

    return showMorningBriefing({
      weather,
      activities,
      tasks,
      date: new Date(),
    });
  } catch (error) {
    console.error('[MorningBriefing] Error triggering:', error);
    return false;
  }
}
