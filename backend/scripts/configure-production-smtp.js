require('dotenv').config({ path: '.env.production' });

const execute = process.argv.includes('--execute');
const required = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_REF',
  'SMTP_ADMIN_EMAIL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
];
const missing = required.filter((name) => !process.env[name]?.trim());

console.log(`MODE=${execute ? 'EXECUTE' : 'PLAN'}`);
console.log(`PROJECT_REF=${process.env.SUPABASE_PROJECT_REF || 'MISSING'}`);
console.log(`SMTP_REQUIRED_FIELDS=${required.length}`);
console.log(`SMTP_MISSING_FIELDS=${missing.length}`);
for (const name of missing) console.log(`missing=${name}`);

if (!execute) {
  console.log(missing.length ? 'PLAN_BLOCKED=SMTP credentials are required' : 'PLAN_READY=Use --execute to configure SMTP');
  process.exit(0);
}
if (missing.length) throw new Error(`SMTP_CONFIGURATION_MISSING:${missing.join(',')}`);

const port = Number(process.env.SMTP_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('SMTP_PORT_INVALID');

async function main() {
  const endpoint = `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_REF}/config/auth`;
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      external_email_enabled: true,
      mailer_secure_email_change_enabled: true,
      mailer_autoconfirm: false,
      smtp_admin_email: process.env.SMTP_ADMIN_EMAIL,
      smtp_host: process.env.SMTP_HOST,
      smtp_port: port,
      smtp_user: process.env.SMTP_USER,
      smtp_pass: process.env.SMTP_PASS,
      smtp_sender_name: process.env.SMTP_SENDER_NAME || 'İşBitir',
    }),
  });
  await response.text();
  if (!response.ok) throw new Error(`SMTP_CONFIG_HTTP_${response.status}`);
  console.log('SMTP_CONFIGURATION_APPLIED=YES');
  console.log('NEXT_STEP=Send one recovery email to a controlled test address');
}

main().catch((error) => {
  console.error(`SMTP_CONFIGURATION_ERROR=${error.message}`);
  process.exitCode = 1;
});
