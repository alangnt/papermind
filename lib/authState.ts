/**
 * A tiny shared "is anyone signed in?" store.
 *
 * The header renders on every page but sign-in and sign-out happen elsewhere —
 * the auth panel, the logout button — so it needs to be told, rather than
 * reading the session once on mount and going stale until a reload.
 *
 * Deliberately just a boolean: components that need the user itself already
 * fetch it. This only drives what the header shows.
 */
type AuthSnapshot = boolean | null;

/** null means "not determined yet", which is distinct from "signed out". */
let signedIn: AuthSnapshot = null;

const listeners = new Set<() => void>();

export function subscribeAuth(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAuthSnapshot(): AuthSnapshot {
  return signedIn;
}

/**
 * Server render has no cookies to read, so it always reports "unknown". Kept as
 * a stable reference: useSyncExternalStore re-invokes this and would loop if it
 * returned a fresh value each time.
 */
export function getServerAuthSnapshot(): AuthSnapshot {
  return null;
}

export function setSignedIn(next: boolean): void {
  if (next === signedIn) return;

  signedIn = next;
  listeners.forEach((listener) => listener());
}
