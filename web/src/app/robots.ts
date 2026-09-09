import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const ready = process.env.NEXT_PUBLIC_LEGAL_READY === 'true';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://isbitirapp.com';
  return {
    rules: ready ? { userAgent: '*', allow: '/', disallow: ['/ilan/'] } : { userAgent: '*', disallow: '/' },
    sitemap: ready ? `${baseUrl}/sitemap.xml` : undefined,
  };
}
