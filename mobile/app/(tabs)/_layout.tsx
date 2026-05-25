import { Tabs, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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

  // Pulse animation for ACİL/FORUM button
  const pulseAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

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
      case 'index': return 'Anasayfa';
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

  const renderTab = (route: any) => {
    const routeGlobalIndex = state.routes.findIndex((r: any) => r.name === route.name);
    const focused = state.index === routeGlobalIndex;
    const icon = getIcon(route.name, focused);
    const label = getLabel(route.name);
    const activeColor = colors.primary;
    const inactiveColor = isElectrician ? '#64748B' : '#94A3B8';
    const color = focused ? activeColor : inactiveColor;
    const showBadge = route.name === 'messages' && unreadMessageCount > 0;

    return (
      <TouchableOpacity
        key={route.key}
        style={styles.tabItem}
        activeOpacity={0.7}
        onPress={() => navigation.navigate(route.name)}
      >
        <View style={[
          styles.tabContentWrapper,
          focused && {
            backgroundColor: isElectrician ? 'rgba(249, 115, 22, 0.08)' : 'rgba(13, 148, 136, 0.08)',
          }
        ]}>
          <View style={styles.tabIconWrapper}>
            <Ionicons name={icon} size={21} color={color} />
            {showBadge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>{label}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const containerBottom = insets.bottom > 0 ? insets.bottom + 4 : 10;
  const TAB_HEIGHT = 68;
  const isLight = colors.background === '#FFFFFF' || colors.background === '#F8FAFC';

  return (
    <View style={[
      styles.tabBarContainer,
      {
        bottom: containerBottom,
        height: TAB_HEIGHT,
        backgroundColor: isLight ? 'rgba(255, 255, 255, 0.95)' : 'rgba(30, 41, 59, 0.95)',
        borderColor: isLight 
          ? (isElectrician ? 'rgba(249, 115, 22, 0.12)' : 'rgba(13, 148, 136, 0.12)') 
          : 'rgba(255, 255, 255, 0.08)',
        shadowColor: colors.primary,
        shadowOpacity: isLight ? 0.08 : 0.35,
        shadowRadius: 16,
      }
    ]}>
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
                colors={[colors.primary, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.centerButton,
                  {
                    borderColor: isLight ? '#FFFFFF' : '#1E293B',
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.5,
                    shadowRadius: 12,
                    elevation: 10
                  }
                ]}
              >
                <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
                <Text style={styles.centerButtonLabel}>FORUM</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        ) : (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                router.push('/jobs/quick-create');
              }}
            >
              <LinearGradient
                colors={['#F43F5E', '#BE123C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                  styles.centerButton,
                  {
                    borderColor: '#FFF',
                    shadowColor: '#F43F5E',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.45,
                    shadowRadius: 12,
                    elevation: 10
                  }
                ]}
              >
                <Ionicons name="flash" size={24} color="#FFF" />
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
      <Tabs.Screen name="index" options={{ title: 'Anasayfa' }} />
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
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 24,
    borderWidth: 1.5,
    elevation: 8,
    paddingHorizontal: 8,
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 8 },
  },
  tabSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabContentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    minWidth: 56,
    gap: 1,
  },
  tabIconWrapper: {
    position: 'relative',
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontFamily: fonts.bold,
    fontSize: 9,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#F43F5E',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  badgeText: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: '#FFF',
  },
  centerButtonWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    paddingHorizontal: 4,
  },
  centerButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    gap: 0.5,
  },
  centerButtonLabel: {
    fontFamily: fonts.bold,
    fontSize: 8,
    color: '#FFF',
    letterSpacing: 0.5,
  },
});
