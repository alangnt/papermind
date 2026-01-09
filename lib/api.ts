// lib/api.ts
type FetchArgs = Parameters<typeof fetch>;

const API_URL = ''; // Use relative paths for Next.js API routes
let refreshInFlight: Promise<boolean> | null = null;

/**
 * Check if user is authenticated by making a test request
 * (cookies are automatically sent)
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const res = await fetch('/api/users/me', {
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

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

  if (firstTry.status !== 401) return firstTry;

  // 401: try to refresh (de-dupe concurrent refreshes)
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken().finally(() => {
      refreshInFlight = null;
    });
  }
  const refreshed = await refreshInFlight;
  if (!refreshed) {
    return firstTry; // let caller handle as unauthenticated
  }

  // retry original request (new access token is now in cookies)
  return fetch(input, requestInit);
}
