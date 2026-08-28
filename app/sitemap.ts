import { MetadataRoute } from 'next';

import { listArticlesForSitemap } from '@/lib/articles';
import { articleUrl } from '@/lib/site';

// The article list changes as people search, but not urgently. Rebuilding daily
// keeps the sitemap current without querying Mongo on every crawler request.
export const revalidate = 86400;

/**
 * Deliberately small. The cache grows with every search, and submitting the
 * whole of it would flood the index with pages nobody has ever opened. Only the
 * most-viewed articles are listed; raise this once the pages earn it, and split
 * with generateSitemaps rather than going anywhere near Google's 50,000 ceiling.
 */
const MAX_ARTICLES = 300;

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
