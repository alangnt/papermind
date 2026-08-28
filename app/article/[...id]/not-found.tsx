import Link from 'next/link';

export default function ArticleNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 min-h-screen px-4 text-center">
      <h1 className="text-2xl font-semibold text-gray-800">Article not found</h1>
      <p className="text-sm text-gray-600 max-w-md">
        That arXiv identifier does not match a paper. Check the link, or search for the paper by
        name instead.
      </p>
      <Link
        href="/"
        className="mt-2 px-4 py-2 text-xs font-medium rounded-md bg-foreground text-white hover:bg-foreground/90 transition-colors"
      >
        Back to search
      </Link>
    </div>
  );
}
