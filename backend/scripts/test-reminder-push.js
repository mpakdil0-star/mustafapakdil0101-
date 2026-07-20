require('dotenv').config();

const crypto = require('crypto');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const runId = crypto.randomUUID();
const email = `reminder-${runId}@example.com`;
const password = `${crypto.randomBytes(24).toString('base64url')}Aa1!`;
let userId = null;
const results = [];

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${name}=${passed ? 'PASS' : `FAIL:${detail}`}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...options.headers,
    },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) throw new Error(`${path}:HTTP_${response.status}:${typeof body === 'string' ? body : JSON.stringify(body)}`);
  return body;
}

async function cleanup() {
  if (!userId) return;
  const userFilter = `user_id=eq.${encodeURIComponent(userId)}`;
  await request(`/rest/v1/notification_outbox?${userFilter}`, { method: 'DELETE' }).catch(() => {});
  await request(`/rest/v1/notifications?${userFilter}`, { method: 'DELETE' }).catch(() => {});
  await request(`/rest/v1/calendar_events?${userFilter}`, { method: 'DELETE' }).catch(() => {});
  await request(`/rest/v1/ledger_entries?${userFilter}`, { method: 'DELETE' }).catch(() => {});
  await request(`/rest/v1/users?id=eq.${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
  await request(`/auth/v1/admin/users/${encodeURIComponent(userId)}`, { method: 'DELETE' }).catch(() => {});
}

async function main() {
  try {
    const authUser = await request('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: 'Reminder Test', user_type: 'ELECTRICIAN' },
        app_metadata: { automated_reminder_push_test: true },
      }),
    });
    userId = authUser.id;

    const dueAt = new Date(Date.now() - 60_000).toISOString();
    const futureAt = new Date(Date.now() + 24 * 60 * 60_000).toISOString();
    await request('/rest/v1/calendar_events', {
      method: 'POST',
      body: JSON.stringify([
        { user_id: userId, title: 'Due Calendar Test', event_date: dueAt, event_time: '00:00', has_reminder: true, reminder_at: dueAt, status: 'pending' },
        { user_id: userId, title: 'Future Calendar Test', event_date: futureAt, event_time: '00:00', has_reminder: true, reminder_at: futureAt, status: 'pending' },
      ]),
    });
    await request('/rest/v1/ledger_entries', {
      method: 'POST',
      body: JSON.stringify([
        { user_id: userId, person_name: 'Due Ledger Test', amount: 100, type: 'receivable', status: 'pending', due_date: dueAt, event_time: '00:00', has_reminder: true, reminder_at: dueAt },
        { user_id: userId, person_name: 'Future Ledger Test', amount: 100, type: 'payable', status: 'pending', due_date: futureAt, event_time: '00:00', has_reminder: true, reminder_at: futureAt },
      ]),
    });

    const first = await request('/rest/v1/rpc/enqueue_due_reminders', {
      method: 'POST',
      body: JSON.stringify({ batch_size: 100 }),
    });
    record('reminder:first-enqueue-count', first?.totalEnqueued === 2, JSON.stringify(first));

    const notifications = await request(
      `/rest/v1/notifications?user_id=eq.${encodeURIComponent(userId)}&type=in.(calendar_reminder,ledger_reminder)&select=id,type,related_type,action_url`,
    );
    const calendar = notifications.find((item) => item.type === 'calendar_reminder');
    const ledger = notifications.find((item) => item.type === 'ledger_reminder');
    record('reminder:calendar-target', calendar?.related_type === 'CALENDAR_EVENT' && calendar?.action_url === '/tools/calendar');
    record('reminder:ledger-target', ledger?.related_type === 'LEDGER_ENTRY' && ledger?.action_url === '/tools/ledger');

    const outbox = await request(
      `/rest/v1/notification_outbox?user_id=eq.${encodeURIComponent(userId)}&event_type=in.(calendar_reminder,ledger_reminder)&select=id,event_type,status`,
    );
    record('reminder:push-outbox-created', outbox.length === 2, `COUNT_${outbox.length}`);

    const second = await request('/rest/v1/rpc/enqueue_due_reminders', {
      method: 'POST',
      body: JSON.stringify({ batch_size: 100 }),
    });
    record('reminder:idempotent-second-run', second?.totalEnqueued === 0, JSON.stringify(second));

    const futurePending = await request(
      `/rest/v1/calendar_events?user_id=eq.${encodeURIComponent(userId)}&title=eq.Future%20Calendar%20Test&select=reminder_sent_at`,
    );
    record('reminder:future-not-enqueued', futurePending[0]?.reminder_sent_at == null);

    const cronDueAt = new Date(Date.now() - 30_000).toISOString();
    const cronRows = await request('/rest/v1/calendar_events', {
      method: 'POST',
      body: JSON.stringify({
        user_id: userId,
        title: 'Automatic Cron Reminder Test',
        event_date: cronDueAt,
        event_time: '00:00',
        has_reminder: true,
        reminder_at: cronDueAt,
        status: 'pending',
      }),
    });
    const cronEventId = cronRows[0]?.id;
    let cronNotification = null;
    const deadline = Date.now() + 90_000;
    while (!cronNotification && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      const rows = await request(
        `/rest/v1/notifications?user_id=eq.${encodeURIComponent(userId)}&type=eq.calendar_reminder&related_id=eq.${encodeURIComponent(cronEventId)}&select=id`,
      );
      cronNotification = rows[0] || null;
    }
    record('reminder:automatic-minute-cron', Boolean(cronNotification), 'NOT_ENQUEUED_WITHIN_90_SECONDS');
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
