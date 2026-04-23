"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  regenerateCoverLetter,
  fetchJobDetail,
} from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";
import type { FreshJobDetail } from "@/lib/jobs-db";

interface RegenerateCoverLetterButtonProps {
  /** Job ID to pass to the regenerateCoverLetter Server Action. */
  jobId: number;
  /**
   * Fallback baseline (pre-webhook `cover_letters.generated_at` ISO string)
   * used only when the Server Action returns `baseline: null` — i.e. the
   * INSERT-wait case where no prior cover letter exists. On every successful
   * call the server also returns the authoritative baseline inside its
   * response, and that value takes precedence (D-06 amended).
   *
   * The client NEVER reads the wall clock for this baseline — G-6 grep
   * asserts zero occurrences of the wall-clock API in this file's source.
   */
  baselineGeneratedAt: string;
}

type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress"; serverBaseline: string }
  | { kind: "error"; sentinel: ErrorSentinel };

/**
 * Returns true when the cover letter has been regenerated past the given
 * baseline. The `new Date()` parses lives inside the predicate body — never at
 * render time — so the file remains free of client-clock reads (G-6). ISO-8601
 * lexicographic ordering would be sufficient for the stable Postgres output
 * format, but comparing `Date` instances is spec-safe against any harmless
 * formatting drift (trailing-millisecond differences, Z vs +00:00 suffixes).
 */
function isDone(
  detail: FreshJobDetail | null,
  serverBaseline: string,
): boolean {
  if (!detail?.cover_letter?.generated_at) return false;
  return (
    new Date(detail.cover_letter.generated_at).getTime() >
    new Date(serverBaseline).getTime()
  );
}

/**
 * Owner-triggered button that kicks off the `regenerate-cover-letter` n8n
 * workflow for a job, captures the server-returned `baseline` (pre-webhook
 * `cover_letters.generated_at` ISO string), then polls `fetchJobDetail(jobId)`
 * every 3s until `detail.cover_letter.generated_at > baseline` (UPDATE-wait
 * predicate per CONTEXT.md D-06 amended). Hard-caps at 60 polls (180s) and
 * surfaces the `"unavailable"` sentinel when the cap is reached (D-05).
 *
 * State machine (UI-SPEC §Component Contracts 2):
 *   idle → in-progress{serverBaseline} → (idle on UPDATE | error on sentinel
 *                                         | error on 60-poll cap)
 *   error → in-progress on re-click
 *
 * Unlike `TriggerCompanyResearchButton` (Plan 23-05), this button REMAINS
 * visible after success because regeneration is repeatable — the parent
 * renders it inside the `populated` branch of the Cover Letter section, so
 * returning to `idle` surfaces the fresh button, not an unmount.
 *
 * D-06 amended (client-clock prohibition — G-6):
 *   - The baseline used by the predicate is ALWAYS a server-side ISO string.
 *     First preference: the `baseline` field returned in
 *     `regenerateCoverLetter`'s `{ ok: true, baseline }` response (the
 *     pre-webhook DB read). Second preference (only when the row was null):
 *     the `baselineGeneratedAt` prop provided by the parent, which itself
 *     originates from the server-rendered `detail.cover_letter?.generated_at`.
 *   - The wall-clock millisecond API never appears in this file — a regex
 *     test asserts the count is zero. `new Date(...)` is called inside
 *     `isDone` to parse ISO strings only, never to read the current time.
 *
 * Accessibility (G-1):
 *   - `aria-busy={isPolling}` surfaces the polling state to screen readers.
 *   - `disabled={isDisabled}` prevents double-fires.
 *
 * Sentinel display (G-3):
 *   - 4-value `ErrorSentinel` union rendered verbatim as `Error: {sentinel}`.
 *
 * Color posture (G-2):
 *   - Only semantic tokens (`text-muted-foreground`, `text-destructive`) from
 *     globals.css; zero raw Tailwind color class names in this file.
 *
 * Label (G-5):
 *   - "Regenerate cover letter" rendered verbatim from ROADMAP SC #2 — the
 *     label text is stable across idle / in-progress / error states.
 *
 * Pitfall 6 (unmount during poll):
 *   - `useEffect` cleanup clearIntervals on unmount — critical for the
 *     sheet-close-mid-poll flow where the parent Sheet unmounts while the
 *     interval is active.
 */
export function RegenerateCoverLetterButton({
  jobId,
  baselineGeneratedAt,
}: RegenerateCoverLetterButtonProps) {
  const [state, setState] = useState<ButtonState>({ kind: "idle" });
  const [isPending, startTransition] = useTransition();
  const pollCountRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount — critical for sheet-close-mid-poll (RESEARCH.md §Pitfall 6).
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

  const startPolling = (serverBaseline: string) => {
    pollCountRef.current = 0;
    intervalRef.current = setInterval(() => {
      pollCountRef.current += 1;
      const currentCount = pollCountRef.current;
      void fetchJobDetail(jobId)
        .then((detail) => {
          // UPDATE-wait predicate (D-06 amended): polling completes once
          // `detail.cover_letter.generated_at` advances past the server
          // baseline. `isDone` parses ISO strings via `new Date(...)`; no
          // wall-clock read (G-6).
          if (isDone(detail, serverBaseline)) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            // Button stays visible — regenerate is repeatable (unlike
            // TriggerCompanyResearchButton which unmounts on INSERT).
            setState({ kind: "idle" });
            return;
          }
          // D-05 cap: 60 polls × 3s = 180s timeout surfaces "unavailable".
          if (currentCount >= 60) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setState({ kind: "error", sentinel: "unavailable" });
          }
        })
        .catch(() => {
          // Transient poll failures don't abort — they just count against
          // the cap. The 60-poll ceiling is the single exit on the error path.
          if (currentCount >= 60) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            setState({ kind: "error", sentinel: "unavailable" });
          }
        });
    }, 3000); // D-05 cadence: 3 seconds
  };

  const handleClick = () => {
    startTransition(async () => {
      const res = await regenerateCoverLetter(jobId);
      if (!res.ok) {
        // G-3: sentinel rendered verbatim below — no rewriting here.
        setState({ kind: "error", sentinel: res.sentinel });
        return;
      }
      // D-06 amended: prefer server-returned baseline; fall back to the prop
      // when the server returns null (INSERT-wait case — no prior row).
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
        Regenerate cover letter
      </Button>
      {state.kind === "error" && (
        <p className="text-destructive text-xs mt-1">
          Error: {state.sentinel}
        </p>
      )}
    </div>
  );
}
