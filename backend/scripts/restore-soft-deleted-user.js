require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2]?.trim().toLowerCase();
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
if (!email) throw new Error('Usage: node scripts/restore-soft-deleted-user.js user@example.com');

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
};

async function request(path, options = {}) {
  const response = await fetch(`${url}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`HTTP_${response.status}:${JSON.stringify(body)}`);
  return body;
}

async function main() {
  const rows = await request(`/rest/v1/users?email=eq.${encodeURIComponent(email)}&select=id,full_name,email,user_type,is_active,is_banned,deleted_at`);
  const user = rows?.[0];
  if (!user) throw new Error('PUBLIC_USER_NOT_FOUND');
  if (user.user_type !== 'ELECTRICIAN') throw new Error('TARGET_IS_NOT_ELECTRICIAN');
  if (user.is_banned) throw new Error('BANNED_USER_WILL_NOT_BE_RESTORED');

  const authUser = await request(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`);
  if (!authUser?.id) throw new Error('AUTH_USER_NOT_FOUND');

  const restored = await request(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      is_active: true,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    }),
  });

  const result = restored?.[0];
  if (!result || result.is_active !== true || result.deleted_at !== null) {
    throw new Error('RESTORE_VERIFICATION_FAILED');
  }
  console.log(JSON.stringify({ id: result.id, name: result.full_name, active: result.is_active, deletedAt: result.deleted_at, authExists: true }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
