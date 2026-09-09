import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  if (process.env.NEXT_PUBLIC_LEGAL_READY !== 'true') return [];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://isbitirapp.com';
  return ['', '/ilan-ver', '/usta-kayit', '/kvkk', '/gizlilik-politikasi', '/kullanim-kosullari', '/mesafe-sorumluluk-reddi'].map((path) => ({ url: `${baseUrl}${path}`, lastModified: new Date(), changeFrequency: path === '' ? 'weekly' as const : 'monthly' as const, priority: path === '' ? 1 : .6 }));
}
