import { config } from '../config/env';

export type SupabaseAuthUser = {
  id: string;
  email: string;
  userType: string;
  isImpersonated?: boolean;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

type SupabaseUserResponse = {
  id: string;
  email?: string | null;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
};

const getSupabaseAuthConfig = () => {
  const supabaseUrl = config.supabaseUrl;
  const supabaseKey = config.supabasePublishableKey;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase auth config is missing. Set SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.');
  }

  return { supabaseUrl, supabaseKey };
};

const resolveUserType = (user: SupabaseUserResponse): string => {
  const meta =
    (user.user_metadata as Record<string, any> | undefined) ||
    (user.app_metadata as Record<string, any> | undefined) ||
    {};

  const raw =
    meta.user_type ||
    meta.userType ||
    meta.role ||
    meta.account_type ||
    meta.type;

  const normalized = typeof raw === 'string' ? raw.toUpperCase() : '';

  if (normalized === 'ADMIN' || normalized === 'ELECTRICIAN' || normalized === 'CITIZEN') {
    return normalized;
  }

  return 'CITIZEN';
};

export const validateSupabaseAccessToken = async (accessToken: string): Promise<SupabaseAuthUser> => {
  const { supabaseUrl, supabaseKey } = getSupabaseAuthConfig();

  const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: supabaseKey,
    },
  });

  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? 'Invalid or expired Supabase session'
      : `Supabase auth validation failed with status ${response.status}`;
    throw new Error(message);
  }

  const user = (await response.json()) as SupabaseUserResponse;

  if (!user?.id) {
    throw new Error('Supabase auth response did not include a user id');
  }

  return {
    id: user.id,
    email: user.email || '',
    userType: resolveUserType(user),
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  };
};
