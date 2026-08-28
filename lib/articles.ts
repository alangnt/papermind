import { getArxivById, parseArxivId } from '@/lib/arxiv';
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
export interface CachedArticle {
  arxiv_id: string;
  document: Document;
  cached_at: Date;
  refreshed_at: Date;
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
 * Store an article the client already has, so a shared link resolves even if
 * arXiv is down the first time someone opens it. Called when a share card is
 * created, using the document from the search results the sharer is looking at.
 */
export async function cacheArticle(document: Document): Promise<string | null> {
  const arxivId = parseArxivId(document.id);
  if (!arxivId) return null;

  await writeCache(arxivId, document);
  return arxivId;
}
