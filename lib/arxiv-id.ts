/**
 * arXiv ID parsing, kept apart from the rest of lib/arxiv so client components
 * can normalise an ID without pulling the XML parser into the browser bundle.
 */
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
