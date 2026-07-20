require('dotenv').config();

const crypto = require('crypto');
const path = require('path');
const { createClient } = require(path.join(
  __dirname,
  '../../mobile/node_modules/@supabase/supabase-js'
));
const WebSocket = require(path.join(__dirname, '../../mobile/node_modules/ws'));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !serviceRoleKey || !publishableKey) {
  throw new Error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_PUBLISHABLE_KEY are required');
}

const runId = crypto.randomUUID();
const password = `${crypto.randomBytes(24).toString('base64url')}Aa1!`;
const users = [];
const objects = [];
const results = [];
const imageBytes = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2nWQAAAAASUVORK5CYII=',
  'base64'
);

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

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

async function admin(pathname, options = {}) {
  return fetchJson(`${supabaseUrl}${pathname}`, {
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
  const email = `storage-${label}-${runId}@example.com`;
  const created = await admin('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Storage Test ${label}`, user_type: 'CITIZEN' },
      app_metadata: { automated_storage_test: true },
    }),
  });
  if (!created.response.ok || !created.body?.id) {
    throw new Error(`CREATE_${label}_FAILED_HTTP_${created.response.status}`);
  }

  const client = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = { id: created.body.id, client };
  users.push(user);
  return user;
}

async function publicObjectFetch(bucket, objectPath) {
  const { data } = adminClient.storage.from(bucket).getPublicUrl(objectPath);
  return fetch(data.publicUrl);
}

async function cleanup() {
  for (const { bucket, objectPath } of objects) {
    await adminClient.storage.from(bucket).remove([objectPath]).catch(() => {});
  }
  for (const user of users) {
    await user.client.auth.signOut().catch(() => {});
    await admin(`/rest/v1/users?id=eq.${encodeURIComponent(user.id)}`, { method: 'DELETE' });
    await admin(`/auth/v1/admin/users/${encodeURIComponent(user.id)}`, { method: 'DELETE' });
  }
}

async function main() {
  try {
    const owner = await createUser('owner');
    const outsider = await createUser('outsider');
    record('storage:authenticated-users', true);

    const avatarPath = `${owner.id}/${runId}.png`;
    objects.push({ bucket: 'avatars', objectPath: avatarPath });
    const avatarUpload = await owner.client.storage.from('avatars').upload(avatarPath, imageBytes, {
      contentType: 'image/png',
      upsert: false,
    });
    record('storage:avatar-owner-upload', !avatarUpload.error, avatarUpload.error?.message);

    const avatarResponse = await publicObjectFetch('avatars', avatarPath);
    record('storage:avatar-public-read', avatarResponse.ok, `HTTP_${avatarResponse.status}`);

    const intrusionPath = `${owner.id}/intrusion-${runId}.png`;
    objects.push({ bucket: 'avatars', objectPath: intrusionPath });
    const intrusion = await outsider.client.storage.from('avatars').upload(intrusionPath, imageBytes, {
      contentType: 'image/png',
      upsert: false,
    });
    record('storage:cross-user-upload-blocked', Boolean(intrusion.error), intrusion.error ? '' : 'UPLOAD_ALLOWED');

    await outsider.client.storage.from('avatars').remove([avatarPath]);
    const afterCrossDelete = await publicObjectFetch('avatars', avatarPath);
    record('storage:cross-user-delete-blocked', afterCrossDelete.ok, `HTTP_${afterCrossDelete.status}`);

    const jobPath = `${owner.id}/jobs/${runId}.png`;
    objects.push({ bucket: 'job-images', objectPath: jobPath });
    const jobUpload = await owner.client.storage.from('job-images').upload(jobPath, imageBytes, {
      contentType: 'image/png',
      upsert: false,
    });
    record('storage:job-image-owner-upload', !jobUpload.error, jobUpload.error?.message);
    const jobResponse = await publicObjectFetch('job-images', jobPath);
    record('storage:job-image-public-read', jobResponse.ok, `HTTP_${jobResponse.status}`);

    const invalidMimePath = `${owner.id}/invalid-${runId}.txt`;
    objects.push({ bucket: 'avatars', objectPath: invalidMimePath });
    const invalidMime = await owner.client.storage.from('avatars').upload(
      invalidMimePath,
      Buffer.from('not-an-image'),
      { contentType: 'text/plain', upsert: false }
    );
    record('storage:invalid-mime-blocked', Boolean(invalidMime.error), invalidMime.error ? '' : 'UPLOAD_ALLOWED');

    const verificationPath = `${owner.id}/${runId}.png`;
    objects.push({ bucket: 'verification-documents', objectPath: verificationPath });
    const privateUpload = await owner.client.storage.from('verification-documents').upload(
      verificationPath,
      imageBytes,
      { contentType: 'image/png', upsert: false }
    );
    record('storage:private-owner-upload', !privateUpload.error, privateUpload.error?.message);

    const privatePublicResponse = await publicObjectFetch('verification-documents', verificationPath);
    record('storage:private-anonymous-read-blocked', !privatePublicResponse.ok, `HTTP_${privatePublicResponse.status}`);

    const outsiderDownload = await outsider.client.storage
      .from('verification-documents')
      .download(verificationPath);
    record('storage:private-cross-user-read-blocked', Boolean(outsiderDownload.error), outsiderDownload.error ? '' : 'READ_ALLOWED');

    const signed = await owner.client.storage
      .from('verification-documents')
      .createSignedUrl(verificationPath, 60);
    let signedResponse = null;
    if (!signed.error && signed.data?.signedUrl) signedResponse = await fetch(signed.data.signedUrl);
    record(
      'storage:private-owner-signed-read',
      !signed.error && Boolean(signedResponse?.ok),
      signed.error?.message || `HTTP_${signedResponse?.status || 0}`
    );

    const ownerDelete = await owner.client.storage.from('avatars').remove([avatarPath]);
    const avatarName = avatarPath.split('/').pop();
    const remaining = await adminClient.storage.from('avatars').list(owner.id, {
      search: avatarName,
      limit: 10,
    });
    const objectStillExists = remaining.data?.some((item) => item.name === avatarName);
    record(
      'storage:owner-delete',
      !ownerDelete.error && !remaining.error && !objectStillExists,
      ownerDelete.error?.message || remaining.error?.message || 'OBJECT_STILL_LISTED'
    );

    const failed = results.filter((result) => !result.passed);
    console.log(`SUMMARY=${results.length - failed.length}/${results.length}_PASSED`);
    if (failed.length) process.exitCode = 1;
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error(`FATAL=${error instanceof Error ? error.message : 'UNKNOWN_ERROR'}`);
  process.exitCode = 1;
});
