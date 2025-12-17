import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from '../hooks/redux';
import { getMe } from '../store/slices/authSlice';
import { colors } from '../constants/colors';

export default function Index() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Wait for router to be ready, then check auth
    const timer = setTimeout(() => {
      const checkAuth = async () => {
        try {
          // Check if user is authenticated
          await dispatch(getMe()).unwrap();
          // Authenticated - go to main app
          router.replace('/(tabs)');
        } catch {
          // Not authenticated - show login screen
          router.replace('/(auth)/login');
        } finally {
          setIsChecking(false);
        }
      };

      checkAuth();
    }, 200); // Small delay to ensure router is mounted

    return () => clearTimeout(timer);
  }, [router, dispatch]);

  // Show loading screen while checking authentication
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
