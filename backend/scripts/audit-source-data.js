require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename",
  );

  for (const { tablename } of tables) {
    if (!/^[a-z_]+$/.test(tablename)) continue;

    const [result] = await prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS count FROM public."${tablename}"`,
    );

    console.log(`${tablename}=${result.count}`);
  }

  const [authReadiness] = await prisma.$queryRawUnsafe(`
    select
      count(*)::int as total,
      count(*) filter (where password_hash like '$2a$%' or password_hash like '$2b$%' or password_hash like '$2y$%')::int as bcrypt_hashes,
      count(*) filter (where email !~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$')::int as invalid_emails,
      count(*) filter (where id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$')::int as invalid_uuids
    from public.users
  `);

  console.log('---AUTH_READINESS---');
  console.log(`total=${authReadiness.total}`);
  console.log(`bcrypt_hashes=${authReadiness.bcrypt_hashes}`);
  console.log(`invalid_emails=${authReadiness.invalid_emails}`);
  console.log(`invalid_uuids=${authReadiness.invalid_uuids}`);
}

main()
  .catch((error) => {
    console.error(`SOURCE_DB_ERROR:${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
