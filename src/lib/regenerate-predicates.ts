/**
 * Per-artifact isDone predicates for the generalized RegenerateButton polling loop.
 *
 * Pure functions — no `Date.now()`, no `window.*`. `new Date(...)` calls parse
 * ISO / date strings only (G-6 extended: wall-clock reads prohibited in the
 * component that consumes these, but runtime ISO parsing is explicitly allowed
 * per Phase 23 Plan 23-06 clarification).
 *
 * `coverLetterIsDone` / `tailoredResumeIsDone`: compare ISO-8601 timestamps via
 * `getTime()` — safe against `Z` vs `+00:00` suffix drift from Postgres.
 *
 * `salaryIntelligenceIsDone`: compares `YYYY-MM-DD` date strings via UTC-midnight
 * parse (`+ "T00:00:00Z"`) to avoid TZ drift across browser locales (D-04).
 * KNOWN ROUGH EDGE: `search_date` is date-granular — same-day regenerate does
 * NOT advance `search_date`, triggering silent-success. Documented in
 * 24-SUMMARY.md as Pitfall 1; v3.2+ may add a timestamp column to disambiguate.
 *
 * All three predicates share the same null-handling contract:
 *   - `detail === null` OR the artifact is null OR the field is missing → false
 *   - `serverBaseline === null` (INSERT-wait fallback) AND the field is present → true
 *   - else → strictly-greater-than comparison on parsed Date objects
 */
import type { FreshJobDetail } from "@/lib/jobs-db";

export function coverLetterIsDone(
  detail: FreshJobDetail | null,
  serverBaseline: string | null,
): boolean {
  const current = detail?.cover_letter?.generated_at;
  if (!current) return false;
  if (serverBaseline === null) return true; // INSERT-wait: any row is progress
  return new Date(current).getTime() > new Date(serverBaseline).getTime();
}

export function tailoredResumeIsDone(
  detail: FreshJobDetail | null,
  serverBaseline: string | null,
): boolean {
  const current = detail?.tailored_resume?.generated_at;
  if (!current) return false;
  if (serverBaseline === null) return true;
  return new Date(current).getTime() > new Date(serverBaseline).getTime();
}

export function salaryIntelligenceIsDone(
  detail: FreshJobDetail | null,
  serverBaseline: string | null,
): boolean {
  // D-04: `search_date` is Postgres `date` (YYYY-MM-DD), not ISO timestamp.
  // UTC-midnight parse avoids TZ drift across browser locales.
  const current = detail?.salary_intelligence?.search_date;
  if (!current) return false;
  if (serverBaseline === null) return true;
  return (
    new Date(current + "T00:00:00Z").getTime() >
    new Date(serverBaseline + "T00:00:00Z").getTime()
  );
}
