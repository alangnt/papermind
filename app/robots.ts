import { MetadataRoute } from 'next';

import { SITE_URL } from '@/lib/site';

/**
 * Mirrors the noindex layouts: /profile, /groups and /reset_password are
 * private or single-use, so they are kept out of crawlers entirely rather than
 * relying on a meta tag a crawler has to fetch the page to read.
 *
 * /article stays crawlable — those pages are the point of a shared link, and
 * app/sitemap.ts submits the ones people actually open.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/profile', '/groups', '/reset_password'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
