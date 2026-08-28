'use client';

import Link, { useLinkStatus } from 'next/link';
import { LoaderCircle } from 'lucide-react';

import { RelatedArticle } from '@/lib/articles';

type Props = {
  category: string;
  articles: RelatedArticle[];
};

/**
 * Spinner for the row being navigated to.
 *
 * Always rendered and only faded in, so appearing cannot shift the row it sits
 * in. useLinkStatus has to live inside the Link it reports on.
 */
function PendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <LoaderCircle
      aria-hidden
      className={`w-3.5 h-3.5 shrink-0 animate-spin text-gray-400 transition-opacity ${
        pending ? 'opacity-100' : 'opacity-0'
      }`}
    />
  );
}

export default function RelatedArticles({ category, articles }: Props) {
  return (
    <section className="space-y-2 pt-2">
      <h2 className="text-xs uppercase tracking-wide text-gray-500 font-medium">
        More in {category}
      </h2>
      <ul className="space-y-1">
        {articles.map((paper) => (
          <li key={paper.arxivId}>
            <Link
              href={`/article/${paper.arxivId}`}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 -mx-2 hover:bg-white/5 transition-colors"
            >
              <span className="flex-1 min-w-0">
                <span className="block text-sm text-gray-200 leading-snug">{paper.title}</span>
                {paper.authors.length > 0 && (
                  <span className="block text-[11px] text-gray-500">
                    {paper.authors.slice(0, 3).join(', ')}
                    {paper.authors.length > 3 && ` +${paper.authors.length - 3}`}
                  </span>
                )}
              </span>
              <PendingIndicator />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
