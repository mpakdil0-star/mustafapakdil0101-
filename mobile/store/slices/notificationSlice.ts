import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService, Notification } from '../../services/notificationService';

const MESSAGE_TYPES = ['new_message', 'MESSAGE_RECEIVED'];

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  unreadMessageCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  unreadMessageCount: 0,
  isLoading: false,
  error: null,
};

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async () => {
    try {
      return await notificationService.getUnreadCount();
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }
);

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchNotifications',
  async () => {
    return await notificationService.getNotifications();
  }
);

export const markNotificationAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string) => {
    await notificationService.markAsRead(notificationId);
    return notificationId;
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async () => {
    await notificationService.markAllAsRead();
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/deleteNotification',
  async (notificationId: string) => {
    await notificationService.deleteNotification(notificationId);
    return notificationId;
  }
);

export const markRelatedNotificationsAsRead = createAsyncThunk(
  'notifications/markRelatedAsRead',
  async ({ type, relatedId }: { type: string; relatedId: string }) => {
    await notificationService.markRelatedAsRead(type, relatedId);
    return { type, relatedId };
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    addNotification: (state, action) => {
      const notification = { ...action.payload };
      const isMessage = MESSAGE_TYPES.includes(notification.type);
      // Map conversationId to relatedId for consistency in clearing
      if (!notification.relatedId && notification.conversationId) {
        notification.relatedId = notification.conversationId;
      }

      // Avoid duplicates
      const existingIndex = state.notifications.findIndex(n => n.id === notification.id);
      if (existingIndex !== -1) {
        const wasUnread = !state.notifications[existingIndex].isRead;
        const isNowRead = notification.isRead;
        // If it was unread and now it's read, decrement
        if (wasUnread && isNowRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          if (isMessage) state.unreadMessageCount = Math.max(0, state.unreadMessageCount - 1);
        }
        // If it was read and now it's unread, increment
        else if (!wasUnread && !isNowRead) {
          // was read before, skip
        } else if (state.notifications[existingIndex].isRead && !notification.isRead) {
          state.unreadCount += 1;
          if (isMessage) state.unreadMessageCount += 1;
        }
        state.notifications[existingIndex] = notification;
        return;
      }

      state.notifications.unshift(notification);
      if (!notification.isRead) {
        state.unreadCount += 1;
        if (isMessage) state.unreadMessageCount += 1;
      }
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    incrementUnreadMessageCount: (state) => {
      state.unreadMessageCount += 1;
    },
    resetUnreadMessageCount: (state) => {
      state.unreadMessageCount = 0;
    },
    markTypeAsRead: (state, action: { payload: { type: string | string[]; relatedId?: string } }) => {
      const { type, relatedId } = action.payload;
      const types = Array.isArray(type) ? type : [type];

      state.notifications.forEach(n => {
        // Check both relatedId and conversationId (legacy or specific socket payload)
        const matchesRelatedId = !relatedId || n.relatedId === relatedId || (n as any).conversationId === relatedId;
        if (types.includes(n.type) && matchesRelatedId && !n.isRead) {
          n.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
          if (MESSAGE_TYPES.includes(n.type)) {
            state.unreadMessageCount = Math.max(0, state.unreadMessageCount - 1);
          }
        }
      });
    },
  },
  extraReducers: (builder) => {
    // Fetch Notifications
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload;
        state.unreadCount = action.payload.filter((n: Notification) => !n.isRead).length;
        state.unreadMessageCount = action.payload.filter((n: Notification) => !n.isRead && MESSAGE_TYPES.includes(n.type)).length;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      });

    // Mark as Read
    builder
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find((n) => n.id === action.payload);
        if (notification && !notification.isRead) {
          if (MESSAGE_TYPES.includes(notification.type)) {
            state.unreadMessageCount = Math.max(0, state.unreadMessageCount - 1);
          }
          notification.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      });

    // Mark All as Read
    builder
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications.forEach((notification) => {
          notification.isRead = true;
        });
        state.unreadCount = 0;
        state.unreadMessageCount = 0;
      });

    // Delete Notification
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const notification = state.notifications.find((n) => n.id === action.payload);
        if (notification && !notification.isRead) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter((n) => n.id !== action.payload);
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markRelatedNotificationsAsRead.fulfilled, (state, action) => {
        const { type, relatedId } = action.payload;
        // Also clear locally just in case it wasn't cleared by the synchronous reducer
        state.notifications.forEach(n => {
          if (n.type === type && (!relatedId || n.relatedId === relatedId) && !n.isRead) {
            n.isRead = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
            if (MESSAGE_TYPES.includes(n.type)) {
              state.unreadMessageCount = Math.max(0, state.unreadMessageCount - 1);
            }
          }
        });
      });
  },
});

export const { clearError, addNotification, incrementUnreadCount, incrementUnreadMessageCount, resetUnreadMessageCount, markTypeAsRead } = notificationSlice.actions;
export default notificationSlice.reducer;


