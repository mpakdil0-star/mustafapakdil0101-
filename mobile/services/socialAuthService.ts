/**
 * Sosyal Giriş Servisi
 * Google ve Apple ile giriş/kayıt işlemlerini yönetir.
 */
import { Platform } from 'react-native';
import { authService } from './authService';
import { assertSupabaseConfigured, supabase } from './supabase';

// ============================================================
// GOOGLE SIGN-IN
// ============================================================

let GoogleSignin: any = null;

/**
 * Google Sign-In modülünü lazy-load et.
 * Bu sayede modül yokken uygulama crash olmaz.
 */
const getGoogleSignin = async () => {
  // If running in Expo Go, fail gracefully and avoid importing/instantiating the native library
  try {
    const Constants = require('expo-constants').default;
    if (Constants.appOwnership === 'expo') {
      console.log('ℹ️ [SocialAuth] Skipping Google Sign-In: Running in Expo Go environment');
      return null;
    }
  } catch (_e) {}

  // Double check if the native module actually exists to prevent bridge crash in custom configurations
  try {
    const { NativeModules } = require('react-native');
    if (!NativeModules.RNGoogleSignin) {
      console.log('ℹ️ [SocialAuth] Skipping Google Sign-In: Native RNGoogleSignin module not present');
      return null;
    }
  } catch (_e) {}

  if (!GoogleSignin) {
    try {
      const module = await import('@react-native-google-signin/google-signin');
      GoogleSignin = module.GoogleSignin;
    } catch (e) {
      console.warn('Google Sign-In modülü yüklenemedi:', e);
      throw new Error('Google ile giriş şu an kullanılamıyor.');
    }
  }
  return GoogleSignin;
};

/**
 * Google Sign-In'i yapılandır
 * NOT: webClientId'yi Google Cloud Console'dan almanız gerekiyor.
 */
export const configureGoogleSignIn = async () => {
  try {
    const GS = await getGoogleSignin();
    if (!GS) return;

    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
    if (!webClientId) {
      throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID tanımlı değil.');
    }
    
    await GS.configure({
      webClientId,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
    console.log('✅ Google Sign-In configured successfully');
  } catch (e) {
    console.warn('⚠️ Google Sign-In yapılandırma hatası:', e);
  }
};

/**
 * Google ile giriş yap
 * @returns Google ID Token
 */
export const signInWithGoogle = async (): Promise<string> => {
  try {
    await configureGoogleSignIn();
    const GS = await getGoogleSignin();
    if (!GS) throw new Error('Google Sign-In kütüphanesi hazır değil.');

    // ÖNEMLİ: Önceki oturumu temizle (SIGN_IN_IN_PROGRESS veya benzeri çakışmaları önler)
    try {
      await GS.signOut();
    } catch (e) { /* ignore */ }

    await GS.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const signInResult = await GS.signIn();

    // Yeni API: signInResult.data.idToken
    // Eski API: signInResult.idToken
    const idToken = signInResult?.data?.idToken || signInResult?.idToken;

    if (!idToken) {
      throw new Error('Google ID token alınamadı');
    }

    return idToken;
  } catch (error: any) {
    // Kullanıcı iptal etti
    if (error?.code === 'SIGN_IN_CANCELLED' || error?.code === '12501') {
      throw new Error('CANCELLED');
    }
    // DEVELOPER_ERROR (kod 10) = SHA-1 parmak izi Google Cloud Console'da kayıtlı değil
    if (error?.code === 'DEVELOPER_ERROR' || error?.code === '10') {
      console.error('❌ Google Sign-In DEVELOPER_ERROR: SHA-1 parmak izi Google Cloud Console\'da kayıtlı değil veya paket adı yanlış.');
      throw new Error('DEVELOPER_ERROR');
    }
    console.error('Google Sign-In hatası - Kod:', error?.code, '| Mesaj:', error?.message, '| Tam hata:', JSON.stringify(error));
    throw new Error(`GOOGLE_ERROR:${error?.code || 'UNKNOWN'}`);
  }
};

/**
 * Google oturumunu kapat
 */
export const signOutGoogle = async () => {
  try {
    const GS = await getGoogleSignin();
    if (!GS) return;
    
    // Hem signOut hem de revokeAccess yaparak oturumu tamamen sıfırla
    try {
      await GS.signOut();
    } catch (e) { /* ignore */ }
    
    try {
      await GS.revokeAccess();
    } catch (e) { /* ignore */ }
    
    console.log('✅ Google session cleared completely');
  } catch (e) {
    console.log('Google Sign-Out error (silent):', e);
  }
};

// ============================================================
// APPLE SIGN-IN
// ============================================================

/**
 * Apple ile giriş yap (sadece iOS)
 * @returns { identityToken, fullName }
 */
export const signInWithApple = async (): Promise<{ identityToken: string; fullName: string | null }> => {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple ile giriş sadece iOS cihazlarda kullanılabilir.');
  }

  // 1. Modülü yükle
  let AppleAuth: any;
  try {
    AppleAuth = await import('expo-apple-authentication');
    // Bazı versiyonlarda default export var, bazılarında yok
    if (AppleAuth.default && AppleAuth.default.signInAsync) {
      AppleAuth = AppleAuth.default;
    }
  } catch (importError: any) {
    console.error('❌ expo-apple-authentication modülü yüklenemedi:', importError);
    throw new Error('Apple giriş modülü yüklenemedi. Lütfen uygulamayı güncelleyin.');
  }

  // 2. Apple Sign-In kullanılabilir mi kontrol et
  try {
    if (AppleAuth.isAvailableAsync) {
      const isAvailable = await AppleAuth.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Bu cihazda Apple ile giriş desteklenmiyor. iOS 13+ gereklidir.');
      }
    }
  } catch (availError: any) {
    if (availError?.message?.includes('desteklenmiyor')) {
      throw availError;
    }
    console.warn('⚠️ Apple availability check failed:', availError?.message);
  }

  // 3. signInAsync fonksiyonunu bul
  const signInAsync = AppleAuth.signInAsync;
  if (!signInAsync) {
    console.error('❌ signInAsync bulunamadı. Modül içeriği:', Object.keys(AppleAuth));
    throw new Error('Apple giriş fonksiyonu bulunamadı. Lütfen uygulamayı güncelleyin.');
  }

  // 4. Scope enum'larını bul
  const FULL_NAME = AppleAuth.AppleAuthenticationScope?.FULL_NAME ?? 1;
  const EMAIL = AppleAuth.AppleAuthenticationScope?.EMAIL ?? 0;

  // 5. Apple Sign-In popup aç
  let credential: any;
  try {
    credential = await signInAsync({
      requestedScopes: [FULL_NAME, EMAIL],
    });
  } catch (signInError: any) {
    console.error('❌ Apple signInAsync hatası:', JSON.stringify({
      code: signInError?.code,
      message: signInError?.message,
      name: signInError?.name,
    }));
    // Kullanıcı iptal etti
    if (
      signInError?.code === 'ERR_REQUEST_CANCELED' ||
      signInError?.code === 'ERR_CANCELED' ||
      signInError?.code === '1001' ||
      signInError?.message?.includes('canceled') ||
      signInError?.message?.includes('cancelled')
    ) {
      throw new Error('CANCELLED');
    }
    throw new Error(`Apple oturum açma başarısız: ${signInError?.message || signInError?.code || 'Bilinmeyen hata'}`);
  }

  // 6. Token kontrolü
  if (!credential || !credential.identityToken) {
    console.error('❌ Apple credential boş veya token yok:', JSON.stringify(credential));
    throw new Error('Apple kimlik bilgisi alınamadı. Lütfen tekrar deneyin.');
  }

  // Apple sadece ilk girişte isim bilgisi verir
  const fullName = credential.fullName
    ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
    : null;

  console.log('✅ Apple Sign-In başarılı, token alındı');

  return {
    identityToken: credential.identityToken,
    fullName: fullName || null,
  };
};

// ============================================================
// SUPABASE AUTH AKIŞI
// ============================================================

interface SocialAuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

/**
 * Google token'ını Supabase Auth'a aktar ve giriş/kayıt yap
 */
export const googleLoginWithSupabase = async (
  idToken: string,
  userType?: 'CITIZEN' | 'ELECTRICIAN',
  serviceCategory?: string
): Promise<SocialAuthResponse> => {
  assertSupabaseConfigured();
  const registrationMode = Boolean(userType);
  const { data: registrationStatus, error: statusError } = await supabase.functions.invoke(
    'account-registration-status',
    {
      body: {
        action: registrationMode ? 'prepare_google_registration' : 'check_google_login',
        idToken,
      },
    },
  );
  if (statusError) throw statusError;

  if (!registrationMode && !registrationStatus?.registered) {
    const notFound = new Error('USER_NOT_FOUND') as Error & { code?: string; email?: string; wasDeleted?: boolean };
    notFound.code = 'USER_NOT_FOUND';
    notFound.email = registrationStatus?.email;
    notFound.wasDeleted = Boolean(registrationStatus?.wasDeleted);
    throw notFound;
  }
  if (registrationMode && registrationStatus?.alreadyRegistered) {
    const exists = new Error('ACCOUNT_ALREADY_EXISTS') as Error & { code?: string; email?: string };
    exists.code = 'ACCOUNT_ALREADY_EXISTS';
    exists.email = registrationStatus?.email;
    throw exists;
  }

  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: idToken });
  if (error) throw error;

  if (userType) {
    const { error: profileError } = await supabase.rpc('complete_auth_profile', {
      requested_user_type: userType,
      requested_service_category: serviceCategory || null,
    });
    if (profileError) throw profileError;
  }

  // Token'ları kaydet
  const user = await authService.getMe();

  return { user, accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
};

/**
 * Apple token'ını Supabase Auth'a aktar ve giriş/kayıt yap
 */
export const appleLoginWithSupabase = async (
  identityToken: string,
  fullName: string | null,
  userType?: 'CITIZEN' | 'ELECTRICIAN',
  serviceCategory?: string
): Promise<SocialAuthResponse> => {
  assertSupabaseConfigured();
  const { data, error } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: identityToken });
  if (error) throw error;

  if (fullName) {
    const { error: metadataError } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    if (metadataError) throw metadataError;
  }

  if (userType || fullName) {
    const { error: profileError } = await supabase.rpc('complete_auth_profile', {
      requested_user_type: userType || 'CITIZEN',
      requested_full_name: fullName,
      requested_service_category: serviceCategory || null,
    });
    if (profileError) throw profileError;
  }

  // Token'ları kaydet
  const user = await authService.getMe();

  return { user, accessToken: data.session.access_token, refreshToken: data.session.refresh_token };
};
