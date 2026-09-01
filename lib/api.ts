// lib/api.ts
import { setSignedIn } from '@/lib/authState';

type FetchArgs = Parameters<typeof fetch>;

const API_URL = ''; // Use relative paths for Next.js API routes
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Clear authentication (logout)
 */
export async function logout(): Promise<void> {
  // Call logout endpoint which will clear cookies
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    // Tell the header even if the request failed: the intent was to sign out,
    // and the next authenticated call will 401 and confirm it anyway.
    setSignedIn(false);
  }
}

/**
 * Refresh access token using refresh token from cookies
 * Returns true if successful, false otherwise
 */
async function refreshAccessToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // Send cookies
    });

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Fetch that automatically includes credentials (cookies),
 * and on 401 tries once to refresh & retry the original request.
 */
export async function apiFetch(input: FetchArgs[0], init: FetchArgs[1] = {}): Promise<Response> {
  // Ensure credentials are included to send cookies
  const requestInit = {
    ...init,
    credentials: 'include' as RequestCredentials,
  };

  const firstTry = await fetch(input, requestInit);

  if (firstTry.status !== 401) {
    publishAuthState(input, requestInit, firstTry);
    return firstTry;
  }

  // 401: try to refresh (de-dupe concurrent refreshes)
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  const refreshed = await refreshInFlight;
  if (!refreshed) {
    // The refresh token is gone or expired: this session really is signed out.
    setSignedIn(false);
    return firstTry; // let caller handle as unauthenticated
  }

  // retry original request (new access token is now in cookies)
  const retried = await fetch(input, requestInit);
  publishAuthState(input, requestInit, retried);
  return retried;
}

/**
 * Keep the shared auth state in step with what the server just told us, so
 * every existing call site updates the header without knowing it exists.
 */
function publishAuthState(input: FetchArgs[0], init: FetchArgs[1], response: Response): void {
  if (response.status === 401 || response.status === 403) {
    setSignedIn(false);
    return;
  }

  if (!response.ok) return;

  const url = typeof input === 'string' ? input : input instanceof URL ? input.pathname : input.url;
  if (!url.includes('/api/users/me')) return;

  // Only a read of /me proves a session. DELETE on the same path erases the
  // account, and reporting that as "signed in" would leave the header lit up
  // for a user who no longer exists.
  const method = (init?.method ?? 'GET').toUpperCase();
  setSignedIn(method === 'GET');
}
