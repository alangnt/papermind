import { headers } from 'next/headers';

import SearchPage from '@/components/pages/SearchPage';
import { serialiseJsonLd } from '@/lib/structuredData';

/**
 * A server shell so the route can opt into dynamic rendering. The CSP in
 * proxy.ts is nonce-based, and a nonce is stamped onto scripts at request
 * time — a build-time prerender never receives one, so its own bundles would
 * be refused by the policy. Route segment config is ignored in a "use client"
 * file, which is why the page below is a separate component.
 */
export const dynamic = 'force-dynamic';

export default async function Page() {
  // The structured data lives here rather than in the client page so it can
  // carry the request's nonce; it is static markup, so nothing is lost.
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: serialiseJsonLd({
            '@context': 'https://schema.org',
            '@type': 'WebApplication',
            name: 'PaperMind',
            description: 'AI research assistant for scientific papers with semantic search',
            url: 'https://www.papermind.ch',
            applicationCategory: 'EducationalApplication',
            operatingSystem: 'Any',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            creator: {
              '@type': 'Person',
              name: 'Alan Geirnaert',
              url: 'https://www.linkedin.com/in/alan-geirnaert/',
            },
          }),
        }}
      />

      <SearchPage />
    </>
  );
}
