require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const uploadsDir = path.resolve(__dirname, '..', 'uploads');

const refs = [];

function add(category, value) {
  if (typeof value !== 'string' || !value.trim()) return;
  refs.push({ category, value: value.trim() });
}

function addMany(category, values) {
  if (!Array.isArray(values)) return;
  for (const value of values) add(category, value);
}

function basenameFromReference(value) {
  try {
    const pathname = new URL(value).pathname;
    return decodeURIComponent(path.posix.basename(pathname));
  } catch {
    return path.basename(value.replace(/\\/g, '/'));
  }
}

async function main() {
  const [users, jobs, messages, reviews, profiles, tickets, products, showcase, forumPosts] =
    await Promise.all([
      prisma.$queryRawUnsafe('select profile_image_url from public.users'),
      prisma.$queryRawUnsafe('select images, video_url from public.job_posts'),
      prisma.$queryRawUnsafe('select media_url from public.messages'),
      prisma.$queryRawUnsafe('select images from public.reviews'),
      prisma.$queryRawUnsafe('select verification_documents from public.electrician_profiles'),
      prisma.$queryRawUnsafe('select attachments from public.support_tickets'),
      prisma.$queryRawUnsafe('select image, images from public.marketplace_products'),
      prisma.$queryRawUnsafe('select image, images from public.showcase_items'),
      prisma.$queryRawUnsafe('select image_url from public.forum_posts'),
    ]);

  users.forEach((row) => add('avatars', row.profile_image_url));
  jobs.forEach((row) => {
    addMany('job-images', row.images);
    add('job-videos', row.video_url);
  });
  messages.forEach((row) => add('message-attachments', row.media_url));
  reviews.forEach((row) => addMany('review-images', row.images));
  profiles.forEach((row) => {
    const document = row.verification_documents;
    if (document && typeof document === 'object') {
      add('verification-documents', document.path || document.url);
      addMany('verification-documents', document.documents);
    }
  });
  tickets.forEach((row) => addMany('support-attachments', row.attachments));
  products.forEach((row) => {
    add('marketplace-media', row.image);
    addMany('marketplace-media', row.images);
  });
  showcase.forEach((row) => {
    add('community-media', row.image);
    addMany('community-media', row.images);
  });
  forumPosts.forEach((row) => add('community-media', row.image_url));

  const localFiles = fs.existsSync(uploadsDir)
    ? fs.readdirSync(uploadsDir, { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile())
        .map((entry) => entry.name)
    : [];
  const localNames = new Set(localFiles);

  const unique = new Map();
  for (const ref of refs) unique.set(`${ref.category}\0${ref.value}`, ref);
  const uniqueRefs = [...unique.values()];

  const byCategory = new Map();
  const byHost = new Map();
  let localMatches = 0;

  for (const ref of uniqueRefs) {
    byCategory.set(ref.category, (byCategory.get(ref.category) || 0) + 1);
    const basename = basenameFromReference(ref.value);
    if (localNames.has(basename)) localMatches += 1;

    let host = 'relative-or-storage-path';
    try {
      host = new URL(ref.value).host || host;
    } catch {}
    byHost.set(host, (byHost.get(host) || 0) + 1);
  }

  console.log(`references_total=${refs.length}`);
  console.log(`references_unique=${uniqueRefs.length}`);
  console.log(`local_file_matches=${localMatches}`);
  console.log(`unresolved_references=${uniqueRefs.length - localMatches}`);
  console.log('---CATEGORIES---');
  for (const [category, count] of [...byCategory].sort()) console.log(`${category}=${count}`);
  console.log('---HOSTS---');
  for (const [host, count] of [...byHost].sort()) console.log(`${host}=${count}`);
}

main()
  .catch((error) => {
    console.error(`MEDIA_AUDIT_ERROR:${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
