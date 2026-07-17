import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

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
    const { data: callerProfile, error: callerProfileError } = await admin
      .from('users')
      .select('id,user_type,is_active,is_banned,deleted_at')
      .eq('id', caller.id)
      .maybeSingle();
    if (callerProfileError) throw callerProfileError;
    if (
      callerProfile?.user_type !== 'ADMIN'
      || !callerProfile.is_active
      || callerProfile.is_banned
      || callerProfile.deleted_at
    ) {
      return reply({ error: 'ADMIN_REQUIRED' }, 403);
    }

    const body = await request.json();
    if (body?.action === 'end') {
      if (typeof body.sessionId !== 'string') return reply({ error: 'SESSION_ID_REQUIRED' }, 400);
      const { error } = await admin
        .from('admin_impersonation_audit')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', body.sessionId)
        .eq('admin_user_id', caller.id)
        .is('ended_at', null);
      if (error) throw error;
      return reply({ success: true });
    }

    const targetUserId = body?.userId;
    if (typeof targetUserId !== 'string' || !/^[0-9a-f-]{36}$/i.test(targetUserId)) {
      return reply({ error: 'INVALID_USER_ID' }, 400);
    }
    if (targetUserId === caller.id) return reply({ error: 'CANNOT_IMPERSONATE_SELF' }, 400);

    const { data: target, error: targetError } = await admin
      .from('users')
      .select('id,email,user_type,is_active,is_banned,deleted_at')
      .eq('id', targetUserId)
      .maybeSingle();
    if (targetError) throw targetError;
    if (!target) return reply({ error: 'USER_NOT_FOUND' }, 404);
    if (target.user_type === 'ADMIN') return reply({ error: 'CANNOT_IMPERSONATE_ADMIN' }, 403);
    if (!target.is_active || target.is_banned || target.deleted_at) {
      return reply({ error: 'TARGET_ACCOUNT_INACTIVE' }, 409);
    }

    if (body?.dryRun === true) {
      return reply({ success: true, canImpersonate: true });
    }

    const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    const { data: audit, error: auditError } = await admin
      .from('admin_impersonation_audit')
      .insert({
        admin_user_id: caller.id,
        target_user_id: target.id,
        expires_at: expiresAt,
      })
      .select('id')
      .single();
    if (auditError) throw auditError;

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email: target.email,
    });
    if (linkError) throw linkError;

    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) throw new Error('IMPERSONATION_TOKEN_NOT_CREATED');

    return reply({
      success: true,
      tokenHash,
      expiresAt,
      sessionId: audit.id,
    });
  } catch (error) {
    console.error('Admin impersonation failed:', error);
    return reply({
      error: 'ADMIN_IMPERSONATION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});
