import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(_request: NextRequest) {
  const response = NextResponse.next();

  // Add security headers
  const headers = response.headers;

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

  // Content Security Policy
  //
  // @vercel/analytics pulls its debug script from va.vercel-scripts.com in
  // development only; a deployed build loads it same-origin from
  // /_vercel/insights/script.js. Allowing the host in production would widen
  // the policy for a script that is never requested there.
  const scriptSrc = [
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    process.env.NODE_ENV === 'development' ? 'https://va.vercel-scripts.com' : '',
  ]
    .join(' ')
    .trim();

  headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );

  // Strict-Transport-Security (HSTS) - Only in production with HTTPS
  if (process.env.NODE_ENV === 'production') {
    headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  }

  return response;
}

// Configure which routes use this middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
