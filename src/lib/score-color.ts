/**
 * Quality-score → semantic color / label helpers.
 *
 * Scale: 0–1 (LLM-judge convention). Thresholds:
 *   - score < 0.6          → low / destructive (red)
 *   - 0.6 <= score < 0.8   → medium / warning (amber)
 *   - score >= 0.8         → high / success (green)
 *
 * Scope: `cover_letters.quality_score` today; can be reused for future
 * scale-mapping surfaces (Phase 22 salary confidence, Phase 24 regenerate
 * quality deltas). If a future grader emits a 0–10 or 0–100 scale instead
 * of 0–1, update the two literal thresholds here — the `text-*` token
 * choices stay stable (they are semantic, not scale-dependent).
 *
 * Justification for default thresholds (21-RESEARCH.md §Finding #2 +
 * §Pattern 3): 0/12 cover_letters rows currently have a score, so no
 * live-DB distribution exists to fit to. 0.6 / 0.8 match the LLM-judge
 * convention from OpenAI eval cookbook + Anthropic eval docs.
 *
 * Pure functions — no state, no `new Date()`, no `window.*` — safe to
 * call from Server Components and Client Components alike.
 */

export type QualityLabel = "low" | "medium" | "high";

export function scoreColor(score: number): string {
  if (score < 0.6) return "text-destructive";
  if (score < 0.8) return "text-warning";
  return "text-success";
}

export function scoreLabel(score: number): QualityLabel {
  if (score < 0.6) return "low";
  if (score < 0.8) return "medium";
  return "high";
}
