import { getArxivById } from '@/lib/arxiv';
import { parseArxivId } from '@/lib/arxiv-id';
import { getCollection } from '@/lib/mongodb';
import { Document } from '@/types/models';

/**
 * A cached copy of an arXiv article.
 *
 * The cache exists for availability, not speed: arXiv's API rate-limits
 * aggressively (429) and has regular outages, and a shared article must keep
 * resolving regardless. `document.id` stays in arXiv's own versioned abs-URL
 * form so a cached article is interchangeable with a searched one; `arxiv_id`
 * is the bare, versionless key the article route uses.
 */
interface CachedArticle {
  arxiv_id: string;
  document: Document;
  cached_at: Date;
  refreshed_at: Date;
  /** Article-page views, used to decide which pages are worth submitting to search engines. */
  view_count?: number;
}

const COLLECTION = 'articles';

/** How long a cached copy is served without consulting arXiv at all. */
const FRESH_FOR_MS = 24 * 60 * 60 * 1000;

async function readCache(arxivId: string): Promise<CachedArticle | null> {
  try {
    const articles = await getCollection<CachedArticle>(COLLECTION);
    return await articles.findOne({ arxiv_id: arxivId });
  } catch (error) {
    // A cache read failure must never take the page down; arXiv is still there.
    console.error('Article cache read error:', error);
    return null;
  }
}

async function writeCache(arxivId: string, document: Document): Promise<void> {
  try {
    const articles = await getCollection<CachedArticle>(COLLECTION);
    const now = new Date();
    await articles.updateOne(
      { arxiv_id: arxivId },
      {
        $set: { document, refreshed_at: now },
        $setOnInsert: { arxiv_id: arxivId, cached_at: now },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error('Article cache write error:', error);
  }
}

export interface ArticleResult {
  document: Document;
  arxivId: string;
  /** 'cache' means arXiv was unreachable and a previously stored copy was served. */
  source: 'arxiv' | 'cache';
  /** When the served copy was last confirmed against arXiv. */
  refreshedAt: Date;
}

/**
 * Resolve an article by ID, preferring a fresh cached copy and falling back to
 * a stale one when arXiv is unavailable.
 *
 * Order is: fresh cache -> arXiv (refreshing the cache) -> stale cache.
 * Returns null only when the ID is malformed, or arXiv says the paper does not
 * exist and nothing was ever cached for it.
 */
export async function getArticle(rawId: string): Promise<ArticleResult | null> {
  const arxivId = parseArxivId(rawId);
  if (!arxivId) return null;

  const cached = await readCache(arxivId);

  if (cached && Date.now() - cached.refreshed_at.getTime() < FRESH_FOR_MS) {
    return {
      document: cached.document,
      arxivId,
      source: 'cache',
      refreshedAt: cached.refreshed_at,
    };
  }

  try {
    const document = await getArxivById(arxivId);

    if (document) {
      await writeCache(arxivId, document);
      return { document, arxivId, source: 'arxiv', refreshedAt: new Date() };
    }

    // arXiv answered and has no such paper. Trust that over a stale copy only
    // when there is no stale copy to fall back on.
    if (!cached) return null;
  } catch (error) {
    console.error('ArXiv fetch error, falling back to cache:', error);
    if (!cached) throw error;
  }

  return {
    document: cached.document,
    arxivId,
    source: 'cache',
    refreshedAt: cached.refreshed_at,
  };
}

/**
 * Store every article a search returned, so any of them can later be shared and
 * still resolve while arXiv is unavailable.
 *
 * Deliberately takes documents that the server itself fetched from arXiv rather
 * than anything a client posted back: these rows are served to every visitor of
 * an article page, so accepting client-supplied content here would let anyone
 * overwrite a real paper's title and abstract.
 *
 * Fire-and-forget — callers should not await this on the request path, and a
 * failure only costs the cache entry.
 */
export async function cacheArticles(documents: Document[]): Promise<void> {
  const operations = documents.flatMap((document) => {
    const arxivId = parseArxivId(document.id);
    if (!arxivId) return [];

    const now = new Date();
    return [
      {
        updateOne: {
          filter: { arxiv_id: arxivId },
          update: {
            $set: { document, refreshed_at: now },
            $setOnInsert: { arxiv_id: arxivId, cached_at: now },
          },
          upsert: true,
        },
      },
    ];
  });

  if (operations.length === 0) return;

  try {
    const articles = await getCollection<CachedArticle>(COLLECTION);
    await articles.bulkWrite(operations, { ordered: false });
  } catch (error) {
    console.error('Article cache bulk write error:', error);
  }
}

export interface SitemapArticle {
  arxivId: string;
  lastModified: Date;
}

/**
 * The cached articles worth listing in the sitemap, most-viewed first.
 *
 * Deliberately a small slice rather than the whole cache. Every search adds
 * rows here, and submitting thousands of pages whose content is largely an
 * arXiv abstract invites them all to be judged as thin and duplicated. Listing
 * only the pages people actually open keeps what we submit worth submitting.
 */
export async function listArticlesForSitemap(limit: number): Promise<SitemapArticle[]> {
  try {
    const articles = await getCollection<CachedArticle>(COLLECTION);
    const rows = await articles
      .find(
        {},
        {
          projection: {
            arxiv_id: 1,
            refreshed_at: 1,
            'document.updated': 1,
            'document.published': 1,
          },
          // Most-viewed first: these pages earn their place in the index, and
          // the cap keeps the long tail of one-off searches out of it.
          sort: { view_count: -1, 'document.published': -1 },
          limit,
        }
      )
      .toArray();

    return rows.map((row) => {
      // Prefer the paper's own revision date; a new version is the only thing
      // that actually changes the page. Fall back to when we last saw it.
      const stamp = row.document?.updated || row.document?.published;
      const parsed = stamp ? new Date(stamp) : null;

      return {
        arxivId: row.arxiv_id,
        lastModified: parsed && !Number.isNaN(parsed.getTime()) ? parsed : row.refreshed_at,
      };
    });
  } catch (error) {
    console.error('Sitemap article lookup error:', error);
    return [];
  }
}

/**
 * Count an article-page view.
 *
 * Called only from the page itself, not from generateMetadata or the Open Graph
 * card, so one visit counts once. Fire-and-forget: a miscount is not worth
 * delaying or failing a render over.
 */
export async function recordArticleView(arxivId: string): Promise<void> {
  try {
    const articles = await getCollection<CachedArticle>(COLLECTION);
    await articles.updateOne({ arxiv_id: arxivId }, { $inc: { view_count: 1 } });
  } catch (error) {
    console.error('Article view count error:', error);
  }
}

export interface RelatedArticle {
  arxivId: string;
  title: string;
  authors: string[];
}

/**
 * Other cached papers sharing an arXiv category.
 *
 * Read straight from the cache, so this costs no arXiv call, and it gives every
 * article page real internal links instead of leaving it a dead end.
 */
export async function listRelatedArticles(
  arxivId: string,
  category: string | undefined,
  limit: number
): Promise<RelatedArticle[]> {
  if (!category) return [];

  try {
    const articles = await getCollection<CachedArticle>(COLLECTION);
    const rows = await articles
      .find(
        { 'document.category': category, arxiv_id: { $ne: arxivId } },
        {
          projection: { arxiv_id: 1, 'document.title': 1, 'document.authors': 1 },
          sort: { 'document.published': -1 },
          limit,
        }
      )
      .toArray();

    return rows.map((row) => ({
      arxivId: row.arxiv_id,
      title: row.document?.title ?? '',
      authors: row.document?.authors ?? [],
    }));
  } catch (error) {
    console.error('Related article lookup error:', error);
    return [];
  }
}
