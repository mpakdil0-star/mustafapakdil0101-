import React, { useEffect, useState, useCallback } from 'react';
import { Slot, useRouter, useSegments, SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider, useSelector } from 'react-redux';
import { store } from '../store/store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { InteractionManager, View, Text } from 'react-native';
import { RootState } from '../store/store';
import { useFonts } from 'expo-font';
import { fontFiles } from '../constants/typography';

// Prevent splash from auto-hiding
SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  useEffect(() => {
    const interaction = InteractionManager.runAfterInteractions(() => {
      setIsNavigationReady(true);
    });

    return () => interaction.cancel();
  }, []);

  useEffect(() => {
    if (!isNavigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (segments.length === 0) return;

    if (!isAuthenticated && !inAuthGroup) {
      try {
        router.replace('/(auth)/login');
      } catch (error) {
        console.warn('Navigation error, will retry:', error);
      }
    } else if (isAuthenticated && inAuthGroup) {
      try {
        router.replace('/(tabs)');
      } catch (error) {
        console.warn('Navigation error, will retry:', error);
      }
    }
  }, [isAuthenticated, segments, isNavigationReady, router]);

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontFiles);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Still loading fonts
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Provider store={store}>
          <StatusBar style="light" />
          <RootLayoutNav />
        </Provider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
