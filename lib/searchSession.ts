import { Document, SystemType } from '@/types/documents';

/**
 * Search results survive a trip to an article page and back.
 *
 * Kept in sessionStorage rather than in React state because the App Router
 * unmounts the search page on navigation. sessionStorage also covers a refresh
 * and reopening the tab, and stays scoped to the one tab that ran the search.
 */
export interface SearchSession {
  query: string;
  documents: Document[];
  page: number;
  cardIndex: number;
  system: SystemType;
  savedAt: number;
}

const STORAGE_KEY = 'papermind:search';

/** Results older than this are stale enough that showing them again is wrong. */
const MAX_AGE_MS = 30 * 60 * 1000;

export function saveSearchSession(session: Omit<SearchSession, 'savedAt'>): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...session, savedAt: Date.now() } satisfies SearchSession)
    );
  } catch (error) {
    // Quota exceeded or storage disabled (private mode, blocked cookies).
    // Losing the restore is acceptable; breaking the search is not.
    console.error('Could not persist the current search', error);
  }
}

function clearSearchSession(): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Could not clear the stored search', error);
  }
}

/**
 * Read back a previous search, or null if there is none, it has expired, or the
 * stored value does not look like one we wrote.
 */
export function loadSearchSession(): SearchSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SearchSession>;

    const isShaped =
      typeof parsed?.query === 'string' &&
      Array.isArray(parsed.documents) &&
      parsed.documents.every((document) => typeof document?.id === 'string') &&
      typeof parsed.savedAt === 'number';

    if (!isShaped) {
      clearSearchSession();
      return null;
    }

    if (Date.now() - parsed.savedAt! > MAX_AGE_MS) {
      clearSearchSession();
      return null;
    }

    return {
      query: parsed.query!,
      documents: parsed.documents!,
      page: typeof parsed.page === 'number' ? parsed.page : 1,
      cardIndex: typeof parsed.cardIndex === 'number' ? parsed.cardIndex : 0,
      system: parsed.system === 'swipe' ? 'swipe' : 'classic',
      savedAt: parsed.savedAt!,
    };
  } catch (error) {
    console.error('Could not read the stored search', error);
    clearSearchSession();
    return null;
  }
}
