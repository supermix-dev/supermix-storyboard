import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

type RateLimitMetrics = {
  limit: number;
  remaining: number;
  reset: number;
  windowMs: number;
};

export type RateLimitCheckResult = {
  success: boolean;
  metrics: RateLimitMetrics;
  usingFallback: boolean;
};

type RateLimitOptions = {
  identifier?: string | null;
  maxRequests?: number;
  windowMs?: number;
  namespace?: string;
};

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 20;
const DEFAULT_NAMESPACE = 'rate-limit';

const upstashConfigured =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

const redis = upstashConfigured ? Redis.fromEnv() : null;

type GlobalRateLimitState = typeof globalThis & {
  __rateLimiters?: Map<string, Ratelimit>;
};

const globalState = globalThis as GlobalRateLimitState;

if (!globalState.__rateLimiters) {
  globalState.__rateLimiters = new Map();
}

const limiterCache = globalState.__rateLimiters;

function getUpstashLimiter(
  namespace: string,
  maxRequests: number,
  windowMs: number
) {
  if (!redis) {
    return null;
  }

  const limiterKey = `${namespace}:${maxRequests}:${windowMs}`;

  if (!limiterCache.has(limiterKey)) {
    limiterCache.set(
      limiterKey,
      new Ratelimit({
        redis,
        prefix: `ratelimit:${namespace}`,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs} ms`),
      })
    );
  }

  return limiterCache.get(limiterKey)!;
}

type InMemoryEntry = {
  count: number;
  resetTime: number;
};

const fallbackStore: Record<string, InMemoryEntry> = Object.create(null);

export async function enforceRateLimit(
  options: RateLimitOptions
): Promise<RateLimitCheckResult> {
  const identifier =
    typeof options.identifier === 'string' &&
    options.identifier.trim().length > 0
      ? options.identifier.trim()
      : 'anonymous';

  const maxRequests =
    typeof options.maxRequests === 'number' && options.maxRequests > 0
      ? options.maxRequests
      : DEFAULT_MAX_REQUESTS;

  const windowMs =
    typeof options.windowMs === 'number' && options.windowMs > 0
      ? options.windowMs
      : DEFAULT_WINDOW_MS;

  const namespace =
    typeof options.namespace === 'string' && options.namespace.length > 0
      ? options.namespace
      : DEFAULT_NAMESPACE;

  const key = `${namespace}:${identifier}`;

  const upstashLimiter = getUpstashLimiter(namespace, maxRequests, windowMs);

  if (upstashLimiter) {
    try {
      const result = await upstashLimiter.limit(key);
      return {
        success: result.success,
        metrics: {
          limit: result.limit,
          remaining: result.remaining,
          reset:
            typeof result.reset === 'number'
              ? result.reset * 1000
              : Date.now() + windowMs,
          windowMs,
        },
        usingFallback: false,
      };
    } catch (error) {
      console.warn(
        'Shared rate limiter failed, falling back to in-memory limiter.',
        error
      );
    }
  }

  const now = Date.now();
  const existing = fallbackStore[key];

  if (!existing || now >= existing.resetTime) {
    fallbackStore[key] = {
      count: 1,
      resetTime: now + windowMs,
    };

    return {
      success: true,
      metrics: {
        limit: maxRequests,
        remaining: maxRequests - 1,
        reset: fallbackStore[key].resetTime,
        windowMs,
      },
      usingFallback: true,
    };
  }

  if (existing.count >= maxRequests) {
    return {
      success: false,
      metrics: {
        limit: maxRequests,
        remaining: 0,
        reset: existing.resetTime,
        windowMs,
      },
      usingFallback: true,
    };
  }

  existing.count += 1;

  return {
    success: true,
    metrics: {
      limit: maxRequests,
      remaining: Math.max(0, maxRequests - existing.count),
      reset: existing.resetTime,
      windowMs,
    },
    usingFallback: true,
  };
}
