import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { notificationService, Notification } from '../../services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
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
      state.notifications.unshift(action.payload);
      if (!action.payload.isRead) {
        state.unreadCount += 1;
      }
    },
    incrementUnreadCount: (state) => {
      state.unreadCount += 1;
    },
    markTypeAsRead: (state, action: { payload: { type: string | string[]; relatedId?: string } }) => {
      const { type, relatedId } = action.payload;
      const types = Array.isArray(type) ? type : [type];

      state.notifications.forEach(n => {
        if (types.includes(n.type) && (!relatedId || n.relatedId === relatedId) && !n.isRead) {
          n.isRead = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
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
          }
        });
      });
  },
});

export const { clearError, addNotification, incrementUnreadCount, markTypeAsRead } = notificationSlice.actions;
export default notificationSlice.reducer;


