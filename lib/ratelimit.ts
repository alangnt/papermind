/**
 * In-memory rate limiting using sliding window algorithm
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if rate limit is exceeded
   * @param key - Unique identifier (e.g., "signin:192.168.1.1:username")
   * @param limit - Maximum number of attempts
   * @param windowMs - Time window in milliseconds
   * @returns Object with allowed status and remaining attempts
   */
  check(key: string, limit: number, windowMs: number): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.store.get(key);

    // No entry or expired entry
    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + windowMs });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowMs,
      };
    }

    // Increment count
    entry.count++;
    this.store.set(key, entry);

    const allowed = entry.count <= limit;
    const remaining = Math.max(0, limit - entry.count);

    return {
      allowed,
      remaining,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt < now) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get current count for a key
   */
  getCount(key: string): number {
    const entry = this.store.get(key);
    if (!entry || entry.resetAt < Date.now()) {
      return 0;
    }
    return entry.count;
  }

  /**
   * Destroy the rate limiter and clear interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  SIGN_IN: {
    limit: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  SIGN_UP: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  PASSWORD_RESET: {
    limit: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  PASSWORD_CHANGE: {
    limit: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

/**
 * Check rate limit for sign-in attempts
 */
export function checkSignInRateLimit(ip: string, username: string) {
  const key = `signin:${ip}:${username}`;
  return rateLimiter.check(key, RATE_LIMITS.SIGN_IN.limit, RATE_LIMITS.SIGN_IN.windowMs);
}

/**
 * Check rate limit for sign-up attempts
 */
export function checkSignUpRateLimit(ip: string) {
  const key = `signup:${ip}`;
  return rateLimiter.check(key, RATE_LIMITS.SIGN_UP.limit, RATE_LIMITS.SIGN_UP.windowMs);
}

/**
 * Check rate limit for password reset requests
 */
export function checkPasswordResetRateLimit(email: string) {
  const key = `password-reset:${email}`;
  return rateLimiter.check(key, RATE_LIMITS.PASSWORD_RESET.limit, RATE_LIMITS.PASSWORD_RESET.windowMs);
}

/**
 * Check rate limit for password change attempts
 */
export function checkPasswordChangeRateLimit(userId: string) {
  const key = `password-change:${userId}`;
  return rateLimiter.check(key, RATE_LIMITS.PASSWORD_CHANGE.limit, RATE_LIMITS.PASSWORD_CHANGE.windowMs);
}

/**
 * Reset rate limit for a specific operation
 */
export function resetRateLimit(operation: string, identifier: string) {
  const key = `${operation}:${identifier}`;
  rateLimiter.reset(key);
}

/**
 * Get client IP from request
 */
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

export default rateLimiter;
