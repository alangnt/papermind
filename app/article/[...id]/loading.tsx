/**
 * Shown while an article page is being rendered — most visibly when moving
 * between papers via the "More in …" links, which are dynamic routes and so
 * cannot be fully prefetched.
 *
 * Mirrors the real card's shape so the transition does not jump.
 */
export default function ArticleLoading() {
  return (
    <div className="relative w-full overflow-hidden">
      <div className="relative z-40 flex flex-col grow w-full max-w-3xl place-self-center min-h-screen px-4 lg:px-0 py-8">
        <div className="h-4 w-28 rounded bg-black/10 mb-6" />

        <div
          className="bg-foreground border border-gray-700 rounded-2xl p-6 md:p-8 shadow-lg space-y-6"
          role="status"
          aria-label="Loading the paper"
        >
          <div className="space-y-3 animate-pulse">
            <div className="h-6 w-11/12 rounded bg-white/10" />
            <div className="h-6 w-2/3 rounded bg-white/10" />

            <div className="flex gap-2 pt-1">
              <div className="h-4 w-16 rounded-full bg-white/10" />
              <div className="h-4 w-28 rounded-full bg-white/10" />
            </div>

            <div className="h-3 w-1/2 rounded bg-white/10" />
            <div className="h-3 w-40 rounded bg-white/10" />
          </div>

          <div className="space-y-2 animate-pulse">
            <div className="h-3 w-20 rounded bg-white/10" />
            {['w-full', 'w-full', 'w-11/12', 'w-full', 'w-3/4'].map((width, index) => (
              <div key={index} className={`h-3 rounded bg-white/10 ${width}`} />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 pt-2 animate-pulse">
            <div className="h-8 w-28 rounded-md bg-white/10" />
            <div className="h-8 w-28 rounded-md bg-white/10" />
            <div className="h-8 w-20 rounded-md bg-white/10" />
            <div className="h-8 w-20 rounded-md bg-white/10" />
          </div>

          <span className="sr-only">Loading the paper…</span>
        </div>
      </div>
    </div>
  );
}
