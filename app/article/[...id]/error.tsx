'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';

/**
 * Reached when arXiv is unavailable and Papermind has no cached copy of the
 * article — a real and recurring situation, since arXiv rate-limits hard and
 * has regular outages. Someone arriving from a shared QR code should still be
 * given a way through to the paper, so link straight to arXiv.
 */
export default function ArticleError({ reset }: { error: Error; reset: () => void }) {
  const params = useParams<{ id: string | string[] }>();
  const id = Array.isArray(params?.id) ? params.id.join('/') : (params?.id ?? '');

  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-screen px-4 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">This paper is not loading</h1>
      <p className="text-sm text-gray-600 max-w-md">
        arXiv is not responding and we have no saved copy of this one yet. It is usually back within
        a few minutes.
      </p>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        <button
          type="button"
          onClick={reset}
          className="px-4 py-2 text-xs font-medium rounded-md bg-foreground text-white hover:bg-foreground/90 transition-colors cursor-pointer"
        >
          Try again
        </button>
        {id && (
          <a
            href={`https://arxiv.org/abs/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Read it on arXiv
          </a>
        )}
        <Link
          href="/"
          className="px-4 py-2 text-xs font-medium rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
        >
          Back to search
        </Link>
      </div>
    </div>
  );
}
