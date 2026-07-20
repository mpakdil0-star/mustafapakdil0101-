require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const execute = process.argv.includes('--execute');
const root = path.resolve(__dirname, '..');
const source = dotenv.parse(fs.readFileSync(path.join(root, '.env')));
const target = dotenv.parse(fs.readFileSync(path.join(root, '.env.production')));

for (const [label, config] of [['source', source], ['target', target]]) {
  for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']) {
    if (!config[key]) throw new Error(`${label.toUpperCase()}_${key}_MISSING`);
  }
}
if (source.SUPABASE_URL === target.SUPABASE_URL) throw new Error('SOURCE_AND_TARGET_MUST_DIFFER');

const tables = [
  'users',
  'legal_documents',
  'electrician_profiles',
  'user_consents',
  'job_posts',
  'bids',
  'conversations',
  'messages',
  'reviews',
  'payments',
  'escrow_accounts',
  'credits',
  'notifications',
  'locations',
  'support_tickets',
  'support_ticket_messages',
  'favorites',
  'reports',
  'blocks',
  'calendar_events',
  'ledger_entries',
  'marketplace_products',
  'showcase_items',
  'forum_posts',
  'forum_comments',
  'job_sharing_posts',
  'push_tokens',
];

function headers(config, extra = {}) {
  return {
    apikey: config.SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${config.SUPABASE_SERVICE_ROLE_KEY}`,
    ...extra,
  };
}

async function jsonRequest(config, pathname, options = {}) {
  const response = await fetch(`${config.SUPABASE_URL}${pathname}`, {
    ...options,
    headers: headers(config, options.headers),
  });
  const text = await response.text();
  let body = null;
  if (text) {
    try { body = JSON.parse(text); } catch { body = text; }
  }
  if (!response.ok) {
    const detail = body?.message || body?.msg || body?.error_description || body || `HTTP_${response.status}`;
    throw new Error(`${pathname}:${detail}`);
  }
  return body;
}

async function listAuthUsers(config) {
  const users = [];
  for (let page = 1; ; page += 1) {
    const result = await jsonRequest(config, `/auth/v1/admin/users?page=${page}&per_page=100`);
    const batch = Array.isArray(result) ? result : result.users || [];
    users.push(...batch);
    if (batch.length < 100) break;
  }
  return users;
}

async function readTable(config, table) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(`${config.SUPABASE_URL}/rest/v1/${table}?select=*`, {
      headers: headers(config, { Range: `${offset}-${offset + 999}` }),
    });
    if (!response.ok) throw new Error(`READ_${table}_HTTP_${response.status}:${await response.text()}`);
    const batch = await response.json();
    rows.push(...batch);
    if (batch.length < 1000) break;
  }
  return rows;
}

function rewriteValue(value) {
  if (typeof value === 'string') return value.split(source.SUPABASE_URL).join(target.SUPABASE_URL);
  if (Array.isArray(value)) return value.map(rewriteValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, rewriteValue(item)]));
  }
  return value;
}

function collectStorageUrls(value, urls = new Set()) {
  if (typeof value === 'string') {
    if (value.startsWith(`${source.SUPABASE_URL}/storage/v1/object/`)) urls.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectStorageUrls(item, urls));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectStorageUrls(item, urls));
  }
  return urls;
}

function storageLocation(url) {
  const parsed = new URL(url);
  const marker = '/storage/v1/object/';
  let remainder = decodeURIComponent(parsed.pathname.slice(parsed.pathname.indexOf(marker) + marker.length));
  for (const prefix of ['public/', 'authenticated/', 'sign/']) {
    if (remainder.startsWith(prefix)) remainder = remainder.slice(prefix.length);
  }
  const slash = remainder.indexOf('/');
  if (slash < 1) throw new Error(`INVALID_STORAGE_URL:${url}`);
  return { bucket: remainder.slice(0, slash), objectPath: remainder.slice(slash + 1) };
}

function encodeObjectPath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

async function copyStorageObject(url) {
  const { bucket, objectPath } = storageLocation(url);
  const sourceResponse = await fetch(url, { headers: headers(source) });
  if (!sourceResponse.ok) throw new Error(`STORAGE_DOWNLOAD_HTTP_${sourceResponse.status}:${bucket}/${objectPath}`);
  const bytes = await sourceResponse.arrayBuffer();
  const upload = await fetch(`${target.SUPABASE_URL}/storage/v1/object/${bucket}/${encodeObjectPath(objectPath)}`, {
    method: 'POST',
    headers: headers(target, {
      'Content-Type': sourceResponse.headers.get('content-type') || 'application/octet-stream',
      'x-upsert': 'true',
    }),
    body: bytes,
  });
  if (!upload.ok) throw new Error(`STORAGE_UPLOAD_HTTP_${upload.status}:${bucket}/${objectPath}:${await upload.text()}`);
}

async function createMissingAuthUsers(sourceAuth, targetAuth) {
  const byId = new Map(targetAuth.map((user) => [user.id, user]));
  const byEmail = new Map(targetAuth.filter((user) => user.email).map((user) => [user.email.toLowerCase(), user]));
  let created = 0;
  let reused = 0;

  for (const user of sourceAuth) {
    const existing = byId.get(user.id);
    if (existing) {
      if ((existing.email || '').toLowerCase() !== (user.email || '').toLowerCase()) {
        throw new Error(`TARGET_AUTH_ID_EMAIL_MISMATCH:${user.id}`);
      }
      reused += 1;
      continue;
    }
    if (user.email && byEmail.has(user.email.toLowerCase())) {
      throw new Error(`TARGET_AUTH_EMAIL_CONFLICT:${user.email}`);
    }
    if (!user.email) throw new Error(`SOURCE_AUTH_EMAIL_MISSING:${user.id}`);

    const payload = {
      id: user.id,
      email: user.email,
      password: `${crypto.randomBytes(36).toString('base64url')}Aa1!`,
      email_confirm: Boolean(user.email_confirmed_at),
      user_metadata: user.user_metadata || {},
      app_metadata: {
        legacy_source_project: new URL(source.SUPABASE_URL).host.split('.')[0],
        requires_password_reset: true,
      },
    };
    const createdUser = await jsonRequest(target, '/auth/v1/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (createdUser.id !== user.id) throw new Error(`AUTH_ID_NOT_PRESERVED:${user.id}`);
    created += 1;
  }
  return { created, reused };
}

async function upsertTable(table, rows) {
  if (!rows.length) return;
  const conflictColumn = table === 'electrician_profiles' ? 'user_id' : 'id';
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const response = await fetch(`${target.SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflictColumn}`, {
      method: 'POST',
      headers: headers(target, {
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      }),
      body: JSON.stringify(batch),
    });
    if (!response.ok) throw new Error(`UPSERT_${table}_HTTP_${response.status}:${await response.text()}`);
  }
}

async function main() {
  const [sourceAuth, targetAuth] = await Promise.all([listAuthUsers(source), listAuthUsers(target)]);
  const data = new Map();
  for (const table of tables) data.set(table, await readTable(source, table));

  const sourceUsers = data.get('users');
  const sourceAuthIds = new Set(sourceAuth.map((user) => user.id));
  const missingAuth = sourceUsers.filter((user) => !sourceAuthIds.has(user.id));
  if (missingAuth.length) throw new Error(`PUBLIC_USERS_WITHOUT_AUTH:${missingAuth.map((user) => user.id).join(',')}`);

  const storageUrls = new Set();
  for (const rows of data.values()) collectStorageUrls(rows, storageUrls);

  console.log(`MODE=${execute ? 'EXECUTE' : 'PLAN'}`);
  console.log(`source_auth_users=${sourceAuth.length}`);
  console.log(`target_auth_users_before=${targetAuth.length}`);
  for (const table of tables) console.log(`source_${table}=${data.get(table).length}`);
  console.log(`storage_objects_referenced=${storageUrls.size}`);
  console.log('outbox_rows_to_copy=0');
  if (!execute) {
    console.log('PLAN_OK=Use --execute to migrate');
    return;
  }

  const authResult = await createMissingAuthUsers(sourceAuth, targetAuth);
  console.log(`auth_users_created=${authResult.created}`);
  console.log(`auth_users_reused=${authResult.reused}`);

  let copiedObjects = 0;
  for (const url of storageUrls) {
    await copyStorageObject(url);
    copiedObjects += 1;
  }
  console.log(`storage_objects_copied=${copiedObjects}`);

  for (const table of tables) {
    const rows = data.get(table).map((row) => rewriteValue(row));
    if (table === 'users') {
      for (const row of rows) {
        row.password_hash = null;
        row.push_token = null;
      }
    }
    await upsertTable(table, rows);
    console.log(`target_${table}_upserted=${rows.length}`);
  }

  const finalAuth = await listAuthUsers(target);
  const sourceAuthIdList = sourceAuth.map((user) => user.id).sort();
  const targetAuthIdList = finalAuth.map((user) => user.id).sort();
  if (JSON.stringify(targetAuthIdList) !== JSON.stringify(sourceAuthIdList)) {
    throw new Error(`AUTH_ID_SET_MISMATCH:${targetAuthIdList.length}:${sourceAuthIdList.length}`);
  }

  for (const table of tables) {
    const targetRows = await readTable(target, table);
    const sourceIds = data.get(table).map((row) => row.id).sort();
    const targetIds = targetRows.map((row) => row.id).sort();
    if (JSON.stringify(targetIds) !== JSON.stringify(sourceIds)) {
      throw new Error(`TABLE_ID_SET_MISMATCH:${table}:${targetIds.length}:${sourceIds.length}`);
    }
    console.log(`verified_${table}=${targetIds.length}`);
  }
  console.log('MIGRATION_COMPLETE=YES');
  console.log('PASSWORD_RESET_REQUIRED=YES');
}

main().catch((error) => {
  console.error(`PROJECT_MIGRATION_ERROR=${error.message}`);
  process.exitCode = 1;
});
