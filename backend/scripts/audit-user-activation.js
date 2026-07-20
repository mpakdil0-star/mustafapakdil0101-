require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`HTTP_${response.status}:${JSON.stringify(body)}`);
  return body;
}

const isAutomatedTest = (profile, authUser) => {
  const email = String(profile.email || authUser?.email || '').toLowerCase();
  const name = String(profile.full_name || '').toLowerCase();
  const appMetadata = authUser?.app_metadata || {};
  const userMetadata = authUser?.user_metadata || {};
  return email.startsWith('del_')
    || email.endsWith('@example.com')
    || email.endsWith('@test.com')
    || /(^|[._+-])(test|automated|probe|cron|rls|realtime)([._+-]|@)/i.test(email)
    || /automated|new job test|push cron test|edge test|realtime test|rls test/i.test(name)
    || Object.keys(appMetadata).some((key) => /automated|test/i.test(key))
    || Object.keys(userMetadata).some((key) => /automated_test/i.test(key));
};

async function allAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const body = await request(`/auth/v1/admin/users?page=${page}&per_page=100`);
    const batch = body?.users || [];
    users.push(...batch);
    if (batch.length < 100) return users;
  }
}

async function main() {
  const [profiles, authUsers] = await Promise.all([
    request('/rest/v1/users?select=id,full_name,email,user_type,is_active,is_banned,deleted_at&order=created_at.asc'),
    allAuthUsers(),
  ]);
  const authById = new Map(authUsers.map((user) => [user.id, user]));
  const audit = profiles.map((profile) => {
    const authUser = authById.get(profile.id);
    return {
      ...profile,
      authExists: Boolean(authUser),
      automatedTest: isAutomatedTest(profile, authUser),
    };
  });
  const realUsers = audit.filter((user) => !user.automatedTest && user.authExists);
  const candidates = realUsers.filter((user) => !user.is_active || user.deleted_at);

  console.log(`SUMMARY=${JSON.stringify({
    publicUsers: audit.length,
    authUsers: authUsers.length,
    realUsers: realUsers.length,
    automatedTestUsers: audit.filter((user) => user.automatedTest).length,
    inactiveRealUsers: candidates.length,
    mode: apply ? 'APPLY' : 'DRY_RUN',
  })}`);
  console.log(`REAL_USERS=${JSON.stringify(realUsers.map((user) => ({
    id: user.id,
    name: user.full_name,
    email: user.email,
    type: user.user_type,
    active: user.is_active,
    banned: user.is_banned,
    deletedAt: user.deleted_at,
  })))}`);

  if (!apply) return;
  const restored = [];
  for (const user of candidates) {
    if (user.is_banned) {
      console.log(`SKIPPED_BANNED=${user.id}`);
      continue;
    }
    const rows = await request(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ is_active: true, deleted_at: null, updated_at: new Date().toISOString() }),
    });
    if (rows?.[0]?.is_active && rows?.[0]?.deleted_at === null) restored.push(user.id);
  }
  console.log(`RESTORED=${JSON.stringify(restored)}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
