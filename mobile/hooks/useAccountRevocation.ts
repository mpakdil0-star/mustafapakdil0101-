import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch } from './redux';
import { clearSession } from '../store/slices/authSlice';
import { supabase } from '../services/supabase';

interface UseAccountRevocationProps {
  isAuthenticated: boolean;
  userId?: string;
  isImpersonated?: boolean;
}

export const useAccountRevocation = ({
  isAuthenticated,
  userId,
  isImpersonated,
}: UseAccountRevocationProps) => {
  const router = useRouter();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!isAuthenticated || !userId || isImpersonated) return;

    let handled = false;
    const revokeLocalSession = async (reason = 'ADMIN_DELETED') => {
      if (handled) return;
      handled = true;
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch {
        // Redux and navigation must still be cleared if local sign-out fails.
      }
      dispatch(clearSession());
      router.replace('/welcome');
      Alert.alert(
        'Oturum sonlandırıldı',
        reason === 'ADMIN_SUSPENDED'
          ? 'Hesabınız yönetici tarafından askıya alındı.'
          : reason === 'ADMIN_BANNED'
            ? 'Hesabınız bir şikâyet incelemesi sonucunda yönetici tarafından kapatıldı.'
            : 'Hesabınız yönetici tarafından silindi.'
      );
    };

    const channel = supabase
      .channel(`account-revocation:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'account_revocations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          void revokeLocalSession((payload.new as any)?.reason);
        }
      )
      .subscribe();

    // Covers a deletion that happened while the device was offline or while
    // the Realtime channel was still connecting.
    supabase
      .from('account_revocations')
      .select('id,reason')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) void revokeLocalSession(data.reason);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId, isImpersonated, dispatch, router]);
};
