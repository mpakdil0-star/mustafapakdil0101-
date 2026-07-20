import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});
const sha256 = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value.trim().toLowerCase()));
  return Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const verifiedGoogleEmail = async (idToken: string) => {
  const expectedAudience = Deno.env.get('GOOGLE_WEB_CLIENT_ID');
  if (!expectedAudience) throw new Error('GOOGLE_CLIENT_NOT_CONFIGURED');
  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
  if (!response.ok) throw new Error('INVALID_GOOGLE_TOKEN');
  const identity = await response.json();
  if (identity.aud !== expectedAudience || identity.email_verified !== 'true' || !identity.email) {
    throw new Error('INVALID_GOOGLE_IDENTITY');
  }
  return String(identity.email).trim().toLowerCase();
};

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply({ error: 'SERVER_CONFIGURATION_ERROR' }, 500);

  try {
    const { action, idToken, email: suppliedEmail } = await request.json();
    const isGoogleAction = action === 'check_google_login' || action === 'prepare_google_registration';
    if (!isGoogleAction && action !== 'prepare_email_registration') {
      return reply({ error: 'INVALID_ACTION' }, 400);
    }

    const email = isGoogleAction
      ? await verifiedGoogleEmail(String(idToken || ''))
      : String(suppliedEmail || '').trim().toLowerCase();
    if (!email || !email.includes('@')) return reply({ error: 'INVALID_EMAIL' }, 400);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const identityHash = await sha256(email);
    const [{ data: profile }, { data: deletedIdentity }] = await Promise.all([
      admin.from('users').select('id,is_active,deleted_at').eq('email', email).maybeSingle(),
      admin.from('deleted_user_identities').select('identity_hash').eq('identity_hash', identityHash).maybeSingle(),
    ]);
    const registered = Boolean(profile?.is_active && !profile?.deleted_at);
    const wasDeleted = Boolean(deletedIdentity || (profile && (!profile.is_active || profile.deleted_at)));

    if (action === 'check_google_login') {
      return reply({ success: true, registered, wasDeleted, email });
    }

    if (registered) {
      return reply({ success: true, canRegister: false, alreadyRegistered: true, email });
    }

    // Clean up a legacy soft-deleted account before intentional re-registration.
    // The Google action proves email ownership; email/password registration will
    // still require Supabase email confirmation.
    if (profile?.id) {
      await admin.auth.admin.deleteUser(profile.id, false);
      const { error: legacyDeleteError } = await admin.from('users').delete().eq('id', profile.id);
      if (legacyDeleteError) throw legacyDeleteError;
    }
    const { error: markerDeleteError } = await admin
      .from('deleted_user_identities')
      .delete()
      .eq('identity_hash', identityHash);
    if (markerDeleteError) throw markerDeleteError;

    return reply({ success: true, canRegister: true, wasDeleted, email });
  } catch (error) {
    console.error('Account registration status failed:', error);
    const message = error instanceof Error ? error.message : 'UNKNOWN_ERROR';
    return reply({ error: message }, message.startsWith('INVALID_') ? 401 : 500);
  }
});
