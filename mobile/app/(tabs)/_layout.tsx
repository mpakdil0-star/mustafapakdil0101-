import { Tabs } from 'expo-router';
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors as staticColors } from '../../constants/colors';
import { useAppColors } from '../../hooks/useAppColors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppSelector } from '../../hooks/redux';
import api from '../../services/api';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user, guestRole, isAuthenticated } = useAppSelector((state) => state.auth);
  const colors = useAppColors();
  const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';
  const isGuest = !user;

  const { notifications, unreadCount } = useAppSelector((state) => state.notifications);

  // Separate state for unread messages (from conversations, not notifications)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  // Initial fetch for unread messages (to sync with server on mount)
  const dispatch = require('../../hooks/redux').useAppDispatch();
  const { fetchNotifications } = require('../../store/slices/notificationSlice');
  const { messageService } = require('../../services/messageService');

  // Fetch unread messages count from conversations
  useEffect(() => {
    const fetchUnreadMessages = async () => {
      if (!isAuthenticated) return;
      try {
        const conversations = await messageService.getConversations();
        // Sum up unreadCount from all conversations
        const totalUnread = conversations.reduce((sum: number, conv: any) => sum + (conv.unreadCount || 0), 0);
        setUnreadMessagesCount(totalUnread);
      } catch (error) {
        console.log('Could not fetch unread messages count:', error);
      }
    };

    fetchUnreadMessages();
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
    }
  }, [isAuthenticated, dispatch]);

  const renderHomeIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? "home" : "home-outline"}
      size={22}
      color={focused ? colors.primary : colors.textLight}
    />
  );

  const renderJobsIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? "briefcase" : "briefcase-outline"}
      size={22}
      color={focused ? colors.primary : colors.textLight}
    />
  );

  const renderMessagesIcon = ({ focused }: { focused: boolean }) => (
    <View style={styles.iconContainer}>
      <Ionicons
        name={focused ? "chatbubbles" : "chatbubbles-outline"}
        size={22}
        color={focused ? colors.primary : colors.textLight}
      />
      {unreadMessagesCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadMessagesCount > 9 ? '9+' : unreadMessagesCount}
          </Text>
        </View>
      )}
    </View>
  );

  const renderProfileIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? "person" : "person-outline"}
      size={22}
      color={focused ? colors.primary : colors.textLight}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: staticColors.white,
          borderTopColor: staticColors.borderLight,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom + 8,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 20,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bold,
          fontSize: 10,
        },
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: staticColors.white,
        headerTitleStyle: {
          fontFamily: fonts.bold,
          fontSize: 18,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarLabel: 'Ana Sayfa',
          tabBarIcon: renderHomeIcon,
        }}
      />
      <Tabs.Screen
        name="jobs"
        options={{
          title: isElectrician ? 'İş İlanları' : 'İlanlarım',
          tabBarLabel: isElectrician ? 'İşler' : 'İlanlarım',
          tabBarIcon: renderJobsIcon,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Mesajlar',
          tabBarLabel: 'Mesajlar',
          tabBarIcon: renderMessagesIcon,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarLabel: 'Profil',
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: staticColors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 10,
    color: staticColors.white,
  },
});
