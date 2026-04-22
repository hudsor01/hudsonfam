import type { ArtifactFreshness } from "@/lib/jobs-db";
import { isStale } from "@/lib/job-freshness";

const DATE_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Chicago",
  month: "numeric",
  day: "numeric",
  year: "2-digit",
});

/**
 * Attach pre-computed freshness (generatedDate, isStale, ageDays) to an
 * artifact server-side. Handles three field names — `generated_at` (cover
 * letter, tailored resume), `created_at` (company research), and
 * `search_date` (salary intelligence — "when the market was sampled") —
 * without a schema-level transform.
 *
 * Formats `generatedDate` as M/D/YY via Intl.DateTimeFormat with the
 * America/Chicago timezone (CLAUDE.md §Key Decisions).
 *
 * Lives in its own module (not inside `job-actions.ts` which is marked
 * `"use server"` and so can only export async functions). Re-exported by
 * `job-actions.ts` for the production caller (`fetchJobDetail`) and
 * imported directly by the vitest suite.
 *
 * Silent on malformed input: an unparseable ISO string yields zeroed
 * freshness rather than throwing, so a malformed row never blows up render.
 */
export function attachFreshness<
  T extends { generated_at: string } | { created_at: string } | { search_date: string }
>(
  artifact: T | null,
  thresholdDays: number
): (T & { freshness: ArtifactFreshness }) | null {
  if (!artifact) return null;
  // Dispatch order: generated_at (cover_letter, tailored_resume) → search_date
  // (salary_intelligence — "when the market was sampled") → created_at
  // (company_research — persistence time is best-available signal).
  const iso =
    "generated_at" in artifact
      ? (artifact as { generated_at: string }).generated_at
      : "search_date" in artifact
        ? (artifact as { search_date: string }).search_date
        : (artifact as { created_at: string }).created_at;
  const generated = new Date(iso);
  if (Number.isNaN(generated.getTime())) {
    return {
      ...artifact,
      freshness: { generatedDate: "", isStale: false, ageDays: 0 },
    } as T & { freshness: ArtifactFreshness };
  }
  const ageDays = Math.max(
    0,
    Math.floor((Date.now() - generated.getTime()) / 86_400_000)
  );
  return {
    ...artifact,
    freshness: {
      generatedDate: DATE_FMT.format(generated),
      isStale: isStale(iso, thresholdDays),
      ageDays,
    },
  } as T & { freshness: ArtifactFreshness };
}
