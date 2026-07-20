import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { assertSupabaseConfigured, supabase } from './supabase';

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  userType: 'CITIZEN' | 'ELECTRICIAN';
  location?: unknown;
  serviceCategory?: string;
  acceptedLegalVersion?: string;
  marketingAllowed?: boolean;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
  pendingVerification?: boolean;
  currentLegalVersion?: string | null;
}

const PROFILE_SELECT = `
  *,
  electrician_profiles (*)
`;

const mapProfile = (row: any) => {
  if (!row) throw new Error('Kullanıcı profili bulunamadı.');
  const electrician = Array.isArray(row.electrician_profiles)
    ? row.electrician_profiles[0]
    : row.electrician_profiles;

  return {
    id: row.id,
    email: row.email,
    phone: row.phone ?? undefined,
    fullName: row.full_name,
    userType: row.user_type,
    city: row.city ?? undefined,
    profileImageUrl: row.profile_image_url ?? undefined,
    isVerified: Boolean(row.is_verified),
    isClaimed: Boolean(row.is_claimed),
    acceptedLegalVersion: row.accepted_legal_version ?? undefined,
    marketingAllowed: Boolean(row.marketing_allowed),
    notificationSettings: row.notification_settings,
    electricianProfile: electrician ? {
      id: electrician.id,
      companyName: electrician.company_name,
      bio: electrician.bio,
      experienceYears: electrician.experience_years,
      specialties: electrician.specialties || [],
      creditBalance: Number(electrician.credit_balance || 0),
      isAvailable: electrician.is_available,
      serviceCategory: electrician.service_category,
      verificationStatus: electrician.verification_status,
      licenseVerified: electrician.license_verified,
      ratingAverage: Number(electrician.rating_average || 0),
      totalReviews: electrician.total_reviews || 0,
    } : undefined,
  };
};

const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error(
      error.code === 'PGRST116'
        ? 'Supabase kullanıcı profili bulunamadı. Veri migrasyonu veya profil trigger’ı kontrol edilmeli.'
        : error.message
    );
  }
  return mapProfile(data);
};

const buildAuthResponse = async (session: any, fallbackUser?: any): Promise<AuthResponse> => {
  const authUser = session?.user || fallbackUser;
  if (!authUser) throw new Error('Oturum kullanıcı bilgisi alınamadı.');

  const profile = session ? await getProfile(authUser.id) : {
    id: authUser.id,
    email: authUser.email,
    fullName: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Kullanıcı',
    userType: authUser.user_metadata?.user_type || 'CITIZEN',
    isVerified: false,
  };

  return {
    user: profile,
    accessToken: session?.access_token || '',
    refreshToken: session?.refresh_token || '',
    pendingVerification: !session,
  };
};

const getFileExtension = (uri: string, mimeType?: string) => {
  const uriExtension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (uriExtension && ['jpg', 'jpeg', 'png', 'webp'].includes(uriExtension)) return uriExtension;
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
};

const uploadAvatarUri = async (uri: string, mimeType?: string) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw userError || new Error('Oturum bulunamadı.');

  const response = await fetch(uri);
  const fileData = await response.arrayBuffer();
  const extension = getFileExtension(uri, mimeType);
  const path = `${userData.user.id}/avatar.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, fileData, {
      contentType: mimeType || `image/${extension === 'jpg' ? 'jpeg' : extension}`,
      upsert: true,
    });
  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path);
  const profileImageUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await supabase
    .from('users')
    .update({ profile_image_url: profileImageUrl })
    .eq('id', userData.user.id);
  if (updateError) throw updateError;

  return getProfile(userData.user.id);
};

const createDeviceId = async () => {
  const key = 'supabase_push_device_id';
  const existing = await AsyncStorage.getItem(key);
  if (existing) return existing;
  const value = `${Platform.OS}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await AsyncStorage.setItem(key, value);
  return value;
};

export const authService = {
  async register(data: RegisterData): Promise<AuthResponse> {
    assertSupabaseConfigured();
    const normalizedEmail = data.email.trim().toLowerCase();
    const { data: registrationStatus, error: registrationStatusError } = await supabase.functions.invoke(
      'account-registration-status',
      { body: { action: 'prepare_email_registration', email: normalizedEmail } },
    );
    if (registrationStatusError) throw registrationStatusError;
    if (registrationStatus?.alreadyRegistered) throw new Error('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.');

    const { data: authData, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password: data.password,
      options: {
        emailRedirectTo: Linking.createURL('/(auth)/login', { queryParams: { verified: '1' } }),
        data: {
          full_name: data.fullName.trim(),
          phone: data.phone?.trim() || null,
          user_type: data.userType,
          service_category: data.serviceCategory || null,
          accepted_legal_version: data.acceptedLegalVersion || null,
          marketing_allowed: Boolean(data.marketingAllowed),
        },
      },
    });
    if (error) throw error;
    return buildAuthResponse(authData.session, authData.user);
  },

  async login(data: LoginData): Promise<AuthResponse> {
    assertSupabaseConfigured();
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email.trim().toLowerCase(),
      password: data.password,
    });
    if (error) throw error;
    return buildAuthResponse(authData.session);
  },

  async getMe() {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw error || new Error('Oturum bulunamadı.');
    return getProfile(data.user.id);
  },

  async getSession() {
    assertSupabaseConfigured();
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async uploadAvatar(formData: FormData) {
    const parts = (formData as any)?._parts || [];
    const imagePart = parts.find(([key]: [string]) => key === 'image')?.[1];
    if (!imagePart?.uri) throw new Error('Yüklenecek görsel bulunamadı.');
    return uploadAvatarUri(imagePart.uri, imagePart.type);
  },

  async uploadAvatarBase64(base64Image: string) {
    return uploadAvatarUri(base64Image, base64Image.match(/^data:([^;]+);/)?.[1]);
  },

  async removeAvatar() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw new Error('Oturum bulunamadı.');

    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(data.user.id);
    if (listError) throw listError;
    if (files?.length) {
      const { error: removeError } = await supabase.storage
        .from('avatars')
        .remove(files.map((file) => `${data.user!.id}/${file.name}`));
      if (removeError) throw removeError;
    }
    const { error } = await supabase.from('users').update({ profile_image_url: null }).eq('id', data.user.id);
    if (error) throw error;
    return getProfile(data.user.id);
  },

  async logout() {
    try {
      const deviceId = await AsyncStorage.getItem('supabase_push_device_id');
      const { data } = await supabase.auth.getUser();
      if (deviceId && data.user) {
        await supabase.from('push_tokens').update({ is_active: false }).eq('user_id', data.user.id).eq('device_id', deviceId);
      }
    } finally {
      await supabase.auth.signOut();
      try {
        const { signOutGoogle } = require('./socialAuthService');
        await signOutGoogle();
      } catch {
        // Native Google session cleanup is best-effort.
      }
    }
  },

  async registerPushToken(): Promise<'granted' | 'denied' | 'needs_settings' | undefined> {
    const isExpoGo = Constants.appOwnership === 'expo';
    if (isExpoGo && Platform.OS === 'android') return;

    const Notifications = await import('expo-notifications');
    const Device = await import('expo-device');
    if (!Device.isDevice) return;

    const current = await Notifications.getPermissionsAsync();
    if (current.status !== 'granted' && !current.canAskAgain) return 'needs_settings';
    const status = current.status === 'granted'
      ? current.status
      : (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return 'denied';

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Genel Bildirimler',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    const projectId = Constants.easConfig?.projectId
      || Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) throw new Error('EAS project ID bulunamadı.');

    let token: string;
    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (error: any) {
      const message = String(error?.message || error || 'UNKNOWN_PUSH_TOKEN_ERROR').slice(0, 500);
      await supabase.auth.updateUser({
        data: {
          push_registration_error: message,
          push_registration_error_at: new Date().toISOString(),
        },
      }).catch(() => {});
      throw error;
    }
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) throw new Error('Push token kaydı için oturum bulunamadı.');

    const deviceId = await createDeviceId();
    const { error } = await supabase.from('push_tokens').upsert({
      user_id: authData.user.id,
      expo_push_token: token,
      device_id: deviceId,
      platform: Platform.OS,
      is_active: true,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: 'user_id,device_id' });
    if (error) throw error;

    await supabase.auth.updateUser({
      data: { push_registration_error: null, push_registration_error_at: null },
    }).catch(() => {});
    return 'granted';
  },

  async forgotPassword(email: string) {
    assertSupabaseConfigured();
    const redirectTo = Linking.createURL('/(auth)/forgot-password', { queryParams: { recovery: '1' } });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    if (error) throw error;
    return { success: true, message: 'Şifre yenileme bağlantısı e-posta adresinize gönderildi.' };
  },

  async resetPassword(data: { newPassword: string }) {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      throw new Error('Şifre yenileme bağlantısı geçersiz veya süresi dolmuş. E-postanızdan bağlantıyı tekrar açın.');
    }
    const { error } = await supabase.auth.updateUser({ password: data.newPassword });
    if (error) throw error;
    await supabase.auth.signOut({ scope: 'local' });
    return { success: true, message: 'Şifreniz başarıyla yenilendi.' };
  },

  async changePassword(currentPassword: string, newPassword: string) {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const email = userData.user?.email;
    if (userError || !email) throw userError ?? new Error('E-posta hesabı bulunamadı.');
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (verifyError) throw new Error('Mevcut şifreniz hatalı.');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    return { success: true };
  },

  async deleteAccount() {
    const { data, error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) throw error;
    if (!data?.success) throw new Error('Hesap silinemedi.');
    await supabase.auth.signOut({ scope: 'local' });
    return { success: true };
  },

  async resendVerification(email: string) {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: Linking.createURL('/(auth)/login', { queryParams: { verified: '1' } }) },
    });
    if (error) throw error;
  },

  async handleAuthUrl(url: string) {
    const parsed = Linking.parse(url);
    const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) throw error;
      return true;
    }

    const fragment = url.includes('#') ? url.split('#')[1] : '';
    const params = new URLSearchParams(fragment);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) throw error;
      return true;
    }
    return false;
  },

  async getVerificationStatus() {
    const user = await this.getMe();
    if (!user) throw new Error('Kullanıcı profili bulunamadı.');
    return {
      status: 200,
      data: {
        status: user.electricianProfile?.verificationStatus,
        data: { verificationStatus: user.electricianProfile?.verificationStatus },
      },
    };
  },
};
