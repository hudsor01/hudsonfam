/**
 * Best-effort in-memory sliding-window rate limiter with a hard LRU bound.
 *
 * Serverless caveat: state lives in the function instance's memory, so it
 * resets on cold start and is not shared across concurrent instances. It
 * reliably blunts a single source hammering one warm instance (the common
 * spam case) but is NOT a hard global guarantee. For distributed limits, back
 * this with Redis/Upstash (removed in Phase 30) or a Postgres table.
 *
 * Memory safety: the key set is capped at MAX_KEYS with FIFO/LRU eviction that
 * holds *regardless of timestamp freshness*, so rapid key rotation (e.g. a
 * source cycling identities) can neither grow the Map without bound nor force
 * an O(n) sweep on every request.
 */

const MAX_KEYS = 5000;
const hits = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Record a hit for `key` and report whether it is within `limit` per `windowMs`.
 *
 * @param key       Bucket identifier, e.g. `submit-memory:ip:<ip>`.
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

  // LRU touch: deleting then re-inserting moves the key to the most-recently
  // used end of the Map's insertion order, so active keys survive eviction.
  const existing = hits.get(key);
  if (existing !== undefined) hits.delete(key);
  const recent = (existing ?? []).filter((t) => t > cutoff);

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

  // Hard bound independent of timestamp freshness: evict least-recently-used
  // (oldest-inserted) keys. O(1) amortized — usually evicts 0 or 1 per call.
  while (hits.size > MAX_KEYS) {
    const oldest = hits.keys().next().value;
    if (oldest === undefined) break;
    hits.delete(oldest);
  }

  return { ok: true, remaining: limit - recent.length, retryAfterMs: 0 };
}

/** Test helper: clear all limiter state. */
export function __resetRateLimit(): void {
  hits.clear();
}

/** Test helper: current number of tracked keys (for bound assertions). */
export function __rateLimitSize(): number {
  return hits.size;
}
