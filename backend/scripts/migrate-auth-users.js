require('dotenv').config();

const crypto = require('crypto');
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
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = body?.msg || body?.message || body?.error_description || `HTTP_${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

async function listAuthUsers() {
  const result = await request('/auth/v1/admin/users?page=1&per_page=1000');
  return Array.isArray(result) ? result : result.users || [];
}

function makeTemporaryPassword() {
  return `${crypto.randomBytes(36).toString('base64url')}Aa1!`;
}

async function createAuthUser(user) {
  const bcryptHash = /^\$2[aby]\$/.test(user.password_hash || '');
  const payload = {
    email: user.email,
    email_confirm: true,
    user_metadata: {
      full_name: user.full_name,
      user_type: user.user_type,
      phone: user.phone || undefined,
      accepted_legal_version: user.accepted_legal_version || undefined,
      marketing_allowed: Boolean(user.marketing_allowed),
    },
    app_metadata: {
      legacy_user_id: user.id,
      legacy_migration: true,
      requires_password_reset: !bcryptHash,
    },
  };

  if (bcryptHash) payload.password_hash = user.password_hash;
  else payload.password = makeTemporaryPassword();

  const result = await request('/auth/v1/admin/users', {
    method: 'POST',
    body: serialize(payload),
  });

  return { authUser: result.user || result, passwordPreserved: bcryptHash };
}

async function upsertPublicUsers(rows) {
  const response = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: serialize(rows),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PUBLIC_USERS_UPSERT_FAILED:${response.status}:${body}`);
  }
}

async function main() {
  const sourceUsers = await source.$queryRawUnsafe(
    'select * from public.users order by created_at, id',
  );
  const existingAuthUsers = await listAuthUsers();
  const byLegacyId = new Map(
    existingAuthUsers
      .filter((user) => user.app_metadata?.legacy_user_id)
      .map((user) => [user.app_metadata.legacy_user_id, user]),
  );
  const byEmail = new Map(
    existingAuthUsers
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user]),
  );

  const mapping = new Map();
  let created = 0;
  let reused = 0;
  let passwordsPreserved = 0;
  let passwordResetsRequired = 0;

  for (const sourceUser of sourceUsers) {
    let authUser = byLegacyId.get(sourceUser.id);

    if (!authUser) {
      const sameEmail = byEmail.get(sourceUser.email.toLowerCase());
      if (sameEmail) {
        throw new Error(`AUTH_EMAIL_CONFLICT_FOR_LEGACY_ID:${sourceUser.id}`);
      }

      const result = await createAuthUser(sourceUser);
      authUser = result.authUser;
      created += 1;
      if (result.passwordPreserved) passwordsPreserved += 1;
      else passwordResetsRequired += 1;
    } else {
      reused += 1;
      if (authUser.app_metadata?.requires_password_reset) passwordResetsRequired += 1;
      else passwordsPreserved += 1;
    }

    if (!authUser?.id) throw new Error(`AUTH_USER_ID_MISSING:${sourceUser.id}`);
    mapping.set(sourceUser.id, authUser.id);
  }

  const publicUsers = sourceUsers.map((user) => ({
    ...user,
    id: mapping.get(user.id),
    password_hash: null,
    push_token: null,
  }));

  await upsertPublicUsers(publicUsers);

  console.log(`source_users=${sourceUsers.length}`);
  console.log(`auth_users_created=${created}`);
  console.log(`auth_users_reused=${reused}`);
  console.log(`passwords_preserved=${passwordsPreserved}`);
  console.log(`password_resets_required=${passwordResetsRequired}`);
  console.log(`public_users_upserted=${publicUsers.length}`);
}

main()
  .catch((error) => {
    console.error(`AUTH_MIGRATION_ERROR:${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => source.$disconnect());
