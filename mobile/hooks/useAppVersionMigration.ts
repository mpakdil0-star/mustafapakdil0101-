import { useEffect } from 'react';
import Constants from 'expo-constants';

export const useAppVersionMigration = () => {
  useEffect(() => {
    const runMigration = async () => {
      try {
        const CURRENT_APP_VERSION = Constants.expoConfig?.version || '1.6.23';
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const lastRunVersion = await AsyncStorage.getItem('last_run_app_version');

        if (lastRunVersion !== CURRENT_APP_VERSION) {
          console.log(`🧹 [Migration] Upgrading app version from ${lastRunVersion || 'none'} to ${CURRENT_APP_VERSION}...`);

          // 1. Clear secure store tokens to prevent stale/conflicting auth sessions
          const SecureStore = await import('expo-secure-store');
          await Promise.all([
            'auth_token',
            'refresh_token',
            'admin_token_fallback',
            'admin_refresh_fallback',
          ].map((key) => SecureStore.deleteItemAsync(key)));

          // 2. Clear old marketplace cache key
          await AsyncStorage.removeItem('marketplace_products_v1');

          // 3. Save new run version. Supabase session storage is deliberately
          // preserved; only legacy Express JWT tokens are removed above.
          await AsyncStorage.setItem('last_run_app_version', CURRENT_APP_VERSION);

          console.log('✅ [Migration] Clean slate migration completed successfully.');
        }
      } catch (err) {
        console.error('❌ [Migration] Error during version migration:', err);
      }
    };

    runMigration();
  }, []);
};
