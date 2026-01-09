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
async function fetchArxivXml(query: string, start: number = 0, maxResults: number = 10): Promise<string> {
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
