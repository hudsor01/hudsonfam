"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchJobDetail } from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";
import type { FreshJobDetail } from "@/lib/jobs-db";

/**
 * Return contract for every regenerate Server Action — discriminated union
 * matching `regenerateCoverLetter` (Plan 23-02) + `regenerateTailoredResume`
 * and `regenerateSalaryIntelligence` (Plan 24-02). The `action` prop below
 * accepts any function of this shape.
 */
type RegenerateResult =
  | { ok: true; baseline: string | null }
  | { ok: false; sentinel: ErrorSentinel };

interface RegenerateButtonProps {
  /** Job ID threaded to the injected Server Action. */
  jobId: number;
  /**
   * Discriminator — kept on the props so plan-level grep gates and future
   * per-artifact UX customizations (e.g. icon swap) can branch on it. The
   * component's core polling / state-machine logic is artifact-agnostic;
   * per-artifact behavior is provided by the `isDone` predicate prop.
   */
  artifact: "cover_letter" | "tailored_resume" | "salary_intelligence";
  /** Verbatim button label — passed by parent from ROADMAP SC (G-5). */
  label: string;
  /** Server Action injected at the mount site (D-01). */
  action: (jobId: number) => Promise<RegenerateResult>;
  /** Per-artifact pure predicate (D-02). Extracted to `@/lib/regenerate-predicates`. */
  isDone: (
    detail: FreshJobDetail | null,
    serverBaseline: string | null,
  ) => boolean;
  /**
   * Fallback baseline used only when the Server Action returns
   * `baseline: null` (INSERT-wait case). The client NEVER reads the wall
   * clock — G-6 (extended, D-10) asserts zero wall-clock millisecond-API
   * occurrences in this file. For `cover_letter` / `tailored_resume`
   * this is an ISO-8601 timestamp; for `salary_intelligence` it is a
   * `YYYY-MM-DD` date string (D-04). Nullable to accommodate parents
   * that know no prior artifact exists for the job.
   */
  baselineGeneratedAt: string | null;
}

/**
 * 4-state machine (D-06) — mutually exclusive terminal variants. The
 * discriminated-union narrowing in the render tree enforces at-most-one
 * helper `<p>` visible at any time (error OR silent-success, never both).
 */
type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string | null }
  | { kind: "error"; sentinel: ErrorSentinel }
  | { kind: "silent-success" };

/**
 * Owner-triggered button that fires one of three Server Actions
 * (`regenerateCoverLetter` / `regenerateTailoredResume` /
 * `regenerateSalaryIntelligence`) and polls `fetchJobDetail(jobId)` every
 * 3s until the per-artifact `isDone` predicate returns true. Hard-caps
 * at 60 polls (180s) — on cap exhaustion, the `in-progress` state
 * transitions to `silent-success` (D-06 fork), NOT an error sentinel.
 *
 * State machine (UI-SPEC §Component Contracts 1):
 *   idle → in-progress{serverBaseline} on Server Action ok=true
 *   idle → error{sentinel} on Server Action ok=false
 *   in-progress → idle on isDone(detail, serverBaseline) === true
 *   in-progress → silent-success on 60-poll cap (D-06 fork — webhook
 *                 reported success but artifact didn't advance)
 *   error → in-progress on re-click
 *   silent-success → in-progress on re-click
 *
 * The `in-progress` state is only reachable from a `{ok: true}` Server
 * Action response — a failed webhook goes directly to `error` without
 * ever entering `in-progress`. Therefore the 60-cap exit can only be
 * reached when the server originally reported success. Mutual exclusion
 * between `error` and `silent-success` is a consequence of this state-
 * machine shape, not a runtime check.
 *
 * D-06 amended (client-clock prohibition — G-6 extended per D-10):
 *   The baseline used by `isDone` is ALWAYS a server-side string. First
 *   preference: the `baseline` field returned in `{ok: true, baseline}`.
 *   Second preference (only when the row was null): the
 *   `baselineGeneratedAt` prop. The wall-clock millisecond API never
 *   appears in this file — a regex test asserts the count is zero.
 *   `new Date(...)` is called inside the `isDone` predicates (extracted
 *   to @/lib/regenerate-predicates) to parse ISO / date strings only.
 *
 * Accessibility (G-1): `aria-busy={isPolling}` surfaces polling state.
 *
 * Sentinel display (G-3): `{state.sentinel}` rendered verbatim as
 * `Error: {sentinel}` — no client-side rewriting.
 *
 * Silent-success helper (G-8 NEW): the verbatim SC #3 copy appears
 * EXACTLY ONCE in this file's source — inside the render branch below.
 * The em-dash is U+2014, period-terminated, no exclamation (anti-CTA
 * per Plan 21-06). A grep test asserts the source count is 1; a DOM
 * assertion test asserts the string renders on the state transition.
 *
 * Color posture (G-2): only semantic tokens (`text-muted-foreground`,
 * `text-destructive`, `text-warning`) from globals.css; zero raw
 * Tailwind color class names.
 *
 * Pitfall 6 (unmount during poll): `useEffect` cleanup clearIntervals on
 * unmount — critical for sheet-close-mid-poll.
 */
export function RegenerateButton({
  jobId,
  artifact: _artifact,
  label,
  action,
  isDone,
  baselineGeneratedAt,
}: RegenerateButtonProps) {
  // `_artifact` is accepted to lock the props contract (and enable future
  // per-artifact customizations) but the core state-machine logic here is
  // artifact-agnostic — per-artifact semantics live in the `isDone` prop.
  void _artifact;

  const [state, setState] = useState<ButtonState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount — critical for sheet-close-mid-poll (Pitfall 6).
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  const isPolling = state.kind === "in-progress";
  const isDisabled = isPolling || isPending;

  const startPolling = (serverBaseline: string | null) => {
    pollCountRef.current = 0;
    intervalRef.current = setInterval(() => {
      pollCountRef.current += 1;
      const currentCount = pollCountRef.current;
      void fetchJobDetail(jobId)
        .then((detail) => {
          // Per-artifact predicate call (D-01) — `isDone` is a prop.
          // The predicate parses ISO / date strings via `new Date(...)`;
          // no wall-clock read (G-6 extended).
          if (isDone(detail, serverBaseline)) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setState({ kind: "idle" });
            return;
          }
          // D-06 fork: 60-poll cap → silent-success (NOT error). The
          // `in-progress` state is only reachable after the Server
          // Action returned ok=true, so reaching the cap means the
          // webhook reported success but the artifact never advanced.
          if (currentCount >= 60) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setState({ kind: "silent-success" });
          }
        })
        .catch(() => {
          // Transient poll failures don't abort — they count against
          // the cap. 60-cap is the single exit; same silent-success
          // disposition applies because in-progress implies ok=true.
          if (currentCount >= 60) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setState({ kind: "silent-success" });
          }
        });
    }, 3000); // D-05 cadence: 3 seconds
  };

  const handleClick = () => {
    startTransition(async () => {
      const res = await action(jobId);
      if (!res.ok) {
        // G-3: sentinel rendered verbatim below — no rewriting here.
        setState({ kind: "error", sentinel: res.sentinel });
        return;
      }
      // D-06 amended: prefer server-returned baseline; fall back to
      // the prop when the server returns null (INSERT-wait case).
      const serverBaseline = res.baseline ?? baselineGeneratedAt;
      setState({ kind: "in-progress", serverBaseline });
      startPolling(serverBaseline);
    });
  };

  return (
    <div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isDisabled}
        className={isPolling ? "text-muted-foreground" : ""}
        aria-busy={isPolling}
      >
        {isPolling ? <Loader2 className="animate-spin" /> : <RefreshCw />}
        {label}
      </Button>
      {state.kind === "error" && (
        <p className="text-destructive text-xs mt-1">
          Error: {state.sentinel}
        </p>
      )}
      {state.kind === "silent-success" && (
        <p className="text-warning text-xs mt-1 italic">
          Regeneration reported success but no new content was written — check n8n logs.
        </p>
      )}
    </div>
  );
}
