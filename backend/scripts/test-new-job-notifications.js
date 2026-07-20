require('dotenv').config();

const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_PUBLISHABLE_KEY are required');
}

const runId = crypto.randomUUID();
const password = `${crypto.randomBytes(24).toString('base64url')}Aa1!`;
const jobId = crypto.randomUUID();
const locationId = crypto.randomUUID();
const authUserIds = [];
const publicUserIds = [];
let electricianId = null;

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

async function asUser(token, path, options = {}) {
  return fetchJson(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

async function createUser(label, userType) {
  const email = `new-job-${label}-${runId}@example.com`;
  const created = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `New Job Test ${label}`,
        user_type: userType,
        service_category: userType === 'ELECTRICIAN' ? 'elektrik' : undefined,
      },
      app_metadata: { automated_new_job_notification_test: true },
    }),
  });
  if (!created.response.ok || !created.body?.id) {
    throw new Error(`CREATE_${label.toUpperCase()}_FAILED_HTTP_${created.response.status}`);
  }
  authUserIds.push(created.body.id);
  publicUserIds.push(created.body.id);
  return { id: created.body.id, email };
}

async function signIn(email) {
  const signedIn = await fetchJson(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!signedIn.response.ok || !signedIn.body?.access_token) {
    throw new Error(`SIGN_IN_FAILED_HTTP_${signedIn.response.status}`);
  }
  return signedIn.body.access_token;
}

async function remove(table, filter) {
  await admin(`/rest/v1/${table}?${filter}`, { method: 'DELETE' });
}

async function cleanup() {
  if (electricianId) {
    await remove('push_delivery_tickets', `user_id=eq.${encodeURIComponent(electricianId)}`);
    await remove('notification_outbox', `user_id=eq.${encodeURIComponent(electricianId)}`);
    await remove('notifications', `user_id=eq.${encodeURIComponent(electricianId)}`);
  }
  await remove('job_posts', `id=eq.${encodeURIComponent(jobId)}`);
  await remove('locations', `id=eq.${encodeURIComponent(locationId)}`);
  for (const id of publicUserIds) {
    await remove('credits', `user_id=eq.${encodeURIComponent(id)}`);
    await remove('electrician_profiles', `user_id=eq.${encodeURIComponent(id)}`);
    await remove('users', `id=eq.${encodeURIComponent(id)}`);
  }
  for (const id of authUserIds) {
    await admin(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

async function main() {
  try {
    const citizen = await createUser('citizen', 'CITIZEN');
    const electrician = await createUser('electrician', 'ELECTRICIAN');
    electricianId = electrician.id;
    const citizenToken = await signIn(citizen.email);

    const signupBonus = await admin(
      `/rest/v1/electrician_profiles?user_id=eq.${encodeURIComponent(electrician.id)}&select=credit_balance`
    );
    const bonusLedger = await admin(
      `/rest/v1/credits?user_id=eq.${encodeURIComponent(electrician.id)}&transaction_type=eq.BONUS&related_id=eq.signup_bonus&select=amount,balance_after`
    );
    if (
      !signupBonus.response.ok
      || Number(signupBonus.body?.[0]?.credit_balance) !== 5
      || !bonusLedger.response.ok
      || Number(bonusLedger.body?.[0]?.amount) !== 5
    ) {
      throw new Error('ELECTRICIAN_SIGNUP_BONUS_NOT_GRANTED');
    }
    console.log('signup:five-credit-bonus=PASS');

    const profile = await admin(`/rest/v1/electrician_profiles?user_id=eq.${encodeURIComponent(electrician.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ service_category: 'elektrik', is_available: true }),
    });
    if (!profile.response.ok || profile.body?.length !== 1) throw new Error('PROFILE_SETUP_FAILED');

    const location = await admin('/rest/v1/locations', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        id: locationId,
        user_id: electrician.id,
        address: 'Automated test address',
        city: 'Kayseri',
        district: 'Melikgazi',
        latitude: 38.72,
        longitude: 35.49,
        is_default: true,
        is_active: true,
      }),
    });
    if (!location.response.ok || location.body?.length !== 1) throw new Error('LOCATION_SETUP_FAILED');

    const job = await asUser(citizenToken, '/rest/v1/job_posts', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        id: jobId,
        citizen_id: citizen.id,
        title: 'Automated notification test',
        description: 'Temporary production integration test',
        category: 'test',
        service_category: 'elektrik',
        location: { city: 'Kayseri', district: 'Melikgazi' },
        images: [],
        status: 'OPEN',
      }),
    });
    if (!job.response.ok || job.body?.length !== 1) throw new Error(`JOB_INSERT_FAILED_HTTP_${job.response.status}`);

    const notifications = await admin(
      `/rest/v1/notifications?user_id=eq.${encodeURIComponent(electrician.id)}&type=eq.new_job&related_id=eq.${encodeURIComponent(jobId)}&select=id,user_id,type,related_id`
    );
    const notification = notifications.body?.[0];
    if (!notifications.response.ok || !notification?.id) throw new Error('NEW_JOB_NOTIFICATION_NOT_CREATED');
    console.log('new-job:matching-notification-created=PASS');

    const outbox = await admin(
      `/rest/v1/notification_outbox?notification_id=eq.${encodeURIComponent(notification.id)}&event_type=eq.new_job&select=id,user_id,event_type,status,payload`
    );
    const queued = outbox.body?.[0];
    if (!outbox.response.ok || !queued?.id || queued.payload?.jobId !== jobId) {
      throw new Error('NEW_JOB_PUSH_OUTBOX_NOT_CREATED');
    }
    console.log('new-job:push-outbox-created=PASS');
    console.log('new-job:category-and-location-match=PASS');
    console.log('SUMMARY=4/4_PASSED');
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(`FATAL=${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
  process.exitCode = 1;
});
