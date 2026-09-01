/**
 * Serialise a JSON-LD payload for embedding in a <script> block.
 *
 * `JSON.stringify` alone is not safe here: it leaves `</script>` intact, so a
 * value containing one closes the block early and everything after it is
 * parsed as markup. These payloads carry arXiv titles and abstracts, which are
 * author-submitted, so that is reachable content rather than a hypothetical.
 *
 * Escaping the angle brackets and the ampersand as unicode escapes keeps the
 * JSON semantically identical while making it impossible to terminate the
 * element. U+2028 and U+2029 are legal in JSON strings but not in JavaScript
 * ones, so they go too.
 */
export function serialiseJsonLd(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
