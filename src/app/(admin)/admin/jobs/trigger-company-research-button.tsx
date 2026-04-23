"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  triggerCompanyResearch,
  fetchJobDetail,
} from "@/lib/job-actions";
import type { ErrorSentinel } from "@/lib/webhooks";

interface TriggerCompanyResearchButtonProps {
  /** Job ID to pass to the triggerCompanyResearch Server Action. */
  jobId: number;
}

type ButtonState =
  | { kind: "idle" }
  | { kind: "in-progress" }
  | { kind: "error"; sentinel: ErrorSentinel };

/**
 * Owner-triggered button that kicks off the `job-company-intel` n8n workflow
 * for a job whose `company_research` row is currently null, then polls
 * `fetchJobDetail(jobId)` every 3s until the row appears (INSERT-wait
 * predicate per CONTEXT.md D-06). Hard-caps at 60 polls (180s) and surfaces
 * the `"unavailable"` sentinel when the cap is reached (D-05).
 *
 * State machine (UI-SPEC §Component Contracts 1):
 *   idle → in-progress → (silent success on INSERT | error on sentinel | error on 60-poll cap)
 *   error → in-progress on re-click
 *
 * On success (detail.company_research !== null) the parent's Company Intel
 * branch flips from the `missing` empty-state to the populated branch; this
 * component unmounts via the parent re-render — no local transition to a
 * "done" state is observable.
 *
 * Accessibility (G-1):
 *   - `aria-busy={isPolling}` surfaces the polling state to screen readers
 *   - `disabled={isDisabled}` prevents double-fires; shadcn Button preserves
 *     keyboard focusability so Tab traversal still announces "Research this
 *     company, busy" during polling.
 *
 * Sentinel display (G-3):
 *   - 4-value `ErrorSentinel` union rendered verbatim as `Error: {sentinel}`
 *     inside a `text-destructive` `<p>` sibling — no client-side rewriting
 *     or aliasing.
 *
 * Color posture (G-2):
 *   - Zero raw Tailwind color class names in this file; only semantic
 *     tokens (`text-muted-foreground`, `text-destructive`) from globals.css.
 *
 * Label (G-5):
 *   - "Research this company" rendered verbatim from ROADMAP SC #1 — the
 *     label text is stable across idle / in-progress / error states; only
 *     the icon swaps (Sparkles ↔ Loader2) and the `aria-busy` state changes.
 *
 * Pitfall 6 (unmount during poll):
 *   - `useEffect` cleanup clearIntervals on unmount — critical for the
 *     sheet-close-mid-poll flow where the parent Sheet unmounts while the
 *     interval is active. Never calls Date.now() — all predicates stay in
 *     the server-side data domain.
 */
export function TriggerCompanyResearchButton({
  jobId,
}: TriggerCompanyResearchButtonProps) {
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

  const startPolling = () => {
    pollCountRef.current = 0;
    intervalRef.current = setInterval(() => {
      pollCountRef.current += 1;
      const currentCount = pollCountRef.current;
      void fetchJobDetail(jobId)
        .then((detail) => {
          // INSERT-wait predicate (D-06): row didn't exist pre-click; polling
          // completes as soon as the first non-null company_research lands.
          if (
            detail?.company_research !== null &&
            detail?.company_research !== undefined
          ) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
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
      const res = await triggerCompanyResearch(jobId);
      if (!res.ok) {
        // G-3: sentinel rendered verbatim below — no rewriting here.
        setState({ kind: "error", sentinel: res.sentinel });
        return;
      }
      // Webhook accepted — begin polling
      setState({ kind: "in-progress" });
      startPolling();
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
        {isPolling ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Sparkles />
        )}
        Research this company
      </Button>
      {state.kind === "error" && (
        <p className="text-destructive text-xs mt-1">
          Error: {state.sentinel}
        </p>
      )}
    </div>
  );
}
