import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/**
 * Schedule a local notification reminder for a calendar event.
 * Returns the notification identifier for future cancellation.
 */
export const scheduleReminder = async (
  title: string,
  body: string,
  triggerDate: Date,
): Promise<string | null> => {
  try {
    // Don't schedule if the date is in the past
    if (triggerDate.getTime() <= Date.now()) {
      console.log('[Reminder] Skipping past date:', triggerDate);
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '📅 ' + title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        data: { type: 'calendar_reminder' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });

    console.log('[Reminder] Scheduled notification:', notificationId, 'at', triggerDate);
    return notificationId;
  } catch (error) {
    console.error('[Reminder] Failed to schedule:', error);
    return null;
  }
};

/**
 * Cancel a previously scheduled notification by its identifier.
 */
export const cancelReminder = async (notificationId: string): Promise<void> => {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    console.log('[Reminder] Cancelled notification:', notificationId);
  } catch (error) {
    console.error('[Reminder] Failed to cancel:', error);
  }
};

/**
 * Cancel all scheduled calendar reminders.
 */
export const cancelAllReminders = async (): Promise<void> => {
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const calendarReminders = scheduled.filter(
      (n) => n.content.data?.type === 'calendar_reminder'
    );
    for (const reminder of calendarReminders) {
      await Notifications.cancelScheduledNotificationAsync(reminder.identifier);
    }
    console.log(`[Reminder] Cancelled ${calendarReminders.length} calendar reminders`);
  } catch (error) {
    console.error('[Reminder] Failed to cancel all:', error);
  }
};
