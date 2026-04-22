/**
 * Locked empty-state strings for the three LLM sections (AI-RENDER-04).
 *
 * Source of truth: .planning/phases/21-polish-copy-pdf-empty-states-link-out/21-CONTEXT.md §D-12.
 *
 * Tone contract (CONTEXT.md D-12): direct, state-only. No CTAs and no
 * references to Phase-23-era UI triggers that do not exist yet.
 * One period per line. No exclamation points.
 *
 * Exported as a const map so:
 *   1. Strings are greppable for Vitest assertions without duplication
 *   2. Future localization is a single-file swap
 *   3. Refactors can't accidentally diverge the three sections' voice
 */
export const EMPTY_STATE_COPY = {
  cover_letter: {
    missing: "No cover letter yet.",
    empty: "Cover letter was generated but is empty.",
  },
  tailored_resume: {
    missing: "No tailored resume yet.",
    empty: "Tailored resume was generated but is empty.",
  },
  company_research: {
    missing: "No company research yet.",
    empty: "Company research was generated but is empty.",
  },
} as const;
