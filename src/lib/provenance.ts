/**
 * Provenance helpers — Phase 22 AI-RENDER-07.
 *
 * Pure functions — no state, no `new Date()`, no `window.*` — safe to
 * call from Server Components and Client Components alike.
 *
 * Pattern precedent: src/lib/score-color.ts (Plan 21-05).
 *
 * 3 sources map to 3 semantic tokens following the "color ≈ confidence"
 * principle locked in CONTEXT.md D-10:
 *
 *   scraped           text-muted-foreground  (raw feed data; lowest trust)
 *   llm               text-warning           (LLM estimate; needs scrutiny)
 *   company_research  text-success           (LLM researched from public signals; higher trust)
 *
 * CONTEXT.md D-09 enumerated a 4th "original_posting" source (quoted from
 * the job posting description). It was dropped during Phase 22 closure —
 * no pipeline extracts salaries from `jobs.description` today and no
 * future phase in the roadmap renders it. The phase that ships that
 * feature should re-add the source with color + label + tooltip decided
 * with real context, not a speculative default.
 */

export type ProvenanceSource = "scraped" | "llm" | "company_research";

/**
 * Returns a Tailwind semantic-token class name for the Badge text color.
 * Uses switch for exhaustiveness — TS flags adding a new source without
 * updating this function.
 */
export function provenanceColor(source: ProvenanceSource): string {
  switch (source) {
    case "company_research":
      return "text-success";
    case "llm":
      return "text-warning";
    case "scraped":
      return "text-muted-foreground";
  }
}

/**
 * Returns the verbatim visible badge label per UI-SPEC §Copywriting Contract.
 * Title case is deliberately NOT used — "scraped" / "LLM estimate" /
 * "company research" match the locked copy.
 */
export function provenanceLabel(source: ProvenanceSource): string {
  switch (source) {
    case "scraped":
      return "scraped";
    case "llm":
      return "LLM estimate";
    case "company_research":
      return "company research";
  }
}
