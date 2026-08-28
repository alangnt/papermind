export const SITE_URL = 'https://www.papermind.ch';

/** The canonical, scannable URL for an article — what every share QR code encodes. */
export function articleUrl(arxivId: string): string {
  return `${SITE_URL}/article/${arxivId}`;
}
