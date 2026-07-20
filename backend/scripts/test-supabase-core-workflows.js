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
const authUserIds = [];
const publicUserIds = [];
let bidId = null;
let conversationId = null;
let messageId = null;
const results = [];

function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`${name}=${passed ? 'PASS' : `FAIL:${detail}`}`);
}

function one(body) {
  return Array.isArray(body) ? body[0] : body;
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

async function rpc(token, name, params) {
  return asUser(token, `/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

async function createUser(label, userType) {
  const email = `core-${label}-${runId}@example.com`;
  const { response, body } = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: `Core Test ${label}`,
        user_type: userType,
        service_category: userType === 'ELECTRICIAN' ? 'elektrik' : undefined,
      },
      app_metadata: { automated_core_workflow_test: true },
    }),
  });
  if (!response.ok || !body?.id) throw new Error(`CREATE_${label}_FAILED:${response.status}`);
  authUserIds.push(body.id);
  publicUserIds.push(body.id);
  return { id: body.id, email };
}

async function signIn(email) {
  const { response, body } = await fetchJson(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok || !body?.access_token) throw new Error(`SIGN_IN_FAILED:${response.status}`);
  return body.access_token;
}

async function deleteWhere(table, query) {
  await admin(`/rest/v1/${table}?${query}`, { method: 'DELETE' });
}

async function cleanup() {
  for (const id of publicUserIds) {
    await deleteWhere('notification_outbox', `user_id=eq.${encodeURIComponent(id)}`);
  }
  if (conversationId) await deleteWhere('messages', `conversation_id=eq.${encodeURIComponent(conversationId)}`);
  if (conversationId) await deleteWhere('conversations', `id=eq.${encodeURIComponent(conversationId)}`);
  await deleteWhere('reviews', `job_post_id=eq.${encodeURIComponent(jobId)}`);
  for (const id of publicUserIds) {
    await deleteWhere('notifications', `user_id=eq.${encodeURIComponent(id)}`);
    await deleteWhere('credits', `user_id=eq.${encodeURIComponent(id)}`);
  }
  await deleteWhere('bids', `job_post_id=eq.${encodeURIComponent(jobId)}`);
  await deleteWhere('job_posts', `id=eq.${encodeURIComponent(jobId)}`);
  for (const id of publicUserIds) {
    await deleteWhere('electrician_profiles', `user_id=eq.${encodeURIComponent(id)}`);
    await deleteWhere('users', `id=eq.${encodeURIComponent(id)}`);
  }
  for (const id of authUserIds) {
    await admin(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

async function main() {
  const citizen = await createUser('citizen', 'CITIZEN');
  const electrician = await createUser('electrician', 'ELECTRICIAN');
  const citizenToken = await signIn(citizen.email);
  const electricianToken = await signIn(electrician.email);

  const creditSetup = await admin(`/rest/v1/electrician_profiles?user_id=eq.${electrician.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ credit_balance: 3 }),
  });
  record('electrician_credit_setup', creditSetup.response.ok && creditSetup.body?.length === 1);

  const createdJob = await asUser(citizenToken, '/rest/v1/job_posts', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id: jobId,
      citizen_id: citizen.id,
      title: 'Core workflow test job',
      description: 'Automated Supabase RPC test',
      category: 'test',
      location: { city: 'Test' },
      images: [],
    }),
  });
  record('job_created', createdJob.response.ok && createdJob.body?.length === 1);

  const bidResult = await rpc(electricianToken, 'create_bid', {
    job_id: jobId,
    bid_amount: 1250,
    validity_days: 7,
    estimated_start_at: null,
    bid_message: 'Test işi için teklif açıklaması',
    cost_items: [{ label: 'Test', amount: 1250 }],
  });
  const bid = one(bidResult.body);
  bidId = bid?.id || null;
  record('bid_created', bidResult.response.ok && Boolean(bidId) && bid.status === 'PENDING');

  const creditAfterBid = await asUser(
    electricianToken,
    `/rest/v1/electrician_profiles?user_id=eq.${electrician.id}&select=credit_balance`,
  );
  record('bid_credit_deducted', creditAfterBid.response.ok && Number(creditAfterBid.body?.[0]?.credit_balance) === 2);

  const unauthorizedAccept = await rpc(electricianToken, 'accept_bid', { bid_id: bidId });
  record('non_owner_cannot_accept_bid', !unauthorizedAccept.response.ok);

  const accepted = await rpc(citizenToken, 'accept_bid', { bid_id: bidId });
  const acceptedBid = one(accepted.body);
  record('bid_accepted', accepted.response.ok && acceptedBid?.status === 'ACCEPTED');

  const inProgress = await asUser(citizenToken, `/rest/v1/job_posts?id=eq.${jobId}&select=status,assigned_electrician_id`);
  record(
    'job_moved_to_in_progress',
    inProgress.response.ok && inProgress.body?.[0]?.status === 'IN_PROGRESS' &&
      inProgress.body?.[0]?.assigned_electrician_id === electrician.id,
  );

  const conversationResult = await rpc(citizenToken, 'find_or_create_conversation', {
    recipient_id: electrician.id,
    job_id: jobId,
  });
  const conversation = one(conversationResult.body);
  conversationId = conversation?.id || null;
  record('conversation_created', conversationResult.response.ok && Boolean(conversationId));

  const messageResult = await rpc(citizenToken, 'send_message', {
    conversation_id: conversationId,
    message_content: 'Otomatik entegrasyon test mesajı',
  });
  const message = one(messageResult.body);
  messageId = message?.id || null;
  record('message_sent', messageResult.response.ok && Boolean(messageId) && message.recipient_id === electrician.id);

  const unread = await asUser(
    electricianToken,
    `/rest/v1/messages?id=eq.${messageId}&select=id,is_read,recipient_id`,
  );
  record('recipient_can_read_message', unread.response.ok && unread.body?.[0]?.is_read === false);

  const markedRead = await rpc(electricianToken, 'mark_conversation_read', {
    conversation_id: conversationId,
  });
  record('conversation_marked_read', markedRead.response.ok);

  const readMessage = await asUser(
    electricianToken,
    `/rest/v1/messages?id=eq.${messageId}&select=is_read,read_at`,
  );
  record('message_read_state_updated', readMessage.response.ok && readMessage.body?.[0]?.is_read === true && Boolean(readMessage.body?.[0]?.read_at));

  const completed = await rpc(citizenToken, 'complete_job', {
    job_id: jobId,
    review_rating: 5,
    review_comment: 'Otomatik test değerlendirmesi',
  });
  const completedJob = one(completed.body);
  record('job_completed', completed.response.ok && completedJob?.status === 'COMPLETED');

  const citizenNotifications = await asUser(
    citizenToken,
    `/rest/v1/notifications?user_id=eq.${citizen.id}&select=type`,
  );
  record(
    'bid_notification_created',
    citizenNotifications.response.ok && citizenNotifications.body?.some((item) => item.type === 'bid_received'),
  );

  const electricianNotifications = await asUser(
    electricianToken,
    `/rest/v1/notifications?user_id=eq.${electrician.id}&select=type,related_type,related_id,action_url`,
  );
  const notificationTypes = electricianNotifications.body?.map((item) => item.type) || [];
  record(
    'lifecycle_notifications_created',
    electricianNotifications.response.ok &&
      notificationTypes.includes('bid_accepted') && notificationTypes.includes('job_completed'),
  );
  record(
    'message_notification_created',
    electricianNotifications.response.ok && electricianNotifications.body?.some((item) =>
      item.type === 'new_message' &&
      item.related_type === 'CONVERSATION' &&
      item.related_id === conversationId &&
      item.action_url === `/messages/${conversationId}`
    ),
  );
  record(
    'review_notification_created',
    electricianNotifications.response.ok && electricianNotifications.body?.some((item) =>
      item.type === 'new_review' &&
      item.related_type === 'JOB' &&
      item.related_id === jobId &&
      item.action_url === `/jobs/${jobId}`
    ),
  );

  const outbox = await admin(
    `/rest/v1/notification_outbox?or=(user_id.eq.${citizen.id},user_id.eq.${electrician.id})&select=id,event_type`,
  );
  const outboxTypes = outbox.body?.map((item) => item.event_type) || [];
  record(
    'push_outbox_created',
    outbox.response.ok && outbox.body?.length >= 5 &&
      outboxTypes.includes('new_message') && outboxTypes.includes('new_review'),
  );

  const failures = results.filter((result) => !result.passed);
  if (failures.length) throw new Error(`CORE_WORKFLOW_FAILURES:${failures.length}`);
}

main()
  .catch((error) => {
    console.error(`CORE_WORKFLOW_ERROR:${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    console.log('cleanup=COMPLETE');
  });
