import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { MongoClient } from 'mongodb';

import {
  checkGroupWriteRateLimit,
  checkSignInRateLimit,
  getClientIp,
  resetRateLimit,
} from '@/lib/ratelimit';

let client: MongoClient;
const windows = () => client.db(process.env.MONGODB_NAME!).collection('rate_limits');

beforeAll(async () => {
  client = new MongoClient(process.env.MONGODB_URI!);
  await client.connect();
});

afterAll(async () => {
  await client?.close();
});

beforeEach(async () => {
  await windows().deleteMany({});
});

describe('sign-in limiter', () => {
  it('allows up to the limit and refuses beyond it', async () => {
    const results = [];
    for (let attempt = 0; attempt < 7; attempt++) {
      results.push(await checkSignInRateLimit('1.2.3.4', 'alice'));
    }

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, true, true, false, false]);
    expect(results[0].remaining).toBe(4);
    expect(results[4].remaining).toBe(0);
  });

  it('keeps one identity budget separate from another', async () => {
    for (let attempt = 0; attempt < 5; attempt++) {
      await checkSignInRateLimit('1.2.3.4', 'alice');
    }

    expect((await checkSignInRateLimit('1.2.3.4', 'alice')).allowed).toBe(false);
    expect((await checkSignInRateLimit('1.2.3.4', 'bob')).allowed).toBe(true);
    expect((await checkSignInRateLimit('5.6.7.8', 'alice')).allowed).toBe(true);
  });

  it('frees the budget again once the window has passed', async () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      await checkSignInRateLimit('1.2.3.4', 'alice');
    }
    expect((await checkSignInRateLimit('1.2.3.4', 'alice')).allowed).toBe(false);

    // Age the window rather than waiting fifteen minutes for it.
    await windows().updateOne(
      { _id: 'signin:1.2.3.4:alice' as never },
      { $set: { resetAt: new Date(Date.now() - 1000) } }
    );

    const next = await checkSignInRateLimit('1.2.3.4', 'alice');
    expect(next.allowed).toBe(true);
    expect(next.remaining).toBe(4);
  });

  it('is cleared by a successful sign-in', async () => {
    for (let attempt = 0; attempt < 6; attempt++) {
      await checkSignInRateLimit('1.2.3.4', 'alice');
    }
    await resetRateLimit('signin', '1.2.3.4:alice');
    expect((await checkSignInRateLimit('1.2.3.4', 'alice')).allowed).toBe(true);
  });
});

describe('shared state across callers', () => {
  // The point of the whole change: an in-process counter gave every serverless
  // instance its own budget, so the limit multiplied by instance count.
  it('counts hits from separate callers against one budget', async () => {
    const first = Array.from({ length: 20 }, () => checkGroupWriteRateLimit('alice'));
    const second = Array.from({ length: 20 }, () => checkGroupWriteRateLimit('alice'));
    const results = await Promise.all([...first, ...second]);

    expect(results.filter((r) => r.allowed)).toHaveLength(30);
    expect(results.filter((r) => !r.allowed)).toHaveLength(10);
  });

  // Concurrent requests must not each decide the window has expired and start
  // a fresh one, which would reset the count and let everyone through.
  it('opens exactly one window under concurrent first hits', async () => {
    await Promise.all(Array.from({ length: 12 }, () => checkGroupWriteRateLimit('bob')));

    const stored = await windows()
      .find({ _id: 'group-write:bob' as never })
      .toArray();
    expect(stored).toHaveLength(1);
    expect(stored[0].count).toBe(12);
  });
});

describe('resilience', () => {
  it('lets requests through when the database is unreachable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const mongodb = await import('@/lib/mongodb');
    vi.spyOn(mongodb, 'getCollection').mockRejectedValueOnce(new Error('unreachable'));

    const result = await checkSignInRateLimit('1.2.3.4', 'carol');
    expect(result.allowed).toBe(true);

    vi.restoreAllMocks();
  });
});

describe('getClientIp', () => {
  it('prefers the first hop of x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2', 'x-real-ip': '3.3.3.3' });
    expect(getClientIp(headers)).toBe('1.1.1.1');
  });

  it('falls back to x-real-ip, then to a placeholder', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3');
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});
