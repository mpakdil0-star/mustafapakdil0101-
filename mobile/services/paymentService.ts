import { supabase } from './supabase';

export const CREDIT_PACKAGES = [
  { id: 'pkg_10', name: 'Hızlı Başlangıç', credits: 10, price: 189, color: '#3B82F6' },
  { id: 'pkg_35', name: 'Gelişim Paketi', credits: 35, price: 489, color: '#94A3B8' },
  { id: 'pkg_75', name: 'Eko-Avantaj', credits: 75, price: 889, color: '#F59E0B', isPopular: true },
  { id: 'pkg_175', name: 'Usta Paketi', credits: 175, price: 1489, color: '#8B5CF6' },
];

export const paymentService = {
  packages: () => CREDIT_PACKAGES,
  async history() {
    const { data, error } = await supabase.from('credits').select('*').order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    return (data ?? []).map(item => ({ ...item, transactionType: item.transaction_type, balanceAfter: Number(item.balance_after), amount: Number(item.amount), createdAt: item.created_at }));
  },
  async verifyPurchase(productId: string, purchaseToken: string) {
    if (!productId || !purchaseToken) throw new Error('PURCHASE_TOKEN_MISSING');
    let { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;

    let session = sessionData.session;
    const expiresSoon = !session?.expires_at || session.expires_at * 1000 < Date.now() + 60_000;
    if (session && expiresSoon) {
      const refreshed = await supabase.auth.refreshSession();
      if (refreshed.error) throw refreshed.error;
      session = refreshed.data.session;
    }
    if (!session?.access_token) {
      const authError: any = new Error('Ödeme doğrulaması için oturum bulunamadı. Lütfen yeniden giriş yapın.');
      authError.code = 'PURCHASE_SESSION_REQUIRED';
      throw authError;
    }

    const { data, error } = await supabase.functions.invoke('verify-google-play-purchase', {
      body: { productId, purchaseToken, packageName: 'com.isbitir.app' },
      // Explicitly attach the current/renewed user JWT. This avoids an
      // intermittent React Native Functions client race after app resume.
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (error) {
      let details: any = null;
      try {
        details = await (error as any).context?.json?.();
      } catch {
        // The response body may already have been consumed by the SDK.
      }
      const purchaseError: any = new Error(details?.message || details?.error || error.message || 'PURCHASE_VERIFICATION_FAILED');
      purchaseError.code = details?.error;
      purchaseError.response = { data: details };
      throw purchaseError;
    }
    if (!data?.success) throw new Error(data?.error || 'PURCHASE_VERIFICATION_FAILED');
    return data;
  },
};
