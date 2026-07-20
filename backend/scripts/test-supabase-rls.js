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
const createdAuthUsers = [];
const createdPublicUsers = [];
const testJobId = crypto.randomUUID();
const forbiddenLocationId = crypto.randomUUID();
const storagePaths = [];
const results = [];

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

async function createUser(label) {
  const email = `rls-${label}-${runId}@example.com`;
  const { response, body } = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `RLS Test ${label}`, user_type: 'CITIZEN' },
      app_metadata: { automated_rls_test: true },
    }),
  });
  if (!response.ok || !body?.id) throw new Error(`CREATE_TEST_USER_${label}_FAILED:${response.status}`);
  createdAuthUsers.push(body.id);
  createdPublicUsers.push(body.id);
  return { id: body.id, email };
}

async function signIn(email) {
  const { response, body } = await fetchJson(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: { apikey: publishableKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    },
  );
  if (!response.ok || !body?.access_token) throw new Error(`TEST_SIGN_IN_FAILED:${response.status}`);
  return body.access_token;
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

async function cleanup() {
  await admin(`/rest/v1/job_posts?id=eq.${encodeURIComponent(testJobId)}`, { method: 'DELETE' });
  await admin(`/rest/v1/locations?id=eq.${encodeURIComponent(forbiddenLocationId)}`, { method: 'DELETE' });

  for (const { bucket, objectPath } of storagePaths) {
    await admin(`/storage/v1/object/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`, {
      method: 'DELETE',
    });
  }

  for (const id of createdPublicUsers) {
    await admin(`/rest/v1/users?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
  for (const id of createdAuthUsers) {
    await admin(`/auth/v1/admin/users/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}

async function main() {
  const userA = await createUser('a');
  const userB = await createUser('b');
  const tokenA = await signIn(userA.email);
  const tokenB = await signIn(userB.email);

  const ownProfile = await asUser(tokenA, `/rest/v1/users?id=eq.${userA.id}&select=id,email`);
  record('own_profile_read', ownProfile.response.ok && ownProfile.body?.length === 1);

  const otherProfile = await asUser(tokenA, `/rest/v1/users?id=eq.${userB.id}&select=id,email`);
  record('other_private_profile_hidden', otherProfile.response.ok && otherProfile.body?.length === 0);

  const otherUpdate = await asUser(tokenA, `/rest/v1/users?id=eq.${userB.id}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ full_name: 'Forbidden RLS Update' }),
  });
  record('other_profile_update_blocked', otherUpdate.response.ok && otherUpdate.body?.length === 0);

  const forbiddenJob = await asUser(tokenA, '/rest/v1/job_posts', {
    method: 'POST',
    body: JSON.stringify({
      id: crypto.randomUUID(),
      citizen_id: userB.id,
      title: 'RLS forbidden job',
      description: 'Automated RLS test',
      category: 'test',
      location: { city: 'Test' },
      images: [],
    }),
  });
  record('job_for_other_user_blocked', !forbiddenJob.response.ok);

  const ownJob = await asUser(tokenA, '/rest/v1/job_posts', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      id: testJobId,
      citizen_id: userA.id,
      title: 'RLS own job',
      description: 'Automated RLS test',
      category: 'test',
      location: { city: 'Test' },
      images: [],
    }),
  });
  record('own_job_insert_allowed', ownJob.response.ok && ownJob.body?.length === 1);

  const visibleJob = await asUser(tokenB, `/rest/v1/job_posts?id=eq.${testJobId}&select=id`);
  record('open_job_visible_to_other_user', visibleJob.response.ok && visibleJob.body?.length === 1);

  const forbiddenLocation = await asUser(tokenA, '/rest/v1/locations', {
    method: 'POST',
    body: JSON.stringify({
      id: forbiddenLocationId,
      user_id: userB.id,
      address: 'RLS test address',
      city: 'Test',
      district: 'Test',
      latitude: 0,
      longitude: 0,
    }),
  });
  record('location_for_other_user_blocked', !forbiddenLocation.response.ok);

  const tinyJpeg = Buffer.from('/9j/4AAQSkZJRgABAQAAAQABAAD/2Q==', 'base64');
  const forbiddenPath = `${userB.id}/rls-test.jpg`;
  const forbiddenUpload = await asUser(tokenA, `/storage/v1/object/avatars/${forbiddenPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
    body: tinyJpeg,
  });
  storagePaths.push({ bucket: 'avatars', objectPath: forbiddenPath });
  record('other_storage_folder_blocked', !forbiddenUpload.response.ok);

  const ownPath = `${userA.id}/rls-test.jpg`;
  const ownUpload = await asUser(tokenA, `/storage/v1/object/avatars/${ownPath}`, {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg', 'x-upsert': 'true' },
    body: tinyJpeg,
  });
  storagePaths.push({ bucket: 'avatars', objectPath: ownPath });
  record('own_storage_folder_allowed', ownUpload.response.ok);

  const failures = results.filter((result) => !result.passed);
  if (failures.length) throw new Error(`RLS_TEST_FAILURES:${failures.length}`);
}

main()
  .catch((error) => {
    console.error(`RLS_TEST_ERROR:${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    console.log('cleanup=COMPLETE');
  });
