require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
};

async function rows(path) {
  const response = await fetch(`${supabaseUrl}${path}`, { headers });
  if (!response.ok) throw new Error(`REST_${response.status}:${path}`);
  return response.json();
}

async function main() {
  const [users, jobs, forumPosts] = await Promise.all([
    rows('/rest/v1/users?select=profile_image_url&profile_image_url=not.is.null'),
    rows('/rest/v1/job_posts?select=images'),
    rows('/rest/v1/forum_posts?select=image_url&image_url=not.is.null'),
  ]);

  const references = [
    ...users.map((row) => row.profile_image_url),
    ...jobs.flatMap((row) => row.images || []),
    ...forumPosts.map((row) => row.image_url),
  ].filter(Boolean);

  const expectedHost = new URL(supabaseUrl).host;
  let supabaseReferences = 0;
  let accessible = 0;

  for (const reference of references) {
    try {
      if (new URL(reference).host === expectedHost) supabaseReferences += 1;
      const response = await fetch(reference, { method: 'HEAD' });
      if (response.ok) accessible += 1;
    } catch {}
  }

  console.log(`target_media_references=${references.length}`);
  console.log(`supabase_storage_references=${supabaseReferences}`);
  console.log(`public_objects_accessible=${accessible}`);
  console.log(`unavailable_objects=${references.length - accessible}`);
}

main().catch((error) => {
  console.error(`TARGET_MEDIA_AUDIT_ERROR:${error.message}`);
  process.exitCode = 1;
});
