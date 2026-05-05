/**
 * Rate-limit helper for Vercel API routes.
 *
 * Backed by Upstash Redis (free tier: 10k commands/day, more than enough for
 * counting requests). The free tier never bills, so this is safe to leave on
 * forever.
 *
 * Why we need this: /api/generate calls fal.ai at ~$0.04 per image. Without
 * a rate limit, one authenticated user with a script can drain the entire
 * fal.ai balance overnight. The auth gate alone is not enough — magic-link
 * signup is trivial to script.
 *
 * Limits applied to /api/generate (per-user):
 *   - 10 generations per rolling hour
 *   - 30 generations per rolling day
 *
 * If the Upstash env vars aren't set, this module degrades gracefully:
 * `checkRateLimit()` returns success and logs a warning, so dev environments
 * without Upstash configured can still work.
 *
 * Usage in a route handler:
 *
 *   import { checkRateLimit } from './_lib/ratelimit.js';
 *
 *   const rl = await checkRateLimit('generate', user.id);
 *   if (!rl.success) {
 *     return json(res, 429, {
 *       error: rl.message,
 *       retry_after_seconds: rl.retryAfter,
 *     });
 *   }
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis = null;
if (REDIS_URL && REDIS_TOKEN) {
  redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
} else {
  // eslint-disable-next-line no-console
  console.warn(
    '[ratelimit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set. ' +
      'Rate limiting is DISABLED. Set both env vars in Vercel before launch.'
  );
}

// Cache the limiter instances so we don't recreate them per request.
const limiters = {};

function getLimiters(routeKey, hourlyLimit, dailyLimit) {
  if (!redis) return null;
  if (!limiters[routeKey]) {
    limiters[routeKey] = {
      hourly: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(hourlyLimit, '1 h'),
        prefix: `rl:${routeKey}:hour`,
        analytics: false,
      }),
      daily: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(dailyLimit, '1 d'),
        prefix: `rl:${routeKey}:day`,
        analytics: false,
      }),
    };
  }
  return limiters[routeKey];
}

/**
 * @param {'generate'|'searchProducts'|'llm'} routeKey
 * @param {string} userId — Supabase auth user id (uuid)
 * @param {{hourly?:number, daily?:number}} [opts]
 */
export async function checkRateLimit(routeKey, userId, opts = {}) {
  const hourlyLimit = opts.hourly ?? defaults[routeKey]?.hourly ?? 60;
  const dailyLimit = opts.daily ?? defaults[routeKey]?.daily ?? 200;

  const ls = getLimiters(routeKey, hourlyLimit, dailyLimit);
  if (!ls) {
    // Upstash not configured — allow through with a flag so the caller can
    // decide to log it. Don't fail open silently in production.
    return { success: true, degraded: true };
  }

  const key = `${routeKey}:${userId}`;

  const [hourResult, dayResult] = await Promise.all([
    ls.hourly.limit(key),
    ls.daily.limit(key),
  ]);

  // The hourly limit is the most user-visible — surface that one's reset
  // time when both are blocking.
  if (!hourResult.success) {
    const retryAfter = Math.max(
      1,
      Math.ceil((hourResult.reset - Date.now()) / 1000)
    );
    return {
      success: false,
      message: `Rate limit: max ${hourlyLimit} per hour. Try again in ${formatRetry(retryAfter)}.`,
      retryAfter,
      limit: hourlyLimit,
      remaining: hourResult.remaining,
    };
  }
  if (!dayResult.success) {
    const retryAfter = Math.max(
      1,
      Math.ceil((dayResult.reset - Date.now()) / 1000)
    );
    return {
      success: false,
      message: `Daily limit reached (${dailyLimit}/day). Try again in ${formatRetry(retryAfter)}.`,
      retryAfter,
      limit: dailyLimit,
      remaining: dayResult.remaining,
    };
  }

  return {
    success: true,
    remaining: hourResult.remaining,
    limit: hourlyLimit,
  };
}

const defaults = {
  generate: { hourly: 10, daily: 30 },
  searchProducts: { hourly: 60, daily: 300 },
  llm: { hourly: 30, daily: 150 },
};

function formatRetry(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.ceil(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.ceil(m / 60);
  return `${h}h`;
}
