require('dotenv').config();

const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const runId = crypto.randomUUID();
const email = `push-cron-${runId}@example.com`;
const password = `${crypto.randomBytes(24).toString('base64url')}Aa1!`;
let userId = null;
let outboxId = null;

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

async function cleanup() {
  if (outboxId) {
    await admin(`/rest/v1/push_delivery_tickets?outbox_id=eq.${encodeURIComponent(outboxId)}`, { method: 'DELETE' });
    await admin(`/rest/v1/notification_outbox?id=eq.${encodeURIComponent(outboxId)}`, { method: 'DELETE' });
  }
  if (userId) {
    await admin(`/rest/v1/push_tokens?user_id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
    await admin(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' });
    await admin(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
  }
}

async function main() {
  try {
    const created = await admin('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Push Cron Test', user_type: 'CITIZEN' },
        app_metadata: { automated_push_cron_test: true },
      }),
    });
    if (!created.response.ok || !created.body?.id) {
      throw new Error(`CREATE_USER_FAILED_HTTP_${created.response.status}`);
    }
    userId = created.body.id;
    console.log('push-cron:temporary-user=PASS');

    const inserted = await admin('/rest/v1/notification_outbox', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: userId,
        event_type: 'AUTOMATED_PUSH_CRON_TEST',
        payload: { automated_test: true },
      }),
    });
    const row = Array.isArray(inserted.body) ? inserted.body[0] : inserted.body;
    if (!inserted.response.ok || !row?.id) {
      throw new Error(`CREATE_OUTBOX_FAILED_HTTP_${inserted.response.status}`);
    }
    outboxId = row.id;
    console.log('push-cron:pending-outbox-created=PASS');

    const deadline = Date.now() + 100_000;
    let finalRow = row;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const current = await admin(
        `/rest/v1/notification_outbox?id=eq.${encodeURIComponent(outboxId)}&select=status,attempt_count,processed_at,last_error`
      );
      if (!current.response.ok) throw new Error(`POLL_OUTBOX_FAILED_HTTP_${current.response.status}`);
      finalRow = Array.isArray(current.body) ? current.body[0] : current.body;
      if (finalRow?.status === 'sent' || finalRow?.status === 'failed') break;
    }

    const processedByCron = finalRow?.status === 'sent'
      && finalRow?.attempt_count >= 1
      && Boolean(finalRow?.processed_at)
      && finalRow?.last_error === 'NO_ACTIVE_DEVICE';
    if (!processedByCron) {
      throw new Error(`CRON_NOT_PROCESSED:${finalRow?.status || 'MISSING'}:${finalRow?.last_error || 'NO_ERROR'}`);
    }
    console.log('push-cron:automatic-edge-invocation=PASS');
    console.log('push-cron:no-device-skip-handled=PASS');
    console.log('SUMMARY=4/4_PASSED');
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(`FATAL=${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
  process.exitCode = 1;
});
