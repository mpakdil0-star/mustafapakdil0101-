'use client';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

export const isSupabaseConfigured = () => Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()
);

export const getSupabaseBrowserClient = () => {
  if (browserClient) return browserClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !key) {
    throw new Error('WEB_CONFIGURATION_MISSING');
  }

  browserClient = createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return browserClient;
};

export const ensureWebSession = async () => {
  const client = getSupabaseBrowserClient();
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session) return sessionData.session;

  const { data, error } = await client.auth.signInAnonymously({
    options: {
      data: {
        user_type: 'CITIZEN',
        full_name: 'Web ziyaretçisi',
        source: 'web',
      },
    },
  });
  if (error || !data.session) throw error || new Error('ANONYMOUS_SESSION_FAILED');
  return data.session;
};
