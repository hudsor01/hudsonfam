/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * Serverless caveat: state lives in the function instance's memory, so it
 * resets on cold start and is not shared across concurrent instances. It
 * reliably blunts a single source hammering one warm instance (the common
 * spam case) but is NOT a hard global guarantee. For distributed limits, back
 * this with Redis/Upstash (removed in Phase 30) or a Postgres table.
 */

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Record a hit for `key` and report whether it is within `limit` per `windowMs`.
 *
 * @param key       Bucket identifier, e.g. `submit-memory:<ip>`.
 * @param limit     Max allowed hits within the window.
 * @param windowMs  Sliding window length in milliseconds.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  // Opportunistically drop fully-expired buckets so the Map stays bounded
  // even under many distinct keys (e.g. a distributed source).
  if (hits.size > 1000) {
    for (const [k, ts] of hits) {
      if (ts.length === 0 || ts[ts.length - 1] <= cutoff) hits.delete(k);
    }
  }

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (recent.length >= limit) {
    hits.set(key, recent);
    return {
      ok: false,
      remaining: 0,
      retryAfterMs: recent[0] + windowMs - now,
    };
  }

  recent.push(now);
  hits.set(key, recent);
  return { ok: true, remaining: limit - recent.length, retryAfterMs: 0 };
}

/** Test helper: clear all limiter state. */
export function __resetRateLimit(): void {
  hits.clear();
}
