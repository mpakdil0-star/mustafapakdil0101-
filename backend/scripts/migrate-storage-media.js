require('dotenv').config();

const path = require('path');
const { PrismaClient } = require('@prisma/client');

const source = new PrismaClient();
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const legacyBackendUrl = process.env.LEGACY_BACKEND_URL || 'https://elektrikciler-backend.onrender.com';

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const authHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};

const allowedTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const stats = {
  attempted: 0,
  uploaded: 0,
  failed: 0,
  avatars: 0,
  jobImages: 0,
  community: 0,
};

async function request(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    ...options,
    headers: { ...authHeaders, ...options.headers },
  });
  const text = await response.text();
  const body = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!response.ok) {
    throw new Error(body?.message || body?.msg || body || `HTTP_${response.status}`);
  }
  return body;
}

async function loadUserMapping() {
  const result = await request('/auth/v1/admin/users?page=1&per_page=1000');
  const users = Array.isArray(result) ? result : result.users || [];
  return new Map(
    users
      .filter((user) => user.app_metadata?.legacy_user_id)
      .map((user) => [user.app_metadata.legacy_user_id, user.id]),
  );
}

function absoluteSourceUrl(reference) {
  try {
    return new URL(reference).toString();
  } catch {
    return new URL(reference.replace(/^\/+/, ''), `${legacyBackendUrl}/`).toString();
  }
}

function encodedObjectPath(objectPath) {
  return objectPath.split('/').map(encodeURIComponent).join('/');
}

function typeFromResponse(response, reference) {
  const rawType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (allowedTypes.has(rawType)) return rawType;

  const extension = path.extname(new URL(absoluteSourceUrl(reference)).pathname).toLowerCase();
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  if (extension === '.png') return 'image/png';
  if (extension === '.webp') return 'image/webp';
  return null;
}

async function migrateObject(bucket, objectPathWithoutExtension, reference, category) {
  stats.attempted += 1;
  try {
    const response = await fetch(absoluteSourceUrl(reference), {
      redirect: 'follow',
      headers: { 'User-Agent': 'Isbitir-Supabase-Migration/1.0' },
    });
    if (!response.ok) throw new Error(`DOWNLOAD_HTTP_${response.status}`);

    const contentType = typeFromResponse(response, reference);
    if (!contentType) throw new Error('UNSUPPORTED_CONTENT_TYPE');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0) throw new Error('EMPTY_FILE');
    if (bytes.byteLength > 10 * 1024 * 1024) throw new Error('FILE_TOO_LARGE');

    const extension = allowedTypes.get(contentType);
    const objectPath = `${objectPathWithoutExtension}.${extension}`;
    const encodedPath = encodedObjectPath(objectPath);
    const upload = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${encodedPath}`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: bytes,
    });
    if (!upload.ok) {
      const errorBody = await upload.text();
      throw new Error(`UPLOAD_HTTP_${upload.status}:${errorBody}`);
    }

    stats.uploaded += 1;
    stats[category] += 1;
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${encodedPath}`;
  } catch (error) {
    stats.failed += 1;
    console.log(`media_failure=${category}:${error.message}`);
    return null;
  }
}

async function patchRow(table, id, values) {
  await request(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(values),
  });
}

async function main() {
  const userMapping = await loadUserMapping();
  if (userMapping.size !== 16) throw new Error(`EXPECTED_16_USER_MAPPINGS_GOT_${userMapping.size}`);

  const sourceUsers = await source.$queryRawUnsafe(
    'select id, profile_image_url from public.users where profile_image_url is not null order by id',
  );
  for (const user of sourceUsers) {
    const newUserId = userMapping.get(user.id);
    if (!newUserId) throw new Error(`USER_MAPPING_MISSING:${user.id}`);
    const migrated = await migrateObject(
      'avatars',
      `${newUserId}/avatar`,
      user.profile_image_url,
      'avatars',
    );
    if (migrated) await patchRow('users', newUserId, { profile_image_url: migrated });
  }

  const jobs = await source.$queryRawUnsafe(
    "select id, citizen_id, images from public.job_posts where cardinality(images) > 0 order by id",
  );
  for (const job of jobs) {
    const ownerId = userMapping.get(job.citizen_id);
    if (!ownerId) throw new Error(`JOB_OWNER_MAPPING_MISSING:${job.id}`);
    const migratedImages = [];
    for (let index = 0; index < job.images.length; index += 1) {
      const migrated = await migrateObject(
        'job-images',
        `${ownerId}/${job.id}/migrated-${index}`,
        job.images[index],
        'jobImages',
      );
      migratedImages.push(migrated || job.images[index]);
    }
    await patchRow('job_posts', job.id, { images: migratedImages });
  }

  const forumPosts = await source.$queryRawUnsafe(
    'select id, usta_id, image_url from public.forum_posts where image_url is not null order by id',
  );
  for (const post of forumPosts) {
    const ownerId = userMapping.get(post.usta_id);
    if (!ownerId) {
      stats.attempted += 1;
      stats.failed += 1;
      console.log('media_failure=community:OWNER_MAPPING_MISSING');
      continue;
    }
    const migrated = await migrateObject(
      'community-media',
      `${ownerId}/forum/${post.id}`,
      post.image_url,
      'community',
    );
    if (migrated) await patchRow('forum_posts', post.id, { image_url: migrated });
  }

  console.log(`media_attempted=${stats.attempted}`);
  console.log(`media_uploaded=${stats.uploaded}`);
  console.log(`media_failed=${stats.failed}`);
  console.log(`avatars_uploaded=${stats.avatars}`);
  console.log(`job_images_uploaded=${stats.jobImages}`);
  console.log(`community_media_uploaded=${stats.community}`);
}

main()
  .catch((error) => {
    console.error(`STORAGE_MIGRATION_ERROR:${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => source.$disconnect());
