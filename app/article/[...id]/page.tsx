import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import Link from 'next/link';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';

import ArticleActions from '@/components/article/ArticleActions';
import RelatedArticles from '@/components/article/RelatedArticles';
import Footer from '@/components/ui/Footer';
import SiteNav from '@/components/ui/SiteNav';
import { Waves } from '@/components/ui/WavesBackground';
import { getArticle, listRelatedArticles, recordArticleView } from '@/lib/articles';
import { categoryBadgeClass } from '@/lib/categories';
import { articleUrl } from '@/lib/site';

type Props = {
  // Catch-all: old-style arXiv IDs contain a slash (cs/0701001), so the ID
  // arrives as multiple segments and has to be rejoined.
  params: Promise<{ id: string[] }>;
};

/**
 * generateMetadata and the page body both need the article. cache() collapses
 * that into a single lookup per request, so one page view is at most one arXiv
 * call and one Mongo read.
 */
const loadArticle = cache(async (segments: string[]) => getArticle(segments.join('/')));

function formatDate(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // A throw here means arXiv is down with nothing cached, which is temporary —
  // keep it out of the index, but do not claim the paper does not exist.
  const article = await loadArticle(id).catch(() => 'unavailable' as const);

  if (article === 'unavailable') {
    return { title: 'Article unavailable', robots: { index: false, follow: false } };
  }

  if (!article) {
    return { title: 'Article not found', robots: { index: false, follow: false } };
  }

  const { document, arxivId } = article;
  const description = document.summary?.trim().slice(0, 200) ?? '';
  const url = articleUrl(arxivId);
  const image = {
    url: `/api/og/article?id=${encodeURIComponent(arxivId)}`,
    width: 1200,
    height: 630,
    alt: `${document.title} — scan the QR code to read it on PaperMind`,
  };

  return {
    title: document.title,
    description,
    authors: document.authors?.map((name) => ({ name })),
    alternates: { canonical: `/article/${arxivId}` },
    openGraph: {
      type: 'article',
      url,
      title: document.title,
      description,
      siteName: 'PaperMind',
      publishedTime: document.published || undefined,
      modifiedTime: document.updated || undefined,
      authors: document.authors,
      images: [image],
    },
    twitter: {
      card: 'summary_large_image',
      title: document.title,
      description,
      images: [image],
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { id } = await params;

  let article;
  try {
    article = await loadArticle(id);
  } catch {
    // arXiv is unreachable and nothing was ever cached for this ID. A 404 would
    // be a lie, so surface it as an error the user can retry.
    throw new Error('This article could not be loaded right now. Please try again shortly.');
  }

  if (!article) notFound();

  const { document, arxivId, source, refreshedAt } = article;
  const publishedDate = formatDate(document.published);
  const updatedDate = formatDate(document.updated);
  const abstract = document.summary?.trim() || 'No summary available.';
  // Both read from the cache, so neither costs an arXiv call.
  const related = await listRelatedArticles(arxivId, document.category, 5);
  void recordArticleView(arxivId);

  const absUrl = `https://arxiv.org/abs/${arxivId}`;
  const pdfUrl = document.pdfLink || `https://arxiv.org/pdf/${arxivId}`;

  return (
    <div className="relative w-full overflow-hidden">
      {/* Same backdrop as the search page, so a shared link still looks like Papermind. */}
      <div className="absolute inset-0 w-full pointer-events-none">
        <Waves
          lineColor={'rgba(0, 0, 0, 0.3)'}
          backgroundColor="transparent"
          waveSpeedX={0.02}
          waveSpeedY={0.01}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.9}
          tension={0.01}
          maxCursorMove={120}
          xGap={12}
          yGap={36}
        />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ScholarlyArticle',
            headline: document.title,
            abstract,
            author: document.authors?.map((name) => ({ '@type': 'Person', name })),
            datePublished: document.published || undefined,
            dateModified: document.updated || undefined,
            identifier: document.doi ? `https://doi.org/${document.doi}` : absUrl,
            url: articleUrl(arxivId),
            sameAs: absUrl,
            isAccessibleForFree: true,
            publisher: { '@type': 'Organization', name: 'arXiv' },
          }),
        }}
      />

      <div className="relative z-40 flex flex-col grow w-full max-w-3xl place-self-center min-h-screen px-4 lg:px-0 py-8">
        <SiteNav />

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors mb-4 w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to search
        </Link>

        <main className="grow flex flex-col">
          <article className="bg-foreground border border-gray-700 rounded-2xl p-6 md:p-8 shadow-lg text-white space-y-6">
            <header className="space-y-3">
              <h1 className="font-semibold leading-snug text-xl md:text-2xl">{document.title}</h1>

              <div className="flex flex-wrap items-center gap-2">
                {document.category && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase font-medium border border-white/10 ${categoryBadgeClass(document.category)}`}
                  >
                    {document.category}
                  </span>
                )}
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-gray-300">
                  arXiv:{arxivId}
                </span>
                {document.doi && (
                  <a
                    href={`https://doi.org/${document.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    DOI: {document.doi}
                  </a>
                )}
              </div>

              {document.authors?.length > 0 && (
                <p className="text-xs text-gray-400">{document.authors.join(', ')}</p>
              )}

              <p className="text-[11px] text-gray-500">
                {publishedDate && <>Published {publishedDate}</>}
                {updatedDate && updatedDate !== publishedDate && <> · Updated {updatedDate}</>}
              </p>
            </header>

            <section className="space-y-2">
              <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                Abstract
              </h2>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">
                {abstract}
              </p>
            </section>

            {document.comment && (
              <section className="space-y-2">
                <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                  Author comment
                </h2>
                <p className="text-sm text-gray-300 leading-relaxed">{document.comment}</p>
              </section>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /> Read the PDF
              </a>
              <a
                href={absUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" /> View on arXiv
              </a>
              <ArticleActions document={document} arxivId={arxivId} />
            </div>

            {related.length > 0 && document.category && (
              <RelatedArticles category={document.category} articles={related} />
            )}

            <footer className="text-[10px] text-gray-500 pt-4 border-t border-gray-700">
              {source === 'cache' ? (
                <>
                  Served from Papermind&apos;s copy, last checked against arXiv on{' '}
                  {formatDate(refreshedAt.toISOString())}.
                </>
              ) : (
                <>Metadata from arXiv.</>
              )}
            </footer>
          </article>
        </main>

        <Footer />
      </div>
    </div>
  );
}
