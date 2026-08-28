import { parseStringPromise } from 'xml2js';
import { Document } from '@/types/models';

const ARXIV_API_URL = 'http://export.arxiv.org/api/query';

interface ArxivEntry {
  title: string[];
  summary: string[];
  id: string[];
  published: string[];
  updated?: string[];
  author?: Array<{ name: string[] }>;
  link?: Array<{ $: { href: string; type?: string } }>;
  'arxiv:comment'?: string[];
  'arxiv:doi'?: string[];
  'arxiv:primary_category'?: Array<{ $: { term: string } }>;
}

interface ArxivFeed {
  feed: {
    entry?: ArxivEntry[];
  };
}

/**
 * Build the arXiv API query URL
 */
function buildQueryUrl(query: string, start: number = 0, maxResults: number = 10): string {
  const encodedQuery = encodeURIComponent(query);
  return `${ARXIV_API_URL}?search_query=all:${encodedQuery}&start=${start}&max_results=${maxResults}`;
}

/**
 * Fetch XML data from arXiv API
 */
async function fetchArxivXml(
  query: string,
  start: number = 0,
  maxResults: number = 10
): Promise<string> {
  const url = buildQueryUrl(query, start, maxResults);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

/**
 * Parse arXiv Atom XML into Document objects
 */
async function parseArxivXml(xmlData: string): Promise<Document[]> {
  const result: ArxivFeed = await parseStringPromise(xmlData);
  const entries = result.feed.entry || [];

  return entries.map((entry) => {
    // Extract basic fields
    const id = entry.id?.[0]?.trim() || '';
    const title = entry.title?.[0]?.trim() || '';
    const summary = entry.summary?.[0]?.trim() || '';
    const published = entry.published?.[0]?.trim() || '';
    const updated = entry.updated?.[0]?.trim() || undefined;

    // Extract authors
    const authors = entry.author?.map((a) => a.name[0]?.trim()) || [];

    // Find PDF link
    let pdfLink: string | undefined;
    if (entry.link) {
      const pdfLinkObj = entry.link.find((l) => l.$?.type === 'application/pdf');
      pdfLink = pdfLinkObj?.$?.href;
    }

    // Extract optional fields
    const comment = entry['arxiv:comment']?.[0]?.trim() || undefined;
    const doi = entry['arxiv:doi']?.[0]?.trim() || undefined;
    const category = entry['arxiv:primary_category']?.[0]?.$?.term || undefined;

    return {
      id,
      title,
      summary,
      authors,
      published,
      updated,
      pdfLink,
      comment,
      doi,
      category,
    };
  });
}

/**
 * arXiv IDs come in two shapes:
 *   new style  2301.07041      (YYMM.NNNNN, 4 or 5 digit sequence)
 *   old style  cs/0701001, hep-th/9901001, math.GT/0309136
 * Both may carry a trailing version (v2) and may arrive wrapped in an abs URL.
 */
const NEW_STYLE_ID = /^\d{4}\.\d{4,5}$/;
const OLD_STYLE_ID = /^[a-z-]+(?:\.[A-Z]{2})?\/\d{7}$/;

/**
 * Normalise anything arXiv-shaped into a bare, versionless ID.
 *
 * Accepts the `<id>` value the Atom feed returns (`http://arxiv.org/abs/2301.07041v2`),
 * an `arXiv:` prefixed citation, or a bare ID. Returns null when the input does not
 * match a known ID shape — callers must treat that as "not an article" rather than
 * passing it through, since the value ends up in an outbound query string.
 */
export function parseArxivId(raw: string): string | null {
  if (!raw) return null;

  let id = raw.trim();

  // Strip an abs/pdf URL down to the ID portion.
  const urlMatch = id.match(/arxiv\.org\/(?:abs|pdf)\/(.+)$/i);
  if (urlMatch) {
    id = urlMatch[1];
  }

  id = id.replace(/^arxiv:/i, '');
  id = id.replace(/\.pdf$/i, '');
  id = id.replace(/v\d+$/, '');
  id = id.replace(/\/$/, '');

  if (NEW_STYLE_ID.test(id)) return id;
  if (OLD_STYLE_ID.test(id)) return id;

  return null;
}

/**
 * Fetch a single article by ID via the arXiv `id_list` parameter.
 *
 * Cached for a day by the Next data cache so a popular article costs one
 * upstream request per day rather than one per view — arXiv asks for no more
 * than a request every few seconds.
 *
 * Returns null for an unknown or malformed ID; throws if arXiv itself fails,
 * so callers can distinguish "no such paper" from "upstream is down".
 */
export async function getArxivById(rawId: string): Promise<Document | null> {
  const id = parseArxivId(rawId);
  if (!id) return null;

  // Old-style IDs contain a slash (cs/0701001) which arXiv expects unencoded.
  // parseArxivId has already validated `id` against a strict allowlist, so
  // interpolating it here cannot inject extra query parameters.
  const url = `${ARXIV_API_URL}?id_list=${id}&max_results=1`;
  const response = await fetch(url, { next: { revalidate: 86400 } });

  if (!response.ok) {
    throw new Error(`ArXiv API error: ${response.status} ${response.statusText}`);
  }

  const documents = await parseArxivXml(await response.text());
  const document = documents[0];

  // arXiv answers an unresolvable ID with a 200 and a single error entry
  // whose id points at its error namespace rather than /abs/.
  if (!document || document.id.includes('/api/errors')) {
    return null;
  }

  // `id` is deliberately left as arXiv returned it (the versioned abs URL), so a
  // document from here compares equal to one from searchArxiv — saved articles
  // are keyed on that value. Callers wanting the bare ID use parseArxivId.
  return document;
}

/**
 * Search arXiv and return parsed documents
 */
export async function searchArxiv(
  query: string,
  start: number = 0,
  maxResults: number = 10
): Promise<Document[]> {
  const xmlData = await fetchArxivXml(query, start, maxResults);
  return parseArxivXml(xmlData);
}
