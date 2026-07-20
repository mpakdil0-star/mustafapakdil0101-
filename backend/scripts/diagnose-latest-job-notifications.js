require('dotenv').config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

const headers = { apikey: key, Authorization: `Bearer ${key}` };
const get = async (path) => {
  const response = await fetch(`${url}${path}`, { headers });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`HTTP_${response.status}:${JSON.stringify(body)}`);
  return body;
};
const normalize = (value) => String(value || '').trim().toLocaleLowerCase('tr-TR');

async function main() {
  const jobs = await get('/rest/v1/job_posts?select=id,service_category,location,status,created_at,deleted_at&order=created_at.desc&limit=5');
  if (!jobs.length) {
    console.log('NO_JOBS');
    return;
  }

  const users = await get('/rest/v1/users?select=id,full_name,email,user_type,is_active,is_banned,deleted_at,city,notification_settings');
  const profiles = await get('/rest/v1/electrician_profiles?select=user_id,service_category,is_available');
  const locations = await get('/rest/v1/locations?select=user_id,city,district,is_active');
  const tokens = await get('/rest/v1/push_tokens?select=user_id,is_active');

  const electricians = users.filter((user) => user.user_type === 'ELECTRICIAN');
  const newestJob = jobs[0];
  const relevantElectricians = electricians
    .map((user) => {
      const profile = profiles.find((item) => item.user_id === user.id);
      const activeLocations = locations.filter((item) => item.user_id === user.id && item.is_active);
      return {
        userId: user.id,
        name: user.full_name,
        email: user.email,
        active: user.is_active,
        banned: user.is_banned,
        deleted: Boolean(user.deleted_at),
        available: profile?.is_available ?? null,
        category: profile?.service_category ?? null,
        profileCity: user.city || null,
        serviceLocations: activeLocations.map((item) => ({ city: item.city, district: item.district })),
        activePushTokens: tokens.filter((token) => token.user_id === user.id && token.is_active).length,
        pushEnabled: user.notification_settings?.pushEnabled ?? user.notification_settings?.push ?? true,
      };
    })
    .filter((item) => normalize(item.category) === normalize(newestJob.service_category || 'elektrik'));
  console.log(`RELEVANT_ELECTRICIANS=${JSON.stringify(relevantElectricians)}`);

  for (const job of jobs) {
    const city = job.location?.city || null;
    const district = job.location?.district || null;
    const category = job.service_category || 'elektrik';
    const matching = [];

    for (const user of electricians) {
      const profile = profiles.find((item) => item.user_id === user.id);
      const activeLocations = locations.filter((item) => item.user_id === user.id && item.is_active);
      const categoryMatches = normalize(profile?.service_category) === normalize(category);
      const locationMatches = activeLocations.length
        ? activeLocations.some((item) => normalize(item.city) === normalize(city)
          && (!district || !item.district || normalize(item.district) === normalize(district)))
        : normalize(user.city) === normalize(city);
      if (user.is_active && !user.is_banned && !user.deleted_at && profile?.is_available && categoryMatches && locationMatches) {
        matching.push(user.id);
      }
    }

    const notices = await get(`/rest/v1/notifications?related_id=eq.${encodeURIComponent(job.id)}&type=eq.new_job&select=id,user_id,push_sent,created_at`);
    const noticeIds = notices.map((notice) => notice.id);
    const outbox = noticeIds.length
      ? await get(`/rest/v1/notification_outbox?notification_id=in.(${noticeIds.map(encodeURIComponent).join(',')})&select=user_id,status,attempt_count,last_error,processed_at`)
      : [];
    const matchingTokenCount = tokens.filter((token) => matching.includes(token.user_id) && token.is_active).length;

    console.log(JSON.stringify({
      jobId: job.id,
      createdAt: job.created_at,
      status: job.status,
      category,
      city,
      district,
      eligibleElectricians: matching.length,
      activePushTokensForEligibleElectricians: matchingTokenCount,
      notificationsCreated: notices.length,
      outbox,
    }));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
