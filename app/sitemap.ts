import { MetadataRoute } from 'next';

import { listArticlesForSitemap } from '@/lib/articles';
import { articleUrl } from '@/lib/site';

// The article list changes as people search, but not urgently. Rebuilding daily
// keeps the sitemap current without querying Mongo on every crawler request.
export const revalidate = 86400;

/**
 * Well under Google's 50,000-URL ceiling. If the cache ever outgrows this,
 * split the sitemap with generateSitemaps rather than raising the cap.
 */
const MAX_ARTICLES = 5000;

// Only public, indexable routes belong here. /profile and /reset_password are
// noindex (see their layouts) and are deliberately omitted.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await listArticlesForSitemap(MAX_ARTICLES);

  return [
    {
      url: 'https://www.papermind.ch',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...articles.map((article) => ({
      url: articleUrl(article.arxivId),
      lastModified: article.lastModified,
      // A paper's metadata only changes when the authors post a new version.
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ];
}
