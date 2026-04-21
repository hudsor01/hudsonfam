/**
 * Pure freshness utility for LLM-generated artifacts.
 *
 * Design principles:
 * - Server-side only (caller computes result, passes boolean to client).
 *   Avoids hydration mismatch from client-side `new Date()`.
 * - Silent on bad input: null / unparseable timestamps return false rather than
 *   throwing, so a malformed row never blows up a page render.
 * - Pure: accepts an optional `now` injection for deterministic tests.
 *
 * Per CONTEXT.md D-01, each AI artifact has its own stale threshold:
 *   cover_letter         14 days (hiring moves fast)
 *   tailored_resume      14 days (tied to cover letter lifecycle)
 *   company_research     60 days (company facts change slowly)
 *   salary_intelligence  30 days (market data mid-velocity)
 */

export const STALE_THRESHOLDS = {
  cover_letter: 14,
  tailored_resume: 14,
  company_research: 60,
  salary_intelligence: 30,
} as const;

export type ArtifactKind = keyof typeof STALE_THRESHOLDS;

/**
 * Returns true if `timestamp` is older than `thresholdDays` relative to `now`.
 *
 * - `null` timestamps → false (never stale; nothing to compare).
 * - Unparseable timestamp strings → false (silent fallback; never throw).
 * - Exactly at the boundary (age === threshold) → true (inclusive).
 *
 * @param timestamp ISO-8601 timestamp or null
 * @param thresholdDays integer day count from STALE_THRESHOLDS (or ad-hoc)
 * @param now reference "now" — defaults to new Date(); inject in tests
 */
export function isStale(
  timestamp: string | null,
  thresholdDays: number,
  now: Date = new Date()
): boolean {
  if (!timestamp) return false;
  const generated = new Date(timestamp);
  if (Number.isNaN(generated.getTime())) return false;
  const ageDays = (now.getTime() - generated.getTime()) / 86_400_000;
  return ageDays >= thresholdDays;
}
