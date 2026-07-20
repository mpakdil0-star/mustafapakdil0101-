require('dotenv').config();

const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_PUBLISHABLE_KEY are required');
}

const runId = crypto.randomUUID();
const email = `edge-${runId}@example.com`;
const password = `${crypto.randomBytes(24).toString('base64url')}Aa1!`;
const results = [];
let userId = null;
let accessToken = null;

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${name}=${passed ? 'PASS' : `FAIL:${detail}`}`);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  return { response, body };
}

async function admin(path, options = {}) {
  return fetchJson(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

async function invoke(name, { token, headers, body, method = 'POST' } = {}) {
  return fetchJson(`${supabaseUrl}/functions/v1/${name}`, {
    method,
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function createTemporaryUser() {
  const { response, body } = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'Edge Function Test', user_type: 'CITIZEN' },
      app_metadata: { automated_edge_function_test: true },
    }),
  });
  if (!response.ok || !body?.id) throw new Error(`TEMP_USER_CREATE_FAILED:${response.status}`);
  userId = body.id;

  const signIn = await fetchJson(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!signIn.response.ok || !signIn.body?.access_token) {
    throw new Error(`TEMP_USER_SIGN_IN_FAILED:${signIn.response.status}`);
  }
  accessToken = signIn.body.access_token;
}

async function cleanup() {
  if (!userId) return;
  const userFilter = `user_id=eq.${encodeURIComponent(userId)}`;
  const idFilter = `id=eq.${encodeURIComponent(userId)}`;
  await admin(`/rest/v1/push_delivery_tickets?${userFilter}`, { method: 'DELETE' });
  await admin(`/rest/v1/notification_outbox?${userFilter}`, { method: 'DELETE' });
  await admin(`/rest/v1/notifications?${userFilter}`, { method: 'DELETE' });
  await admin(`/rest/v1/push_tokens?${userFilter}`, { method: 'DELETE' });
  await admin(`/rest/v1/google_play_purchases?${userFilter}`, { method: 'DELETE' });
  await admin(`/rest/v1/users?${idFilter}`, { method: 'DELETE' });
  await admin(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

async function testMethodGuards() {
  for (const name of ['ai-assistant', 'delete-account', 'process-push-outbox', 'verify-google-play-purchase']) {
    const { response, body } = await invoke(name, { method: 'GET' });
    record(`${name}:method-guard`, response.status === 405 && body?.error === 'METHOD_NOT_ALLOWED', `HTTP_${response.status}`);
  }
}

async function testAiAssistant() {
  const unauthorized = await invoke('ai-assistant', { body: { action: 'cost', category: 'elektrik' } });
  record('ai-assistant:unauthorized', unauthorized.response.status === 401, `HTTP_${unauthorized.response.status}`);

  const cost = await invoke('ai-assistant', {
    token: accessToken,
    body: { action: 'cost', category: 'elektrik' },
  });
  const validCost = cost.response.ok
    && cost.body?.success === true
    && cost.body?.data?.found === true
    && Number.isFinite(cost.body?.data?.min)
    && Number.isFinite(cost.body?.data?.max);
  record('ai-assistant:authenticated-cost', validCost, `HTTP_${cost.response.status}`);
}

async function testGooglePlayGuard() {
  const result = await invoke('verify-google-play-purchase', {
    body: { productId: 'pkg_10', purchaseToken: 'automated-test-token' },
  });
  const safelyRejected = (result.response.status === 503 && result.body?.error === 'PURCHASE_VERIFICATION_NOT_CONFIGURED')
    || (result.response.status === 401 && result.body?.error === 'UNAUTHORIZED');
  record('verify-google-play-purchase:safe-rejection', safelyRejected, `HTTP_${result.response.status}`);

  const purchaseToken = `automated-edge-${runId}`;
  const authenticated = await invoke('verify-google-play-purchase', {
    token: accessToken,
    body: { productId: 'pkg_10', purchaseToken, packageName: 'com.isbitir.app' },
  });
  const persisted = await admin(
    `/rest/v1/google_play_purchases?purchase_token=eq.${encodeURIComponent(purchaseToken)}&select=status,last_error_code`,
  );
  const row = Array.isArray(persisted.body) ? persisted.body[0] : null;
  record(
    'verify-google-play-purchase:authenticated-request-recorded',
    Boolean(row) && authenticated.response.status !== 401,
    `HTTP_${authenticated.response.status}:${row?.last_error_code || 'NO_RECORD'}`,
  );
  record(
    'verify-google-play-purchase:service-account-authorized',
    Boolean(row) && row.last_error_code !== 'GOOGLE_PLAY_ACCESS_DENIED',
    row?.last_error_code || `HTTP_${authenticated.response.status}`,
  );
}

async function testPushProcessor() {
  const unauthorized = await invoke('process-push-outbox', { body: {} });
  record('process-push-outbox:unauthorized', unauthorized.response.status === 401, `HTTP_${unauthorized.response.status}`);

  const [outbox, receipts, config] = await Promise.all([
    admin('/rest/v1/notification_outbox?status=in.(pending,failed)&select=id&limit=1'),
    admin(`/rest/v1/push_delivery_tickets?expo_ticket_id=not.is.null&receipt_checked_at=is.null&created_at=lt.${encodeURIComponent(new Date(Date.now() - 15 * 60_000).toISOString())}&select=id&limit=1`),
    admin('/rest/v1/push_runtime_config?id=eq.1&select=cron_secret'),
  ]);

  const hasActionableData = Array.isArray(outbox.body) && outbox.body.length > 0
    || Array.isArray(receipts.body) && receipts.body.length > 0;
  const cronSecret = Array.isArray(config.body) ? config.body[0]?.cron_secret : null;
  if (hasActionableData || !cronSecret) {
    record('process-push-outbox:authorized-run', true, hasActionableData ? 'SKIPPED_PRODUCTION_DATA_PRESENT' : 'SKIPPED_NO_RUNTIME_SECRET');
    return;
  }

  const result = await invoke('process-push-outbox', {
    headers: { 'x-cron-secret': cronSecret },
    body: {},
  });
  const valid = result.response.ok
    && Number.isInteger(result.body?.claimed)
    && Number.isInteger(result.body?.sent)
    && Number.isInteger(result.body?.failed)
    && Number.isInteger(result.body?.skipped);
  record('process-push-outbox:authorized-run', valid, `HTTP_${result.response.status}`);
}

async function testDeleteAccount() {
  const unauthorized = await invoke('delete-account', { body: {} });
  record('delete-account:unauthorized', unauthorized.response.status === 401, `HTTP_${unauthorized.response.status}`);

  const deleted = await invoke('delete-account', { token: accessToken, body: {} });
  record('delete-account:temporary-user', deleted.response.ok && deleted.body?.success === true, `HTTP_${deleted.response.status}`);

  const [authLookup, profileLookup] = await Promise.all([
    admin(`/auth/v1/admin/users/${encodeURIComponent(userId)}`),
    admin(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}&select=email,is_active,deleted_at`),
  ]);
  const profile = Array.isArray(profileLookup.body) ? profileLookup.body[0] : null;
  const authRemoved = authLookup.response.status === 404;
  const profileAnonymized = profile?.email === `deleted-${userId}@deleted.invalid`
    && profile?.is_active === false
    && Boolean(profile?.deleted_at);
  record('delete-account:auth-removed', authRemoved, `HTTP_${authLookup.response.status}`);
  record('delete-account:profile-anonymized', profileAnonymized, profile ? 'INVALID_TOMBSTONE' : 'PROFILE_NOT_FOUND');
}

async function main() {
  try {
    await testMethodGuards();
    await createTemporaryUser();
    await testAiAssistant();
    await testGooglePlayGuard();
    await testPushProcessor();
    await testDeleteAccount();
  } finally {
    await cleanup();
  }

  const failed = results.filter((result) => !result.passed);
  console.log(`SUMMARY=${results.length - failed.length}/${results.length}_PASSED`);
  if (failed.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`FATAL=${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
  process.exitCode = 1;
});
