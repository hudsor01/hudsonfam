"use client";

import { useState } from "react";
import { Check, Copy, Download, FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FreshnessBadge } from "./freshness-badge";
import { RegenerateButton } from "./regenerate-button";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
import { regenerateTailoredResume } from "@/lib/job-actions";
import { tailoredResumeIsDone } from "@/lib/regenerate-predicates";

export interface ResumeFreshness {
  /** Pre-computed server-side formatted date string, e.g. "4/21/26" (America/Chicago). */
  generatedDate: string;
  /** Pre-computed boolean from isStale() on the server. */
  isStale: boolean;
  /** Integer days since generation (for the tooltip text). */
  ageDays: number;
}

export interface TailoredResumeView {
  /** LLM-produced markdown — treated as untrusted (see XSS posture below). */
  content: string;
  /** e.g. "gpt-4o-mini"; null renders without the separator or model name. */
  model_used: string | null;
  /** Server-computed freshness primitives (hydration-safe per UI-SPEC §Pattern 2). */
  freshness: ResumeFreshness;
}

interface Props {
  resume: TailoredResumeView | null;
  /** Numeric job id used to build the tailored-resume PDF route URL. */
  jobId: number;
  /**
   * Server-computed ISO-8601 timestamp from `tailored_resumes.generated_at`
   * threaded through to the RegenerateButton's polling predicate (Phase 24
   * D-09). Distinct from `resume.freshness.generatedDate` which is a
   * pre-formatted display string ("4/21/26"); the predicate needs the raw
   * ISO string to `new Date(...).getTime()` compare. Nullable so parents
   * can pass `null` when the row has no prior row (INSERT-wait fallback
   * handled inside RegenerateButton).
   */
  baselineGeneratedAtIso: string | null;
}

/**
 * Renders the tailored resume markdown block inside the job detail sheet.
 *
 * UI-SPEC §1 (exact render tree):
 *   - Heading: "Tailored Resume" + FileText icon (size-4), matches Cover
 *     Letter cadence
 *   - Meta row: FreshnessBadge (Generated {generatedDate} · {model_used}),
 *     right-aligned
 *   - Body: Streamdown-rendered markdown inside
 *     `bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto`
 *
 * XSS posture (AI-SAFETY-01 + RESEARCH.md §Q2):
 *   - Streamdown is invoked with `skipHtml` — raw HTML in LLM output is
 *     NEVER parsed. `<script>`, `<iframe>`, and `<img onerror>` are stripped
 *     or replaced with safe placeholders (see tailored-resume-xss.test.tsx
 *     regression guard).
 *   - `linkSafety={{ enabled: false }}` — admin-only single-owner surface.
 *     The modal confirmation adds friction without value here; re-enable if
 *     a family-viewable markdown surface is ever added.
 *   - Defense in depth: Plan 20-07's CSP header on /admin/* blocks inline
 *     scripts via nonce + object-src 'none' + frame-ancestors 'none'.
 *
 * Empty-state branches (AI-RENDER-04 / Plan 21-06):
 *   - `resume === null` → "No tailored resume yet." (row never generated)
 *   - `resume !== null && !resume.content?.trim()` → "Tailored resume was
 *     generated but is empty." (row present, content blank/whitespace)
 *   - Both branches preserve the section shell (heading + FileText icon at
 *     text-sm font-semibold) per CONTEXT.md D-13, and suppress the
 *     FreshnessBadge / Copy button / Download anchor (nothing to copy,
 *     nothing to download, no generated_at to display).
 *
 * Hooks note: `useState(copied)` is called unconditionally at the top so
 * both empty-state branches and the populated branch honour React's rules-
 * of-hooks. The early returns run AFTER the hook declarations.
 */
export function TailoredResumeSection({
  resume,
  jobId,
  baselineGeneratedAtIso,
}: Props) {
  const [copied, setCopied] = useState(false);

  if (resume === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.tailored_resume.missing}
        </p>
      </div>
    );
  }

  if (!resume.content?.trim()) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.tailored_resume.empty}
        </p>
      </div>
    );
  }

  // Copy the raw markdown verbatim (CONTEXT.md D-02). On permission denial
  // or non-secure-context failure, swallow the error silently — UI-SPEC §1
  // Behavior locks silent-fail (the owner can just click again). No error
  // toast in Phase 21.
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(resume.content);
      setCopied(true);
      toast.success("Resume copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // silent fail — see UI-SPEC §1 and CONTEXT.md D-01
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <FreshnessBadge
            generatedDate={resume.freshness.generatedDate}
            modelUsed={resume.model_used}
            isStale={resume.freshness.isStale}
            ageDays={resume.freshness.ageDays}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copy tailored resume to clipboard"
                onClick={handleCopy}
                className="text-muted-foreground"
              >
                {copied ? (
                  <Check className="size-4" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Copy to clipboard
            </TooltipContent>
          </Tooltip>
          <a
            href={`/api/jobs/${jobId}/tailored-resume-pdf`}
            download
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-sm"
          >
            <Download className="size-3" />
            Download PDF
          </a>
          <RegenerateButton
            jobId={jobId}
            artifact="tailored_resume"
            label="Regenerate tailored resume"
            action={regenerateTailoredResume}
            isDone={tailoredResumeIsDone}
            baselineGeneratedAt={baselineGeneratedAtIso}
          />
        </div>
      </div>
      <div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
        <Streamdown skipHtml linkSafety={{ enabled: false }}>
          {resume.content}
        </Streamdown>
      </div>
    </div>
  );
}
