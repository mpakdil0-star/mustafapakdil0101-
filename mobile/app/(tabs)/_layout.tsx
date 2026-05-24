import { Tabs, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors as staticColors } from '../../constants/colors';
import { useAppColors } from '../../hooks/useAppColors';
import { fonts } from '../../constants/typography';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { fetchNotifications, fetchUnreadCount } from '../../store/slices/notificationSlice';

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useAppColors();
  const { user, guestRole, isAuthenticated } = useAppSelector((state: any) => state.auth);
  const { unreadMessageCount } = useAppSelector((state: any) => state.notifications);
  const isElectrician = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';

  // Pulse animation for ACİL button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  const TAB_HEIGHT = 60 + insets.bottom;

  const getIcon = (routeName: string, focused: boolean): keyof typeof Ionicons.glyphMap => {
    switch (routeName) {
      case 'index': return focused ? 'home' : 'home-outline';
      case 'jobs': return focused ? 'briefcase' : 'briefcase-outline';
      case 'channels': return focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
      case 'messages': return focused ? 'chatbubbles' : 'chatbubbles-outline';
      case 'profile': return focused ? 'person' : 'person-outline';
      default: return 'home-outline';
    }
  };

  const getLabel = (routeName: string) => {
    const isElectr = user?.userType === 'ELECTRICIAN' || guestRole === 'ELECTRICIAN';
    switch (routeName) {
      case 'index': return 'Ana Sayfa';
      case 'jobs': return isElectr ? 'İşler' : 'İlanlarım';
      case 'channels': return 'Kanallar';
      case 'messages': return 'Mesajlar';
      case 'profile': return 'Profil';
      default: return '';
    }
  };

  // Split tabs dynamically by name to keep them in their proper visual locations
  const leftTabs = state.routes.filter((r: any) => r.name === 'index' || r.name === 'jobs');
  const rightTabs = state.routes.filter((r: any) => r.name === 'messages' || r.name === 'profile');
  const isChannelFocused = state.routes[state.index]?.name === 'channels';

  const renderTab = (route: any) => {
    const routeGlobalIndex = state.routes.findIndex((r: any) => r.name === route.name);
    const focused = state.index === routeGlobalIndex;
    const icon = getIcon(route.name, focused);
    const label = getLabel(route.name);
    const color = focused ? colors.primary : '#9CA3AF';
    const showBadge = route.name === 'messages' && unreadMessageCount > 0;

    return (
      <TouchableOpacity
        key={route.key}
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(route.name)}
      >
        <View style={styles.tabIconWrapper}>
          <Ionicons name={icon} size={22} color={color} />
          {showBadge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, { color }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.tabBarContainer, { paddingBottom: insets.bottom, height: TAB_HEIGHT }]}>
      {/* Left tabs */}
      <View style={styles.tabSection}>
        {leftTabs.map((route: any) => renderTab(route))}
      </View>

      {/* Center Button (Conditional) */}
      <View style={styles.centerButtonWrapper}>
        {isElectrician ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                navigation.navigate('channels');
              }}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryDark || '#1D4ED8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[styles.centerButton, { shadowColor: colors.primary }]}
              >
                <Ionicons name="chatbubble-ellipses" size={26} color="#FFF" />
                <Text style={styles.centerButtonLabel}>KANALLAR</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                if (!isAuthenticated) {
                  router.push('/(auth)/login');
                } else {
                  router.push('/jobs/quick-create');
                }
              }}
            >
              <LinearGradient
                colors={['#FF4D4D', '#CC1A1A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.centerButton}
              >
                <Ionicons name="flash" size={26} color="#FFF" />
                <Text style={styles.centerButtonLabel}>ACİL</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>

      {/* Right tabs */}
      <View style={styles.tabSection}>
        {rightTabs.map((route: any) => renderTab(route))}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const colors = useAppColors();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchNotifications());
      dispatch(fetchUnreadCount());
    }
  }, [isAuthenticated, dispatch]);

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana Sayfa' }} />
      <Tabs.Screen name="jobs" options={{ title: 'İlanlar' }} />
      <Tabs.Screen name="channels" options={{ title: 'Usta Kanalları' }} />
      <Tabs.Screen name="messages" options={{ title: 'Mesajlar' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // Premium shadow
    shadowColor: '#6D28D9',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 24,
    paddingHorizontal: 4,
  },
  tabSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabIconWrapper: {
    position: 'relative',
  },
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 10,
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -9,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#FFF',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
    paddingHorizontal: 6,
  },
  centerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: '#FFF',
    gap: 1,
  },
  centerButtonLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    color: '#FFF',
    letterSpacing: 0.5,
    marginTop: -1,
  },
});
