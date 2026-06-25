import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, __resetRateLimit, __rateLimitSize } from '@/lib/rate-limit';

describe('rateLimit (sliding window)', () => {
  beforeEach(() => {
    __resetRateLimit();
  });

  it('allows up to the limit, then blocks', () => {
    const key = 'test:1.2.3.4';
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    const fourth = rateLimit(key, 3, 60_000);
    expect(fourth.ok).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterMs).toBeGreaterThan(0);
  });

  it('isolates buckets by key', () => {
    expect(rateLimit('a', 1, 60_000).ok).toBe(true);
    expect(rateLimit('a', 1, 60_000).ok).toBe(false);
    // Different key has its own budget.
    expect(rateLimit('b', 1, 60_000).ok).toBe(true);
  });

  it('reports remaining budget', () => {
    expect(rateLimit('c', 2, 60_000).remaining).toBe(1);
    expect(rateLimit('c', 2, 60_000).remaining).toBe(0);
  });

  it('frees the window after entries expire (windowMs = 0)', () => {
    expect(rateLimit('d', 1, 0).ok).toBe(true);
    // With a zero-length window every prior hit is already expired.
    expect(rateLimit('d', 1, 0).ok).toBe(true);
  });

  it('stays bounded under key rotation even when every key is fresh', () => {
    // 20k distinct, never-expiring keys must not grow the Map without bound.
    for (let i = 0; i < 20_000; i++) {
      rateLimit(`rotate:${i}`, 5, 60_000);
    }
    expect(__rateLimitSize()).toBeLessThanOrEqual(5000);
  });
});
