// lib/api.ts
type FetchArgs = Parameters<typeof fetch>;

const API_URL = process.env.NEXT_PUBLIC_API_URL!;
let refreshInFlight: Promise<string | null> | null = null;

export function getAccessToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}
export function getRefreshToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refresh_token');
}
export function setTokens(access: string, refresh?: string | null) {
  localStorage.setItem('access_token', access);
  if (refresh) localStorage.setItem('refresh_token', refresh);
}
export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
}

/**
 * Calls /auth/refresh with the current refresh_token and returns the new access token.
 * Returns null if refresh fails.
 */
async function refreshAccessToken(): Promise<string | null> {
  const rt = getRefreshToken();
  if (!rt) return null;

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rt }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    // backend returns { access_token, token_type, refresh_token }
    setTokens(data.access_token, data.refresh_token ?? rt); // stateless flow keeps old RT
    return data.access_token as string;
  } catch {
    return null;
  }
}

/**
 * Fetch that automatically attaches Authorization header,
 * and on 401 tries once to refresh & retry the original request.
 */
export async function apiFetch(input: FetchArgs[0], init: FetchArgs[1] = {}): Promise<Response> {
  const token = getAccessToken();

  // prepare headers without mutating caller's init
  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const firstTry = await fetch(input, { ...init, headers });

  if (firstTry.status !== 401) return firstTry;

  // 401: try to refresh (de-dupe concurrent refreshes)
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  const newAccess = await refreshInFlight;
  if (!newAccess) {
    clearTokens();
    return firstTry; // let caller handle as unauthenticated
  }

  // retry original request with the new access token
  const retryHeaders = new Headers(init.headers || {});
  retryHeaders.set('Authorization', `Bearer ${newAccess}`);
  return fetch(input, { ...init, headers: retryHeaders });
}
