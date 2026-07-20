require('dotenv').config();

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}

const tables = [
  'users',
  'electrician_profiles',
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
  'legal_documents',
  'user_consents',
];

async function main() {
  for (const table of tables) {
    const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=0`, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'count=exact',
      },
    });

    if (!response.ok) {
      console.log(`${table}=ERROR:HTTP_${response.status}`);
      continue;
    }

    const contentRange = response.headers.get('content-range') || '';
    const count = contentRange.match(/\/(\d+)$/)?.[1] || '0';
    console.log(`${table}=${count}`);
  }
}

main().catch((error) => {
  console.error(`TARGET_DB_ERROR:${error.message}`);
  process.exitCode = 1;
});
