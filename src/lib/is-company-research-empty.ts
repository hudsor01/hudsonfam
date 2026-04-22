import type { CompanyResearch } from "@/lib/jobs-db";

/**
 * Returns `true` when a company_research row exists but every LLM-derived
 * field is null / empty / zero-length. Drives the AI-RENDER-04
 * "generated but empty" branch for Company Intel in the job detail sheet.
 *
 * Research Note (21-UI-SPEC.md §3 "Open Question on company_research empty predicate"):
 *   - 0 company_research rows exist in the DB today (Phase 23 will produce
 *     the first ones via owner-triggered research workflows).
 *   - n8n's company-research workflow may emit sentinel strings such as
 *     "Could not find info" as `ai_summary` rather than null — in which
 *     case the strict all-null predicate below becomes dead code. That
 *     is acceptable for Phase 21 because the "populated" branch simply
 *     renders the sentinel verbatim; the owner still sees an accurate
 *     signal. Post-Phase-23 refinement may tighten this (e.g. treat
 *     `ai_summary === "Could not find info"` as empty).
 *
 * Conservative today: a row is "empty" only if NONE of the LLM-derived
 * columns are populated. A single populated field (even a bad one) means
 * the rich rendering path fires, giving the owner the most information.
 *
 * Pure function — hydration-safe, no side effects, no I/O.
 */
export function isCompanyResearchEmpty(cr: CompanyResearch): boolean {
  return (
    !cr.ai_summary?.trim() &&
    (!cr.tech_stack || cr.tech_stack.length === 0) &&
    !cr.recent_news?.trim() &&
    cr.glassdoor_rating === null &&
    cr.employee_count === null &&
    cr.funding_stage === null &&
    cr.salary_range_min === null &&
    cr.salary_range_max === null
  );
}
