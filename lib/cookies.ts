/**
 * Cookie utilities for secure authentication
 */

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  maxAge?: number;
  path?: string;
  domain?: string;
}

/**
 * Serialize a cookie with secure defaults
 */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
): string {
  const {
    httpOnly = true,
    secure = process.env.NODE_ENV === 'production',
    sameSite = 'strict',
    maxAge,
    path = '/',
    domain,
  } = options;

  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;

  if (httpOnly) cookie += '; HttpOnly';
  if (secure) cookie += '; Secure';
  if (sameSite) cookie += `; SameSite=${sameSite.charAt(0).toUpperCase() + sameSite.slice(1)}`;
  if (maxAge !== undefined) cookie += `; Max-Age=${maxAge}`;
  if (path) cookie += `; Path=${path}`;
  if (domain) cookie += `; Domain=${domain}`;

  return cookie;
}

/**
 * Parse cookies from request header
 */
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};

  return cookieHeader.split(';').reduce((cookies, cookie) => {
    const [name, ...rest] = cookie.split('=');
    const value = rest.join('=');
    if (name && value) {
      cookies[decodeURIComponent(name.trim())] = decodeURIComponent(value.trim());
    }
    return cookies;
  }, {} as Record<string, string>);
}

/**
 * Create a cookie header to clear a cookie
 */
export function clearCookie(name: string, options: Pick<CookieOptions, 'path' | 'domain'> = {}): string {
  return serializeCookie(name, '', {
    ...options,
    maxAge: 0,
  });
}

/**
 * Get cookie value from request
 */
export function getCookie(cookieHeader: string | null, name: string): string | null {
  const cookies = parseCookies(cookieHeader);
  return cookies[name] || null;
}

/**
 * Create secure auth cookies
 */
export function createAuthCookies(accessToken: string, refreshToken: string): string[] {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Access token: 30 minutes
  const accessCookie = serializeCookie('access_token', accessToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 60, // 30 minutes
    path: '/',
  });

  // Refresh token: 30 days
  const refreshCookie = serializeCookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });

  return [accessCookie, refreshCookie];
}

/**
 * Clear auth cookies
 */
export function clearAuthCookies(): string[] {
  return [
    clearCookie('access_token', { path: '/' }),
    clearCookie('refresh_token', { path: '/' }),
  ];
}
