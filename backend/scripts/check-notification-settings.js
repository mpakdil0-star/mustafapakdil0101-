require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error('Supabase production credentials are missing');

async function main() {
  const response = await fetch(`${url}/rest/v1/users?select=notification_settings&limit=1000`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'count=exact',
    },
  });
  if (!response.ok) throw new Error(`SUPABASE_HTTP_${response.status}`);
  const data = await response.json();
  const contentRange = response.headers.get('content-range') || '';
  const count = Number(contentRange.split('/')[1]) || data.length;

  let missingPushEnabled = 0;
  let mismatchedPushValues = 0;
  for (const row of data || []) {
    const settings = row.notification_settings || {};
    if (typeof settings.pushEnabled !== 'boolean') missingPushEnabled += 1;
    if (typeof settings.push === 'boolean' && typeof settings.pushEnabled === 'boolean' && settings.push !== settings.pushEnabled) {
      mismatchedPushValues += 1;
    }
  }

  console.log(JSON.stringify({
    totalUsers: count,
    inspectedUsers: data?.length || 0,
    missingPushEnabled,
    mismatchedPushValues,
    normalized: missingPushEnabled === 0 && mismatchedPushValues === 0,
  }));
}

main().catch(error => {
  console.error(`FATAL=${error.message}`);
  process.exitCode = 1;
});
