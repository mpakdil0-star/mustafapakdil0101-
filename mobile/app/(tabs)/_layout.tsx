import { Tabs } from 'expo-router';
// import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { fonts } from '../../constants/typography';
import { useAppSelector } from '../../hooks/redux';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((state) => state.auth);
  const isElectrician = user?.userType === 'ELECTRICIAN';

  const renderHomeIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? "home" : "home-outline"}
      size={22}
      color={focused ? colors.primary : colors.textSecondary}
    />
  );

  const renderJobsIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? "briefcase" : "briefcase-outline"}
      size={22}
      color={focused ? colors.secondary : colors.textSecondary}
    />
  );

  const renderMessagesIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? "chatbubbles" : "chatbubbles-outline"}
      size={22}
      color={focused ? colors.info : colors.textSecondary}
    />
  );

  const renderProfileIcon = ({ focused }: { focused: boolean }) => (
    <Ionicons
      name={focused ? "person" : "person-outline"}
      size={22}
      color={focused ? colors.success : colors.textSecondary}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 0.5,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom + 2,
          paddingTop: 6,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.medium,
          fontSize: 11,
          marginTop: 2,
        },
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.white,
        headerTitleStyle: {
          fontFamily: fonts.semiBold,
          fontSize: 17,
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
