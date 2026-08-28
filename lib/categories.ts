/**
 * Tailwind classes for an arXiv primary-category badge.
 *
 * Shared by the result card and the article page so the two never drift.
 */
export function categoryBadgeClass(category?: string): string {
  if (!category) return 'bg-white/10 text-gray-300';
  const c = category.toLowerCase();
  if (c.includes('cs')) return 'bg-sky-500/20 text-sky-200';
  if (c.includes('math') || c.includes('stat')) return 'bg-indigo-500/20 text-indigo-200';
  if (c.includes('bio') || c.includes('med')) return 'bg-emerald-500/20 text-emerald-200';
  if (c.includes('phys')) return 'bg-fuchsia-500/20 text-fuchsia-200';
  if (c.includes('econ') || c.includes('fin')) return 'bg-amber-500/20 text-amber-200';
  return 'bg-white/10 text-gray-300';
}
