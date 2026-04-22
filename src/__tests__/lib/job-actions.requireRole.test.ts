import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// NOTE: This test file is written in Wave 1 (parallel with Plan 23-01) as a
// contract assertion. It should be run in its final state AFTER Plan 23-03
// completes (fireWebhook deleted + 2 new exports added). If run against the
// pre-23-03 source:
//   - requireRole adjacency test: passes (existing 5 exports all comply; new
//     exports not yet written, so no violations to detect)
//   - fireWebhook deletion test: FAILS (expected RED until Plan 23-03 lands)
// This RED state confirms the G-7 test is non-trivial. See 23-VALIDATION.md.

const ACTIONS_PATH = path.join(process.cwd(), "src/lib/job-actions.ts");
const source = readFileSync(ACTIONS_PATH, "utf-8");
const lines = source.split("\n");

/**
 * CI grep gate — D-12 (CONTEXT.md) / Pitfall 9:
 *
 * Every `export async function` in src/lib/job-actions.ts MUST contain
 * `await requireRole(["owner"])` within 10 source lines of its signature line.
 * This asserts the first-line invariant at CI level — new Server Actions that
 * omit the call will fail this test before reaching review or merge.
 *
 * Analog: Phase 22 Plan 22-07 job-detail-sheet.test.tsx adjacency pattern.
 */
describe("job-actions.ts — requireRole adjacency (Pitfall 9 / D-12)", () => {
  it('every `export async function` has `await requireRole(["owner"])` within 10 lines of signature', () => {
    const violations: { line: number; fn: string }[] = [];

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^export\s+async\s+function\s+(\w+)/);
      if (!match) continue;

      const fnName = match[1];
      // Slice from current line through next 10 lines (11 lines total covers
      // the signature + async requireRole first-line invariant even if the
      // function has a multi-line signature or JSDoc above the first statement)
      const window = lines
        .slice(i, Math.min(i + 11, lines.length))
        .join("\n");

      if (
        !/await\s+requireRole\s*\(\s*\[\s*["']owner["']\s*\]\s*\)/.test(window)
      ) {
        violations.push({ line: i + 1, fn: fnName });
      }
    }

    expect(
      violations,
      `Functions missing requireRole(["owner"]) within 10 lines of signature:\n` +
        violations.map((v) => `  ${v.fn} @ line ${v.line}`).join("\n"),
    ).toEqual([]);
  });
});

/**
 * G-7 grep gate — D-11:
 *
 * The `fireWebhook` internal helper was deleted in Plan 23-03. Any resurrection
 * (copy-paste, revert, accidental add-back) must fail CI immediately.
 *
 * Companion to the requireRole gate above — both enforce Phase 23 invariants.
 *
 * EXPECTED TRANSIENT RED: Until Plan 23-03 lands, fireWebhook is still present
 * in job-actions.ts (helper definition at ~line 25-38 + 3 call sites). This
 * test will FAIL until Plan 23-03 deletes the helper + retrofits the 3 sites
 * to sendSignedWebhook. The RED state here is the whole point — it proves the
 * assertion has teeth. See plan 23-04 Task 23-04-01 action block.
 */
describe("job-actions.ts — fireWebhook fully deleted (G-7 / D-11)", () => {
  it("fireWebhook does not appear anywhere in job-actions.ts source", () => {
    expect(
      source,
      "fireWebhook was resurrected — delete it; use sendSignedWebhook instead (D-11 / G-7)",
    ).not.toMatch(/\bfireWebhook\b/);
  });
});
