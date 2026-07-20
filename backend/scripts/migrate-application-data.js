require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const source = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

const serialize = (value) =>
  JSON.stringify(value, (_key, item) =>
    typeof item === 'bigint' ? item.toString() : item,
  );

async function request(path, options = {}) {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message = body?.message || body?.msg || body?.hint || body || `HTTP_${response.status}`;
    throw new Error(`${path}:${message}`);
  }

  return body;
}

async function loadUserMapping() {
  const result = await request('/auth/v1/admin/users?page=1&per_page=1000');
  const authUsers = Array.isArray(result) ? result : result.users || [];
  const mapping = new Map();

  for (const authUser of authUsers) {
    const legacyId = authUser.app_metadata?.legacy_user_id;
    if (legacyId) mapping.set(legacyId, authUser.id);
  }

  return mapping;
}

async function readTable(table) {
  if (!/^[a-z_]+$/.test(table)) throw new Error(`INVALID_TABLE:${table}`);
  return source.$queryRawUnsafe(`select * from public."${table}" order by id`);
}

async function upsert(table, rows, conflict = 'id') {
  if (rows.length === 0) {
    console.log(`${table}=0`);
    return;
  }

  const batchSize = 100;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await request(`/rest/v1/${table}?on_conflict=${encodeURIComponent(conflict)}`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: serialize(batch),
    });
  }

  console.log(`${table}=${rows.length}`);
}

function createMapper(mapping) {
  const required = (legacyId, field) => {
    const mapped = mapping.get(legacyId);
    if (!mapped) throw new Error(`USER_MAPPING_MISSING:${field}:${legacyId}`);
    return mapped;
  };

  const optional = (legacyId, field) =>
    legacyId == null ? null : required(legacyId, field);

  const knownOrOriginal = (legacyId) =>
    legacyId == null ? null : mapping.get(legacyId) || legacyId;

  return { required, optional, knownOrOriginal };
}

function normalizeLocations(rows) {
  const defaultSeen = new Set();
  return rows.map((row) => {
    if (!row.is_default || !row.is_active) return row;
    if (defaultSeen.has(row.user_id)) return { ...row, is_default: false };
    defaultSeen.add(row.user_id);
    return row;
  });
}

async function main() {
  const userMapping = await loadUserMapping();
  if (userMapping.size !== 16) {
    throw new Error(`EXPECTED_16_USER_MAPPINGS_GOT_${userMapping.size}`);
  }
  const map = createMapper(userMapping);

  const profiles = (await readTable('electrician_profiles')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'electrician_profiles.user_id'),
  }));
  await upsert('electrician_profiles', profiles, 'user_id');

  const consents = (await readTable('user_consents')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'user_consents.user_id'),
  }));
  await upsert('user_consents', consents);

  const jobs = (await readTable('job_posts')).map((row) => ({
    ...row,
    citizen_id: map.required(row.citizen_id, 'job_posts.citizen_id'),
    assigned_electrician_id: map.optional(
      row.assigned_electrician_id,
      'job_posts.assigned_electrician_id',
    ),
  }));
  await upsert('job_posts', jobs);

  const bids = (await readTable('bids')).map((row) => ({
    ...row,
    electrician_id: map.required(row.electrician_id, 'bids.electrician_id'),
  }));
  await upsert('bids', bids);

  const conversations = (await readTable('conversations')).map((row) => ({
    ...row,
    participant_1_id: map.required(row.participant_1_id, 'conversations.participant_1_id'),
    participant_2_id: map.required(row.participant_2_id, 'conversations.participant_2_id'),
  }));
  await upsert('conversations', conversations);

  const messages = (await readTable('messages')).map((row) => ({
    ...row,
    sender_id: map.required(row.sender_id, 'messages.sender_id'),
    recipient_id: map.required(row.recipient_id, 'messages.recipient_id'),
  }));
  await upsert('messages', messages);

  const reviews = (await readTable('reviews')).map((row) => ({
    ...row,
    reviewer_id: map.required(row.reviewer_id, 'reviews.reviewer_id'),
    reviewed_id: map.required(row.reviewed_id, 'reviews.reviewed_id'),
  }));
  await upsert('reviews', reviews);

  const payments = (await readTable('payments')).map((row) => ({
    ...row,
    payer_id: map.required(row.payer_id, 'payments.payer_id'),
    payee_id: map.required(row.payee_id, 'payments.payee_id'),
  }));
  await upsert('payments', payments);
  await upsert('escrow_accounts', await readTable('escrow_accounts'));

  const credits = (await readTable('credits')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'credits.user_id'),
  }));
  await upsert('credits', credits);

  const notifications = (await readTable('notifications')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'notifications.user_id'),
  }));
  await upsert('notifications', notifications);

  const locations = normalizeLocations(
    (await readTable('locations')).map((row) => ({
      ...row,
      user_id: map.required(row.user_id, 'locations.user_id'),
    })),
  );
  await upsert('locations', locations);

  const tickets = (await readTable('support_tickets')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'support_tickets.user_id'),
    assigned_to: map.knownOrOriginal(row.assigned_to),
  }));
  await upsert('support_tickets', tickets);

  const ticketMessages = (await readTable('support_ticket_messages')).map((row) => ({
    ...row,
    sender_id: map.required(row.sender_id, 'support_ticket_messages.sender_id'),
  }));
  await upsert('support_ticket_messages', ticketMessages);

  const favorites = (await readTable('favorites')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'favorites.user_id'),
    electrician_id: map.required(row.electrician_id, 'favorites.electrician_id'),
  }));
  await upsert('favorites', favorites);

  const reports = (await readTable('reports')).map((row) => ({
    ...row,
    reporter_id: map.required(row.reporter_id, 'reports.reporter_id'),
    reported_id: map.required(row.reported_id, 'reports.reported_id'),
    resolved_by: map.knownOrOriginal(row.resolved_by),
  }));
  await upsert('reports', reports);

  const blocks = (await readTable('blocks')).map((row) => ({
    ...row,
    blocker_id: map.required(row.blocker_id, 'blocks.blocker_id'),
    blocked_id: map.required(row.blocked_id, 'blocks.blocked_id'),
  }));
  await upsert('blocks', blocks);

  const calendarEvents = (await readTable('calendar_events')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'calendar_events.user_id'),
  }));
  await upsert('calendar_events', calendarEvents);

  const ledgerEntries = (await readTable('ledger_entries')).map((row) => ({
    ...row,
    user_id: map.required(row.user_id, 'ledger_entries.user_id'),
  }));
  await upsert('ledger_entries', ledgerEntries);

  const products = (await readTable('marketplace_products')).map((row) => ({
    ...row,
    seller_id: map.knownOrOriginal(row.seller_id),
  }));
  await upsert('marketplace_products', products);

  const showcase = (await readTable('showcase_items')).map((row) => ({
    ...row,
    usta_id: map.knownOrOriginal(row.usta_id),
  }));
  await upsert('showcase_items', showcase);

  const forumPosts = (await readTable('forum_posts')).map((row) => ({
    ...row,
    usta_id: map.knownOrOriginal(row.usta_id),
  }));
  await upsert('forum_posts', forumPosts);

  const forumComments = (await readTable('forum_comments')).map((row) => ({
    ...row,
    usta_id: map.knownOrOriginal(row.usta_id),
  }));
  await upsert('forum_comments', forumComments);

  const sharedJobs = (await readTable('job_sharing_posts')).map((row) => ({
    ...row,
    usta_id: map.knownOrOriginal(row.usta_id),
  }));
  await upsert('job_sharing_posts', sharedJobs);

  await upsert('legal_documents', await readTable('legal_documents'));
}

main()
  .catch((error) => {
    console.error(`APPLICATION_MIGRATION_ERROR:${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => source.$disconnect());
