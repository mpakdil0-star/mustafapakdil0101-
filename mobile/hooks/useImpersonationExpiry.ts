import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from './redux';
import { stopImpersonation } from '../store/slices/authSlice';

interface UseImpersonationExpiryProps {
  isImpersonated?: boolean;
  impersonationExpiresAt?: string;
}

export const useImpersonationExpiry = ({
  isImpersonated,
  impersonationExpiresAt,
}: UseImpersonationExpiryProps) => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isImpersonated || !impersonationExpiresAt) return;
    const remaining = new Date(impersonationExpiresAt).getTime() - Date.now();

    const restoreAdmin = async () => {
      try {
        await dispatch(stopImpersonation()).unwrap();
        router.replace('/admin/users');
        Alert.alert('Yönetici moduna dönüldü', 'Süreli kullanıcı oturumu sona erdi.');
      } catch {
        Alert.alert('Oturum hatası', 'Yönetici hesabına otomatik dönüş yapılamadı. Lütfen uygulamayı yeniden açın.');
      }
    };

    if (remaining <= 0) {
      void restoreAdmin();
      return;
    }

    const expiryTimer = setTimeout(() => {
      void restoreAdmin();
    }, remaining);

    return () => clearTimeout(expiryTimer);
  }, [isImpersonated, impersonationExpiresAt, dispatch, router]);
};
