import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';

import { getArticle } from '@/lib/articles';
import { articleQrDataUrl } from '@/lib/qr';

/**
 * Open Graph card for an article, with a scannable QR code back to the article
 * page. This lives as a route handler rather than an `opengraph-image` file
 * because Next forbids metadata files inside a catch-all segment, and article
 * IDs need one (old-style arXiv IDs contain a slash).
 */
export const size = { width: 1200, height: 630 };

// Social crawlers refetch often and the card only changes when arXiv metadata
// does, so let the CDN keep it for a day and serve stale while revalidating.
const CACHE_CONTROL = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

/** Satori has no text measurement to reflow against, so long strings are cut by hand. */
function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1).trimEnd()}…` : value;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? '';
  const article = await getArticle(id).catch(() => null);

  // A share card is only ever generated for a paper we could resolve; if we
  // cannot, fall back to a plain branded card rather than failing the request.
  if (!article) {
    return new ImageResponse(
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1c1c1c',
          color: '#ffffff',
          fontSize: 64,
          fontWeight: 600,
        }}
      >
        PaperMind
      </div>,
      size
    );
  }

  const { document, arxivId } = article;
  const qr = await articleQrDataUrl(arxivId, 260);
  const authors = document.authors?.length
    ? truncate(
        document.authors.slice(0, 3).join(', ') +
          (document.authors.length > 3 ? ` +${document.authors.length - 3}` : ''),
        90
      )
    : 'Unknown author';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#1c1c1c',
        color: '#ffffff',
        padding: 64,
        gap: 56,
      }}
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', gap: 12, fontSize: 20, color: '#9ca3af' }}>
            {document.category && (
              <span
                style={{
                  padding: '4px 14px',
                  borderRadius: 999,
                  background: '#ffffff1a',
                  color: '#e5e7eb',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  fontSize: 18,
                }}
              >
                {document.category}
              </span>
            )}
            <span style={{ padding: '4px 4px' }}>arXiv:{arxivId}</span>
          </div>

          <div style={{ fontSize: 52, fontWeight: 700, lineHeight: 1.15 }}>
            {truncate(document.title, 130)}
          </div>

          <div style={{ fontSize: 24, color: '#9ca3af' }}>{authors}</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26 }}>
          <span style={{ fontWeight: 700 }}>PaperMind</span>
          <span style={{ color: '#6b7280' }}>·</span>
          <span style={{ color: '#9ca3af', fontSize: 22 }}>Scan to read the paper</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Satori renders this to a PNG on the server; next/image has no role here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qr}
          alt=""
          width={260}
          height={260}
          style={{ borderRadius: 16, background: '#ffffff', padding: 14 }}
        />
      </div>
    </div>,
    { ...size, headers: { 'Cache-Control': CACHE_CONTROL } }
  );
}
