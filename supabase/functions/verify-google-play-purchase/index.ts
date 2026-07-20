import { createClient } from 'npm:@supabase/supabase-js@2';
import { importPKCS8, SignJWT } from 'npm:jose@5';

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
const allowedProducts = new Set(['pkg_10', 'pkg_35', 'pkg_75', 'pkg_175']);

type PurchaseStatus =
  | 'RECEIVED' | 'VERIFYING' | 'PENDING' | 'VERIFIED' | 'GRANTED'
  | 'GRANTED_PENDING_CONSUME' | 'CONSUMED' | 'CANCELED'
  | 'FAILED_RETRYABLE' | 'FAILED_FINAL';

async function googleAccessToken(rawKey: string) {
  const account = JSON.parse(rawKey);
  const now = Math.floor(Date.now() / 1000);
  const key = await importPKCS8(account.private_key, 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/androidpublisher' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuer(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token').setIssuedAt(now).setExpirationTime(now + 3600).sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!response.ok) {
    console.error('Google OAuth failed with status', response.status);
    throw new Error('GOOGLE_AUTH_FAILED');
  }
  return (await response.json()).access_token as string;
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const googleKey = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!googleKey) return reply({ error: 'PURCHASE_VERIFICATION_NOT_CONFIGURED' }, 503);

    const authorization = request.headers.get('Authorization') ?? '';
    const client = createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
    const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply({ error: 'UNAUTHORIZED' }, 401);

    const { productId, purchaseToken, packageName = 'com.isbitir.app' } = await request.json();
    if (!allowedProducts.has(productId) || typeof purchaseToken !== 'string' || !purchaseToken || packageName !== 'com.isbitir.app') return reply({ error: 'INVALID_PURCHASE_REQUEST' }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: existingPurchase, error: existingError } = await admin
      .from('google_play_purchases')
      .select('user_id,product_id,status,verification_attempts')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingPurchase && existingPurchase.user_id !== user.id) {
      return reply({ error: 'PURCHASE_OWNER_MISMATCH' }, 409);
    }
    if (existingPurchase && existingPurchase.product_id !== productId) {
      return reply({ error: 'PURCHASE_PRODUCT_MISMATCH' }, 409);
    }

    const writePurchaseState = async (
      status: PurchaseStatus,
      values: Record<string, unknown> = {},
    ) => {
      const { error } = await admin.from('google_play_purchases').upsert({
        purchase_token: purchaseToken,
        user_id: user.id,
        product_id: productId,
        package_name: packageName,
        status,
        ...values,
      }, { onConflict: 'purchase_token' });
      if (error) throw error;
    };

    await writePurchaseState('VERIFYING', {
      verification_attempts: Number(existingPurchase?.verification_attempts ?? 0) + 1,
      last_error_code: null,
      last_error_message: null,
    });

    let token: string;
    try {
      token = await googleAccessToken(googleKey);
    } catch {
      await writePurchaseState('FAILED_RETRYABLE', {
        last_error_code: 'GOOGLE_AUTH_FAILED',
        last_error_message: 'Google OAuth token could not be created.',
      });
      return reply({ error: 'GOOGLE_AUTH_FAILED', retryable: true }, 503);
    }
    const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(purchaseToken)}`;
    const purchaseResponse = await fetch(base, { headers: { Authorization: `Bearer ${token}` } });
    const purchaseBody = await purchaseResponse.text();
    if (!purchaseResponse.ok) {
      console.error('Google Play purchase verification failed with status', purchaseResponse.status);
      if (purchaseResponse.status === 401 || purchaseResponse.status === 403) {
        await writePurchaseState('FAILED_RETRYABLE', {
          last_error_code: 'GOOGLE_PLAY_ACCESS_DENIED',
          last_error_message: `Google Play API returned ${purchaseResponse.status}.`,
        });
        return reply({ error: 'GOOGLE_PLAY_ACCESS_DENIED', message: 'Google Play API service account is not authorized for this app.' }, 503);
      }
      await writePurchaseState(purchaseResponse.status >= 500 ? 'FAILED_RETRYABLE' : 'FAILED_FINAL', {
        last_error_code: 'GOOGLE_PLAY_VERIFICATION_FAILED',
        last_error_message: `Google Play API returned ${purchaseResponse.status}.`,
      });
      return reply({ error: 'GOOGLE_PLAY_VERIFICATION_FAILED', message: 'Purchase could not be verified by Google Play.' }, 400);
    }
    const purchase = JSON.parse(purchaseBody);
    const purchaseState = Number(purchase.purchaseState);
    const consumptionState = Number(purchase.consumptionState ?? 0);
    if (purchase.productId && purchase.productId !== productId) {
      await writePurchaseState('FAILED_FINAL', {
        google_purchase_state: purchaseState,
        google_consumption_state: consumptionState,
        last_error_code: 'PURCHASE_PRODUCT_MISMATCH',
      });
      return reply({ error: 'PURCHASE_PRODUCT_MISMATCH' }, 409);
    }
    if (Number(purchase.quantity ?? 1) !== 1) {
      await writePurchaseState('FAILED_FINAL', {
        google_purchase_state: purchaseState,
        google_consumption_state: consumptionState,
        last_error_code: 'PURCHASE_QUANTITY_UNSUPPORTED',
      });
      return reply({ error: 'PURCHASE_QUANTITY_UNSUPPORTED' }, 400);
    }
    if (purchaseState === 2) {
      await writePurchaseState('PENDING', {
        order_id: purchase.orderId ?? null,
        google_purchase_state: purchaseState,
        google_consumption_state: consumptionState,
        last_error_code: 'PURCHASE_PENDING',
      });
      return reply({ error: 'PURCHASE_PENDING', retryable: true }, 202);
    }
    if (purchaseState !== 0) {
      await writePurchaseState('CANCELED', {
        order_id: purchase.orderId ?? null,
        google_purchase_state: purchaseState,
        google_consumption_state: consumptionState,
        last_error_code: 'PURCHASE_NOT_COMPLETED',
      });
      return reply({ error: 'PURCHASE_NOT_COMPLETED' }, 400);
    }

    await writePurchaseState('VERIFIED', {
      order_id: purchase.orderId ?? null,
      google_purchase_state: purchaseState,
      google_consumption_state: consumptionState,
      verified_at: new Date().toISOString(),
      last_error_code: null,
      last_error_message: null,
    });

    const { data, error } = await admin.rpc('grant_verified_purchase', { p_user_id: user.id, p_product_id: productId, p_purchase_token: purchaseToken });
    if (error) {
      await writePurchaseState('FAILED_RETRYABLE', {
        last_error_code: 'CREDIT_GRANT_FAILED',
        last_error_message: error.message.slice(0, 500),
      });
      console.error('Credit grant failed:', error.message);
      return reply({ error: 'CREDIT_GRANT_FAILED', retryable: true }, 500);
    }

    let consumedByServer = consumptionState === 1;
    if (!consumedByServer) {
      const consumeResponse = await fetch(`${base}:consume`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      consumedByServer = consumeResponse.ok;
    }

    await writePurchaseState(consumedByServer ? 'CONSUMED' : 'GRANTED_PENDING_CONSUME', {
      granted_at: new Date().toISOString(),
      consumed_at: consumedByServer ? new Date().toISOString() : null,
      google_consumption_state: consumedByServer ? 1 : consumptionState,
      last_error_code: consumedByServer ? null : 'GOOGLE_PLAY_CONSUME_FAILED',
      last_error_message: consumedByServer ? null : 'Credits were granted but Google Play consumption must be retried.',
    });

    return reply({ success: true, data, consumedByServer });
  } catch (error) {
    console.error(error);
    return reply({ error: 'PURCHASE_PROCESSING_FAILED' }, 500);
  }
});
