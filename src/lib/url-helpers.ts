/**
 * Pure URL-normalization helper for the company link-out (AI-RENDER-06).
 *
 * Lives at the lib tier so it's unit-testable in isolation. No network
 * calls, no DOM, no env access — just string → string | null. Feed
 * behavior into a conditional `<a href>` wrap in the component.
 *
 * Rules (21-CONTEXT.md D-22):
 *   - Already has http:// or https:// (case-insensitive) → pass through as-is
 *   - Empty string, whitespace-only, `"-"`, `"N/A"` / `"n/a"`, `"null"`,
 *     `"undefined"`, or no-dot string → return null
 *   - Otherwise, if shape matches bare-domain (≥1 dot, 2+ letter TLD, no
 *     whitespace) → prepend `https://`
 *
 * Security: `javascript:`, `data:`, and `file:` URIs all FAIL the
 * `^https?:\/\/` check (their scheme includes a colon, not a protocol)
 * AND fail the bare-domain regex (no plausible domain shape). Net effect:
 * malicious schemes return `null`. Caller wraps in
 * `<a target="_blank" rel="noopener noreferrer">` which prevents
 * tabnabbing even if a rogue URL slips through (T-21-07-01 defense in depth).
 *
 * This function is pure: no fetch, no DNS, no redirect following, no
 * `URL()` constructor (which can throw on malformed inputs). Reachability
 * is explicitly NOT validated — that's by design per D-23.
 */
export function normalizeUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "-") return null;
  if (/^(n\/a|null|undefined)$/i.test(trimmed)) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Require: at least one dot, no whitespace, 2+ letter TLD after the last dot
  if (/^[^\s]+\.[a-z]{2,}(\/.*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return null;
}
