/**
 * Sosyal Giriş Servisi
 * Google ve Apple ile giriş/kayıt işlemlerini yönetir.
 */
import { Platform } from 'react-native';
import apiClient from './api';
import { apiService } from './api';

// ============================================================
// GOOGLE SIGN-IN
// ============================================================

let GoogleSignin: any = null;

/**
 * Google Sign-In modülünü lazy-load et.
 * Bu sayede modül yokken uygulama crash olmaz.
 */
const getGoogleSignin = async () => {
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
    GS.configure({
      // Google Cloud Console → OAuth 2.0 Client IDs → Web client ID
      // Bu ID backend doğrulaması için gerekli (Android client ID'si değil!)
      webClientId: '850829107432-722tuskg1qbktela7q5bdj9o4d1jceav.apps.googleusercontent.com',
      offlineAccess: true,
    });
  } catch (e) {
    console.warn('Google Sign-In yapılandırma hatası:', e);
  }
};

/**
 * Google ile giriş yap
 * @returns Google ID Token
 */
export const signInWithGoogle = async (): Promise<string> => {
  const GS = await getGoogleSignin();

  try {
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
    console.error('Google Sign-In hatası:', error);
    throw new Error('Google ile giriş başarısız oldu.');
  }
};

/**
 * Google oturumunu kapat
 */
export const signOutGoogle = async () => {
  try {
    const GS = await getGoogleSignin();
    await GS.signOut();
  } catch (e) {
    // Sessizce devam et
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

  try {
    const AppleAuthentication = (await import('expo-apple-authentication')).default;

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new Error('Apple identity token alınamadı');
    }

    // Apple sadece ilk girişte isim bilgisi verir
    const fullName = credential.fullName
      ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
      : null;

    return {
      identityToken: credential.identityToken,
      fullName: fullName || null,
    };
  } catch (error: any) {
    // Kullanıcı iptal etti
    if (error?.code === 'ERR_REQUEST_CANCELED' || error?.code === '1001') {
      throw new Error('CANCELLED');
    }
    console.error('Apple Sign-In hatası:', error);
    throw new Error('Apple ile giriş başarısız oldu.');
  }
};

// ============================================================
// BACKEND İLETİŞİM
// ============================================================

interface SocialAuthResponse {
  user: any;
  accessToken: string;
  refreshToken: string;
}

/**
 * Google token'ını backend'e gönder ve giriş/kayıt yap
 */
export const googleLoginToBackend = async (
  idToken: string,
  userType?: 'CITIZEN' | 'ELECTRICIAN',
  serviceCategory?: string
): Promise<SocialAuthResponse> => {
  const response = await apiClient.post('/auth/google', {
    token: idToken,
    userType,
    serviceCategory,
  });

  const data = response.data.data;

  // Token'ları kaydet
  await apiService.setTokens(data.accessToken, data.refreshToken);

  return data;
};

/**
 * Apple token'ını backend'e gönder ve giriş/kayıt yap
 */
export const appleLoginToBackend = async (
  identityToken: string,
  fullName: string | null,
  userType?: 'CITIZEN' | 'ELECTRICIAN',
  serviceCategory?: string
): Promise<SocialAuthResponse> => {
  const response = await apiClient.post('/auth/apple', {
    identityToken,
    fullName,
    userType,
    serviceCategory,
  });

  const data = response.data.data;

  // Token'ları kaydet
  await apiService.setTokens(data.accessToken, data.refreshToken);

  return data;
};
