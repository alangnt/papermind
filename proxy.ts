import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Fresh per request, and unguessable: a nonce an attacker can predict is no
  // better than 'unsafe-inline'.
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    "default-src 'self'",

    // 'strict-dynamic' lets Next's nonced bootstrap load the bundles it needs,
    // so no host allowlist is required — and any injected <script> without the
    // nonce is refused. 'unsafe-eval' is React's dev-only error reconstruction;
    // va.vercel-scripts.com is the analytics debug script, also dev-only.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${
      isDevelopment ? " 'unsafe-eval' https://va.vercel-scripts.com" : ''
    }`,

    // Styles keep 'unsafe-inline' deliberately: nonces do not cover inline
    // style *attributes*, and motion/react animates by writing element.style on
    // every frame. Inline styles are a far smaller risk than inline scripts.
    "style-src 'self' 'unsafe-inline'",

    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDevelopment ? [] : ['upgrade-insecure-requests']),
  ].join('; ');

  // Next reads the CSP off the *request* to find the nonce and stamp it onto
  // the scripts it renders, so it has to be set on both request and response.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  const headers = response.headers;

  headers.set('Content-Security-Policy', csp);

  // Prevent MIME type sniffing
  headers.set('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  headers.set('X-Frame-Options', 'DENY');

  // Enable XSS protection (legacy but still useful)
  headers.set('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict permissions for features
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');

  // Strict-Transport-Security (HSTS) - Only in production with HTTPS
  if (!isDevelopment) {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Match all request paths except for:
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       */
      source: '/((?!_next/static|_next/image|favicon.ico).*)',
      // A prefetch is served before the page it belongs to and would burn a
      // nonce the real request never sees.
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
