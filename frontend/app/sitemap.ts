import type { MetadataRoute } from 'next';
import { routing } from '../i18n/routing';

export const dynamic = 'force-static';

const SITE_URL = 'https://tanggall.vercel.app';
const ROUTES = ['', '/v3/optimizer/tech-parts', '/twodeck', '/community'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of routing.locales) {
    for (const route of ROUTES) {
      entries.push({
        url: `${SITE_URL}/${locale}${route}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: route === '' ? 1.0 : 0.8,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, `${SITE_URL}/${l}${route}`]),
          ),
        },
      });
    }
  }
  return entries;
}
