/**
 * Provenance helpers — Phase 22 AI-RENDER-07.
 *
 * Pure functions — no state, no `new Date()`, no `window.*` — safe to
 * call from Server Components and Client Components alike.
 *
 * Pattern precedent: src/lib/score-color.ts (Plan 21-05).
 *
 * The 4-source union maps to 3 semantic tokens following the "color ≈
 * confidence" principle locked in CONTEXT.md D-10:
 *
 *   scraped           text-muted-foreground  (raw feed data; lowest trust)
 *   llm               text-warning           (LLM estimate; needs scrutiny)
 *   company_research  text-success           (LLM researched from public signals; higher trust)
 *   original_posting  text-muted-foreground  (reserved — parity with scraped; not actively rendered Phase 22)
 */

export type ProvenanceSource =
  | "scraped"
  | "llm"
  | "company_research"
  | "original_posting";

/**
 * Returns a Tailwind semantic-token class name for the Badge text color.
 * Uses switch for exhaustiveness — TS flags adding a 5th source without
 * updating this function.
 */
export function provenanceColor(source: ProvenanceSource): string {
  switch (source) {
    case "company_research":
      return "text-success";
    case "llm":
      return "text-warning";
    case "scraped":
    case "original_posting":
      return "text-muted-foreground";
  }
}

/**
 * Returns the verbatim visible badge label per UI-SPEC §Copywriting Contract.
 * Title case is deliberately NOT used — "scraped" / "LLM estimate" /
 * "company research" / "posted" match the locked copy.
 */
export function provenanceLabel(source: ProvenanceSource): string {
  switch (source) {
    case "scraped":
      return "scraped";
    case "llm":
      return "LLM estimate";
    case "company_research":
      return "company research";
    case "original_posting":
      return "posted";
  }
}
