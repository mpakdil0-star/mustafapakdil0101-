require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const { createClient } = require(path.join(
  __dirname,
  '../../mobile/node_modules/@supabase/supabase-js'
));
const WebSocket = require(path.join(__dirname, '../../mobile/node_modules/ws'));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_PUBLISHABLE_KEY are required');
}

const runId = crypto.randomUUID();
const email = `realtime-${runId}@example.com`;
const password = `${crypto.randomBytes(24).toString('base64url')}Aa1!`;
const notificationId = crypto.randomUUID();
let userId = null;
let client = null;
let channel = null;

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { response, body };
}

async function admin(pathname, options = {}) {
  return fetchJson(`${supabaseUrl}${pathname}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

function withTimeout(promise, label, timeoutMs = 20_000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label}_TIMEOUT`)), timeoutMs);
    }),
  ]);
}

async function cleanup() {
  if (client && channel) await client.removeChannel(channel).catch(() => {});
  if (client) client.realtime.disconnect();
  if (!userId) return;

  await admin(`/rest/v1/notifications?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await admin(`/rest/v1/notification_outbox?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await admin(`/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await admin(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
  await admin(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

async function main() {
  try {
    const created = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Realtime Test', user_type: 'CITIZEN' },
        app_metadata: { automated_realtime_test: true },
      }),
    });
    if (!created.response.ok || !created.body?.id) {
      throw new Error(`CREATE_USER_FAILED_HTTP_${created.response.status}`);
    }
    userId = created.body.id;

    client = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    });
    const { data: signInData, error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    if (!signInData.session?.access_token) throw new Error('ACCESS_TOKEN_MISSING');
    await client.realtime.setAuth(signInData.session.access_token);
    console.log('realtime:authenticated=PASS');

    let resolveEvent;
    const eventReceived = new Promise((resolve) => { resolveEvent = resolve; });
    const subscribed = new Promise((resolve, reject) => {
      channel = client
        .channel(`automated-realtime:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        }, (payload) => resolveEvent(payload))
        .subscribe((status, error) => {
          if (status === 'SUBSCRIBED') resolve();
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            reject(error || new Error(`CHANNEL_${status}`));
          }
        });
    });

    await withTimeout(subscribed, 'SUBSCRIBE');
    console.log('realtime:subscribed=PASS');

    // Give the database change listener a brief moment to become active after
    // the channel reports SUBSCRIBED. This avoids a race on fresh connections.
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    const inserted = await admin('/rest/v1/notifications', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        id: notificationId,
        user_id: userId,
        type: 'AUTOMATED_REALTIME_TEST',
        title: 'Realtime Test',
        message: 'Automated event delivery check',
      }),
    });
    if (!inserted.response.ok) {
      throw new Error(`INSERT_NOTIFICATION_FAILED_HTTP_${inserted.response.status}`);
    }

    const { data: visibleRows, error: visibilityError } = await client
      .from('notifications')
      .select('id,user_id')
      .eq('id', notificationId);
    if (visibilityError || visibleRows?.[0]?.id !== notificationId) {
      throw visibilityError || new Error('NOTIFICATION_NOT_VISIBLE_THROUGH_RLS');
    }
    console.log('realtime:notification-visible-through-rls=PASS');

    const payload = await withTimeout(eventReceived, 'EVENT', 30_000);
    const validEvent = payload?.eventType === 'INSERT'
      && payload?.new?.id === notificationId
      && payload?.new?.user_id === userId;
    if (!validEvent) throw new Error('INVALID_REALTIME_PAYLOAD');
    console.log('realtime:notification-insert-event=PASS');
    console.log('SUMMARY=4/4_PASSED');
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(`FATAL=${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
  process.exitCode = 1;
});
