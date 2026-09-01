import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { loadSearchSession, saveSearchSession } from '@/lib/searchSession';
import type { Document } from '@/types/documents';

const KEY = 'papermind:search';

const documents = [{ id: 'http://arxiv.org/abs/2305.05904v1', title: 'A paper' } as Document];

const store = new Map<string, string>();

beforeEach(() => {
  store.clear();
  vi.stubGlobal('window', {
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const save = () =>
  saveSearchSession({ query: 'fhe', documents, page: 2, cardIndex: 1, system: 'swipe' });

/** Rewrite the stored savedAt to simulate the passage of time. */
const age = (minutes: number) => {
  const stored = JSON.parse(store.get(KEY)!);
  stored.savedAt = Date.now() - minutes * 60 * 1000;
  store.set(KEY, JSON.stringify(stored));
};

describe('searchSession', () => {
  it('returns null when nothing was stored', () => {
    expect(loadSearchSession()).toBeNull();
  });

  it('round-trips everything the page needs to restore', () => {
    save();
    expect(loadSearchSession()).toMatchObject({
      query: 'fhe',
      page: 2,
      cardIndex: 1,
      system: 'swipe',
    });
    expect(loadSearchSession()?.documents).toHaveLength(1);
  });

  it('still returns a session just under the 30 minute limit', () => {
    save();
    age(29);
    expect(loadSearchSession()?.query).toBe('fhe');
  });

  it('expires a session past the 30 minute limit', () => {
    save();
    age(31);
    expect(loadSearchSession()).toBeNull();
  });

  it('clears the key when it expires, rather than re-reading it every time', () => {
    save();
    age(31);
    loadSearchSession();
    expect(store.has(KEY)).toBe(false);
  });

  it('discards unparseable json', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    store.set(KEY, '{not json');
    expect(loadSearchSession()).toBeNull();
  });

  it('discards a value that does not look like one we wrote', () => {
    store.set(KEY, JSON.stringify({ query: 5, documents: 'nope', savedAt: Date.now() }));
    expect(loadSearchSession()).toBeNull();
  });

  it('falls back to sane defaults for missing optional fields', () => {
    store.set(KEY, JSON.stringify({ query: 'x', documents: [], savedAt: Date.now() }));
    expect(loadSearchSession()).toMatchObject({ page: 1, cardIndex: 0, system: 'classic' });
  });

  it('survives storage being unavailable', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('window', {
      sessionStorage: {
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => {
          throw new Error('blocked');
        },
        removeItem: () => {},
      },
    });
    expect(() => save()).not.toThrow();
    expect(loadSearchSession()).toBeNull();
  });
});
