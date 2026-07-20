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

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return reply({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !anonKey || !serviceKey) return reply({ error: 'SERVER_CONFIGURATION_ERROR' }, 500);

  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const callerClient = createClient(url, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const { data: { user: caller }, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !caller) return reply({ error: 'UNAUTHORIZED' }, 401);

    const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: callerProfile } = await admin.from('users')
      .select('id,user_type,is_active,deleted_at')
      .eq('id', caller.id)
      .maybeSingle();
    if (callerProfile?.user_type !== 'ADMIN' || !callerProfile.is_active || callerProfile.deleted_at) {
      return reply({ error: 'ADMIN_REQUIRED' }, 403);
    }

    const { userId, dryRun = false } = await request.json();
    if (typeof userId !== 'string' || !/^[0-9a-f-]{36}$/i.test(userId)) {
      return reply({ error: 'INVALID_USER_ID' }, 400);
    }
    if (userId === caller.id) return reply({ error: 'CANNOT_DELETE_SELF' }, 400);

    const { data: target, error: targetError } = await admin.from('users')
      .select('id,email,user_type,full_name')
      .eq('id', userId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return reply({ error: 'USER_NOT_FOUND' }, 404);
    if (target.user_type === 'ADMIN') return reply({ error: 'CANNOT_DELETE_ADMIN' }, 403);
    if (dryRun) return reply({ success: true, canDelete: true });

    const identityHash = await sha256(target.email);
    const { error: tombstoneError } = await admin.from('deleted_user_identities').upsert({
      identity_hash: identityHash,
      deleted_by: caller.id,
      deleted_at: new Date().toISOString(),
    });
    if (tombstoneError) throw tombstoneError;

    await admin.from('push_tokens').delete().eq('user_id', userId);

    const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId, false);
    if (authDeleteError && !String(authDeleteError.message).toLowerCase().includes('not found')) {
      throw authDeleteError;
    }

    // These legacy/community tables store user IDs without a users foreign key.
    const cleanupSteps = [
      admin.from('forum_comments').delete().eq('usta_id', userId),
      admin.from('forum_posts').delete().eq('usta_id', userId),
      admin.from('marketplace_products').delete().eq('seller_id', userId),
      admin.from('showcase_items').delete().eq('usta_id', userId),
      admin.from('job_sharing_posts').delete().eq('usta_id', userId),
    ];
    const cleanupResults = await Promise.all(cleanupSteps);
    const cleanupError = cleanupResults.find(result => result.error)?.error;
    if (cleanupError) throw cleanupError;

    const { error: profileDeleteError } = await admin.from('users').delete().eq('id', userId);
    if (profileDeleteError) throw profileDeleteError;

    // Publish only after the destructive operation has completed. Clients
    // with a still-cached access token receive this Realtime row and clear
    // their local session immediately.
    const { error: revocationError } = await admin.from('account_revocations').insert({
      user_id: userId,
      revoked_by: caller.id,
      reason: 'ADMIN_DELETED',
    });
    if (revocationError) throw revocationError;

    return reply({ success: true, deletedUserId: userId });
  } catch (error) {
    console.error('Admin hard delete failed:', error);
    return reply({ error: 'ADMIN_DELETE_FAILED', message: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
