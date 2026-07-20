import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const configuredUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const configuredKey = (
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
)?.trim();

export const isSupabaseConfigured = Boolean(configuredUrl && configuredKey);

// Keep the app bootable before environment values are supplied. Every service
// operation calls assertSupabaseConfigured before making a request.
const supabaseUrl = configuredUrl || 'https://configuration-required.supabase.co';
const supabaseKey = configuredKey || 'configuration-required';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: processLock,
  },
});

export const assertSupabaseConfigured = () => {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Supabase yapılandırması eksik. EXPO_PUBLIC_SUPABASE_URL ve '
      + 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY değerlerini mobile/.env dosyasına ekleyin.'
    );
  }
};

let autoRefreshListenerRegistered = false;

export const registerSupabaseAutoRefresh = () => {
  if (Platform.OS === 'web' || autoRefreshListenerRegistered) return;

  autoRefreshListenerRegistered = true;
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
};

registerSupabaseAutoRefresh();
