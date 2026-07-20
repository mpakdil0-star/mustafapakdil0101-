import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService, RegisterData, LoginData } from '../../services/authService';
import {
  signInWithGoogle,
  googleLoginWithSupabase,
  signInWithApple,
  appleLoginWithSupabase,
  configureGoogleSignIn,
} from '../../services/socialAuthService';
import Analytics from '../../services/analyticsService';

interface User {
  id: string;
  email: string;
  fullName: string;
  userType: string;
  phone?: string;
  city?: string;
  district?: string;
  profileImageUrl?: string;
  isVerified: boolean;
  isImpersonated?: boolean;
  acceptedLegalVersion?: string;
  specialties?: string[];
  electricianProfile?: {
    creditBalance: number;
    specialties: string[];
    bio: string;
    experienceYears: number;
    isAvailable: boolean;
    serviceCategory?: string;
  };
}
interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  guestRole: 'CITIZEN' | 'ELECTRICIAN' | null;
  draftProfile: {
    fullName?: string;
    email?: string;
    phone?: string;
    experienceYears?: string;
    specialties?: string[];
  } | null;
  requiredLegalVersion: string | null;
  isInitialized: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
  guestRole: null,
  draftProfile: null,
  requiredLegalVersion: null,
  isInitialized: false,
};

const handleAuthError = (error: any, defaultMessage: string) => {
  // Supabase ve olası eski servis hataları için ortak ayrıştırma
  const statusCode = error?.response?.status;
  const serverMessage = error?.response?.data?.error?.message || error?.response?.data?.message;
  const supabaseMessage = typeof error?.message === 'string' ? error.message : '';

  const supabaseErrorMessages: Record<string, string> = {
    'Invalid login credentials': 'E-posta veya şifre hatalı.',
    'Email not confirmed': 'Giriş yapmadan önce e-posta adresinizi doğrulayın.',
    'User already registered': 'Bu e-posta adresi zaten kayıtlı.',
    'Password should be at least 6 characters': 'Şifre en az 6 karakter olmalıdır.',
    'Signup requires a valid password': 'Geçerli bir şifre girin.',
  };

  if (supabaseErrorMessages[supabaseMessage]) {
    return supabaseErrorMessages[supabaseMessage];
  }

  // Debug log
  console.log('🔍 Auth Error Debug:', { statusCode, serverMessage, fullError: error?.response?.data });

  // PRIORITY 1: If server returned a Turkish message, use it directly
  const turkishKeywords = ['zaten', 'hatalı', 'silinmiş', 'bulunamadı', 'gerekiyor', 'kayıtlı'];
  if (serverMessage && turkishKeywords.some(keyword => serverMessage.includes(keyword))) {
    return serverMessage;
  }

  // Map status codes to user-friendly Turkish messages (fallback)
  const errorMessages: Record<number, string> = {
    400: 'Girilen bilgilerde hata var. Lütfen kontrol edin.',
    401: 'E-posta veya şifre hatalı. Lütfen tekrar deneyin.',
    403: 'Bu işlem için yetkiniz bulunmuyor.',
    404: 'Kullanıcı bulunamadı.',
    409: 'Bu e-posta veya telefon numarası zaten kayıtlı.',
    422: 'Girilen bilgiler geçersiz. Lütfen kontrol edin.',
    429: 'Çok fazla deneme yaptınız. Lütfen biraz bekleyin.',
    500: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.',
    503: 'Sunucu şu an erişilebilir değil. Lütfen daha sonra tekrar deneyin.',
  };

  // Return mapped message or default
  if (statusCode && errorMessages[statusCode]) {
    return errorMessages[statusCode];
  }

  // If error is a string, return it directly
  if (typeof error === 'string') {
    return error;
  }

  // Check for network errors
  if (error?.message?.includes('Network') || error?.message?.includes('timeout')) {
    return 'İnternet bağlantınızı kontrol edin.';
  }

  return serverMessage || supabaseMessage || defaultMessage;
};


export const register = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      return await authService.register(data);
    } catch (error: any) {
      return rejectWithValue(handleAuthError(error, 'Kayıt işlemi başarısız oldu'));
    }
  }
);

export const login = createAsyncThunk(
  'auth/login',
  async (data: LoginData, { rejectWithValue }) => {
    try {
      return await authService.login(data);
    } catch (error: any) {
      return rejectWithValue(handleAuthError(error, 'Giriş işlemi başarısız oldu'));
    }
  }
);

export const getMe = createAsyncThunk(
  'auth/getMe',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getMe();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to get user');
    }
  }
);

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const session = await authService.getSession();
      if (!session) return null;
      const user = await authService.getMe();
      return { user, accessToken: session.access_token };
    } catch (error: any) {
      return rejectWithValue(error?.message || 'Oturum başlatılamadı');
    }
  }
);

export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    await authService.logout();
  }
);

export const stopImpersonation = createAsyncThunk(
  'auth/stopImpersonation',
  async (_, { dispatch, rejectWithValue }) => {
    try {
      const apiService = { restoreAdminFallback: async () => false };
      const restored = await apiService.restoreAdminFallback();
      if (restored) {
        // Fetch original admin user data
        const user = await authService.getMe();
        return user;
      }
      // If no fallback, just logout as safety
      await authService.logout();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Geri dönülemedi');
    }
  }
);

// ============================================================
// SOSYAL GİRİŞ THUNK'LARI
// ============================================================

export const googleLogin = createAsyncThunk(
  'auth/googleLogin',
  async (params: { userType?: 'CITIZEN' | 'ELECTRICIAN'; serviceCategory?: string } | undefined, { rejectWithValue }) => {
    try {
      // 1. Google popup aç ve ID token al
      const idToken = await signInWithGoogle();

      // 2. Supabase Auth'a gönder
      const result = await googleLoginWithSupabase(
        idToken,
        params?.userType,
        params?.serviceCategory
      );

      // Reduced delay to 500ms to be more responsive while still avoiding UI thread collisions
      await new Promise(resolve => setTimeout(resolve, 500));

      return result;
    } catch (error: any) {
      // Kullanıcı iptal etti
      if (error.message === 'CANCELLED') {
        return rejectWithValue('CANCELLED');
      }
      // SHA-1 / paket adı uyuşmazlığı
      if (error.message === 'DEVELOPER_ERROR') {
        return rejectWithValue('SHA-1 sertifika hatası: Lütfen Google Cloud Console\'da SHA-1 parmak izinizi kaydedin.');
      }
      if (error?.code === 'USER_NOT_FOUND') {
        return rejectWithValue({ code: 'USER_NOT_FOUND', email: error.email, wasDeleted: Boolean(error.wasDeleted) });
      }
      if (error?.code === 'ACCOUNT_ALREADY_EXISTS') {
        return rejectWithValue({ code: 'ACCOUNT_ALREADY_EXISTS', email: error.email });
      }
      // Eski servis katmanından kalan kullanıcı bulunamadı yanıtı
      if (error?.response?.status === 404) {
        const email = error?.response?.data?.error?.email;
        return rejectWithValue({ code: 'USER_NOT_FOUND', email });
      }
      console.error('googleLogin thunk error:', error?.message, error?.response?.data);
      return rejectWithValue(handleAuthError(error, 'Google ile giriş başarısız oldu'));
    }
  }
);

export const appleLogin = createAsyncThunk(
  'auth/appleLogin',
  async (params: { userType?: 'CITIZEN' | 'ELECTRICIAN'; serviceCategory?: string } | undefined, { rejectWithValue }) => {
    try {
      // 1. Apple popup aç ve identity token + isim al
      const { identityToken, fullName } = await signInWithApple();

      // 2. Supabase Auth'a gönder
      const result = await appleLoginWithSupabase(
        identityToken,
        fullName,
        params?.userType,
        params?.serviceCategory
      );

      return result;
    } catch (error: any) {
      console.error('🍎 Apple Login thunk error:', error?.message, error?.response?.status);
      // Kullanıcı iptal etti
      if (error?.message === 'CANCELLED') {
        return rejectWithValue('CANCELLED');
      }
      // Eski servis katmanından kalan kullanıcı bulunamadı yanıtı
      if (error?.response?.status === 404) {
        const email = error?.response?.data?.error?.email;
        return rejectWithValue({ code: 'USER_NOT_FOUND', email });
      }
      // Native Apple hatası (HTTP response yok) - mesajı doğrudan aktar
      if (!error?.response && error?.message) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue(handleAuthError(error, 'Apple ile giriş başarısız oldu'));
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      if (state.user) {
        // Deep merge: preserve existing nested data (especially electricianProfile)
        const incoming = action.payload;
        const existingProfile = state.user.electricianProfile;
        const incomingProfile = incoming.electricianProfile;

        state.user = {
          ...state.user,
          ...incoming,
          // Deep merge electricianProfile to avoid losing serviceCategory, specialties, etc.
          electricianProfile: existingProfile && incomingProfile
            ? { ...existingProfile, ...incomingProfile }
            : incomingProfile || existingProfile,
        };
      } else {
        state.user = action.payload;
      }
      state.isAuthenticated = true;
    },
    setGuestRole: (state, action: PayloadAction<'CITIZEN' | 'ELECTRICIAN' | null>) => {
      state.guestRole = action.payload;
    },
    updateCreditBalance: (state, action: PayloadAction<number>) => {
      if (state.user && state.user.electricianProfile) {
        state.user.electricianProfile.creditBalance = action.payload;
      }
    },
    setDraftProfile: (state, action: PayloadAction<{ 
      fullName?: string;
      email?: string;
      phone?: string;
      experienceYears?: string; 
      specialties?: string[] 
    }>) => {
      state.draftProfile = {
        ...state.draftProfile,
        ...action.payload,
      };
    },
    clearDraftProfile: (state) => {
      state.draftProfile = null;
    },
    setRequiredLegalVersion: (state, action: PayloadAction<string | null>) => {
      state.requiredLegalVersion = action.payload;
    },
    clearSession: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.isInitialized = true;
      state.error = null;
      state.requiredLegalVersion = null;
    },
    // Admin impersonation: kullanıcı ve token'ı aynı anda set et
    impersonateLogin: (state, action: PayloadAction<{ user: User; accessToken: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;
      state.guestRole = null;
    },
  },
  extraReducers: (builder) => {
    // Register & Login (aynı mantık)
    const handleAuthPending = (state: AuthState) => {
      state.isLoading = true;
      state.error = null;
    };

    const handleAuthFulfilled = (state: AuthState, action: any) => {
      state.isLoading = false;
      state.isInitialized = true;
      state.user = action.payload.user;
      state.token = action.payload.accessToken;
      state.isAuthenticated = true;
      state.error = null;
      state.guestRole = null;
      state.requiredLegalVersion = action.payload.currentLegalVersion || null;

      // Track analytics safely
      try {
        const userType = action.payload.user?.userType || 'CITIZEN';
        const userId = action.payload.user?.id;
        
        if (userId) {
          Analytics.setUser(userId);
          Analytics.setProperty('user_type', userType);
          Analytics.userLoggedIn(userType);
        }
      } catch (analyticsError) {
        console.warn('📊 [AuthSlice] Analytics tracking failed:', analyticsError);
      }
    };

    const handleAuthRejected = (state: AuthState, action: any) => {
      state.isLoading = false;
      state.error = action.payload as string;
    };

    builder
      .addCase(register.pending, handleAuthPending)
      .addCase(register.fulfilled, (state, action: any) => {
        state.isLoading = false;
        state.isInitialized = true;
        if (action.payload.pendingVerification) {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
          state.error = null;
          return;
        }
        handleAuthFulfilled(state, action);
      })
      .addCase(register.rejected, handleAuthRejected)
      .addCase(login.pending, handleAuthPending)
      .addCase(login.fulfilled, handleAuthFulfilled)
      .addCase(login.rejected, handleAuthRejected)
      .addCase(initializeAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        if (action.payload) {
          state.user = action.payload.user;
          state.token = action.payload.accessToken;
          state.isAuthenticated = true;
          state.error = null;
        } else {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.isLoading = false;
        state.isInitialized = true;
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = action.payload as string;
      })
      // Google Login
      .addCase(googleLogin.pending, handleAuthPending)
      .addCase(googleLogin.fulfilled, handleAuthFulfilled)
      .addCase(googleLogin.rejected, (state, action) => {
        state.isLoading = false;
        // İptal durumunda hata gösterme
        if (action.payload === 'CANCELLED') {
          state.error = null;
        } else if (typeof action.payload === 'object' && (action.payload as any)?.code === 'USER_NOT_FOUND') {
          state.error = null; // Frontend kendisi handle edecek
        } else {
          state.error = action.payload as string;
        }
      })
      // Apple Login
      .addCase(appleLogin.pending, handleAuthPending)
      .addCase(appleLogin.fulfilled, handleAuthFulfilled)
      .addCase(appleLogin.rejected, (state, action) => {
        state.isLoading = false;
        if (action.payload === 'CANCELLED') {
          state.error = null;
        } else if (typeof action.payload === 'object' && (action.payload as any)?.code === 'USER_NOT_FOUND') {
          state.error = null;
        } else {
          state.error = action.payload as string;
        }
      })
      .addCase(getMe.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getMe.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(getMe.rejected, (state) => {
        state.isLoading = false;
        // NOT setting isAuthenticated = false here intentionally.
        // If getMe fails (e.g. 401 due to token timing), we keep the user logged in.
        // Real logout is triggered explicitly via the logout thunk or api interceptor.
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.requiredLegalVersion = null;
        state.guestRole = null;
        state.isInitialized = true;
      })
      .addCase(logout.rejected, (state) => {
        // Clear state anyway even if server request fails
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        state.requiredLegalVersion = null;
        state.guestRole = null;
        state.isInitialized = true;
      })
      .addCase(stopImpersonation.fulfilled, (state, action) => {
        if (action.payload) {
          state.user = action.payload;
          state.isAuthenticated = true;
          state.error = null;
        } else {
          state.user = null;
          state.token = null;
          state.isAuthenticated = false;
        }
      })
      .addCase(stopImpersonation.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError, setUser, setGuestRole, updateCreditBalance, setDraftProfile, clearDraftProfile, setRequiredLegalVersion, clearSession, impersonateLogin } = authSlice.actions;
export default authSlice.reducer;

