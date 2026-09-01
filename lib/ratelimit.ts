/**
 * Rate limiting, backed by MongoDB.
 *
 * This used to be an in-process Map, which does not survive the environment it
 * runs in: on serverless every instance keeps its own counters and a cold start
 * wipes them, so a documented "5 attempts per 15 minutes" was really 5 per
 * instance. Keeping the window in the database makes one limit mean one limit.
 */
import { getCollection } from '@/lib/mongodb';

interface RateLimitWindow {
  /** The limiter key, e.g. "signin:1.2.3.4:alice". */
  _id: string;
  count: number;
  resetAt: Date;
}

const COLLECTION = 'rate_limits';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Count one hit against a key and report whether it is still under the limit.
 *
 * The increment and the window roll-over happen in a single aggregation-pipeline
 * update, so concurrent requests cannot both see an expired window and each
 * start a fresh one — which is exactly how a limiter gets talked past.
 *
 * Fails open. If the database is unreachable the app is already broken in more
 * visible ways, and refusing every request would turn an outage into an outage
 * nobody can sign in to report.
 */
async function check(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const now = new Date();
  const freshReset = new Date(now.getTime() + windowMs);

  try {
    const windows = await getCollection<RateLimitWindow>(COLLECTION);
    const updated = await windows.findOneAndUpdate(
      { _id: key },
      [
        {
          $set: {
            // Still inside the window: keep counting. Otherwise this hit is the
            // first of a new one.
            count: {
              $cond: [{ $gt: ['$resetAt', now] }, { $add: ['$count', 1] }, 1],
            },
            resetAt: {
              $cond: [{ $gt: ['$resetAt', now] }, '$resetAt', freshReset],
            },
          },
        },
      ],
      { upsert: true, returnDocument: 'after' }
    );

    const count = updated?.count ?? 1;
    const resetAt = updated?.resetAt ?? freshReset;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetAt: resetAt.getTime(),
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: limit, resetAt: freshReset.getTime() };
  }
}

/** Drop a key's window — used after a successful sign-in. */
export async function resetRateLimit(operation: string, identifier: string): Promise<void> {
  try {
    const windows = await getCollection<RateLimitWindow>(COLLECTION);
    await windows.deleteOne({ _id: `${operation}:${identifier}` });
  } catch (error) {
    console.error('Rate limit reset error:', error);
  }
}

const RATE_LIMITS = {
  SIGN_IN: { limit: 5, windowMs: 15 * 60 * 1000 },
  SIGN_UP: { limit: 3, windowMs: 60 * 60 * 1000 },
  PASSWORD_RESET: { limit: 3, windowMs: 60 * 60 * 1000 },
  PASSWORD_CHANGE: { limit: 5, windowMs: 60 * 60 * 1000 },
  SEARCH: { limit: 20, windowMs: 60 * 1000 },
  ASK_AI: { limit: 10, windowMs: 60 * 1000 },
  GROUP_WRITE: { limit: 30, windowMs: 60 * 1000 },
} as const;

export function checkSignInRateLimit(ip: string, username: string) {
  return check(`signin:${ip}:${username}`, RATE_LIMITS.SIGN_IN.limit, RATE_LIMITS.SIGN_IN.windowMs);
}

export function checkSignUpRateLimit(ip: string) {
  return check(`signup:${ip}`, RATE_LIMITS.SIGN_UP.limit, RATE_LIMITS.SIGN_UP.windowMs);
}

export function checkPasswordResetRateLimit(email: string) {
  return check(
    `password-reset:${email}`,
    RATE_LIMITS.PASSWORD_RESET.limit,
    RATE_LIMITS.PASSWORD_RESET.windowMs
  );
}

export function checkPasswordChangeRateLimit(userId: string) {
  return check(
    `password-change:${userId}`,
    RATE_LIMITS.PASSWORD_CHANGE.limit,
    RATE_LIMITS.PASSWORD_CHANGE.windowMs
  );
}

export function checkSearchRateLimit(ip: string) {
  return check(`search:${ip}`, RATE_LIMITS.SEARCH.limit, RATE_LIMITS.SEARCH.windowMs);
}

/** Tighter than SEARCH because each call costs Groq credits. */
export function checkAskAiRateLimit(ip: string) {
  return check(`askai:${ip}`, RATE_LIMITS.ASK_AI.limit, RATE_LIMITS.ASK_AI.windowMs);
}

/**
 * Keyed on the username rather than the IP: these routes are authenticated, and
 * the thing worth bounding is one account creating groups or spamming invites.
 */
export function checkGroupWriteRateLimit(username: string) {
  return check(
    `group-write:${username}`,
    RATE_LIMITS.GROUP_WRITE.limit,
    RATE_LIMITS.GROUP_WRITE.windowMs
  );
}

/** Get client IP from request */
export function getClientIp(headers: Headers): string {
  // Check common headers for real IP (when behind proxy/CDN)
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to connection IP (not reliable behind proxies)
  return 'unknown';
}
