import { Document } from '@/types/documents';
import Link from 'next/link';

export default function DocumentCard({ document }: { document: Document }) {
  const { title, authors, published, summary, pdfLink, id } = document;
  const publishedDate = published ? new Date(published).toLocaleDateString() : 'Unknown';

  return (
    <article
      className="flex flex-col justify-between bg-foreground border border-gray-700 rounded-2xl p-5 shadow-lg hover:-translate-y-1 hover:shadow-xl transition duration-200 text-white space-y-3"
      aria-label={`Research paper card: ${title}`}
    >
      <div className="flex flex-col gap-4">
        <header>
          <h2 className="text-lg font-semibold" title={title}>
            {title}
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            By {authors?.length ? authors.join(', ') : 'Unknown author'}
          </p>
          <p className="text-xs text-gray-400 mt-1">Published on {publishedDate}</p>
        </header>
        <p className="text-sm text-gray-200 line-clamp-2 md:line-clamp-4" title={summary}>
          {summary || 'No summary available.'}
        </p>
      </div>
      <div className="space-y-4 pt-2">
        <div className="flex flex-wrap justify-center gap-2">
          {pdfLink && (
            <Link
              href={pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm rounded-full bg-gray-600 hover:bg-gray-500 transition"
              aria-label="View PDF"
            >
              View PDF
            </Link>
          )}
          {id && (
            <Link
              href={id}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm rounded-full bg-gray-600 hover:bg-gray-500 transition"
              aria-label="View on arXiv"
            >
              View on arXiv
            </Link>
          )}
        </div>
        <footer className="text-[10px] text-gray-500 pt-2 border-t border-gray-700 mt-2">
          Data sourced from{' '}
          <Link
            href="https://arxiv.org"
            target="_blank"
            className="underline"
            aria-label="arXiv.org"
          >
            arXiv.org
          </Link>
          . Original work belongs to the respective authors.
        </footer>
      </div>
    </article>
  );
}
