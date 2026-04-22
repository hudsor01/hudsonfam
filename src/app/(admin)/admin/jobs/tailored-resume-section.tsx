"use client";

import { FileText } from "lucide-react";
import { Streamdown } from "streamdown";
import { FreshnessBadge } from "./freshness-badge";

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
 * Empty state: when `resume` is null, the component returns null — no
 * heading, no body. Explanatory empty-state copy ships in Phase 21
 * (AI-RENDER-04).
 */
export function TailoredResumeSection({ resume }: Props) {
  if (!resume) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Tailored Resume
        </h3>
        <FreshnessBadge
          generatedDate={resume.freshness.generatedDate}
          modelUsed={resume.model_used}
          isStale={resume.freshness.isStale}
          ageDays={resume.freshness.ageDays}
        />
      </div>
      <div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
        <Streamdown skipHtml linkSafety={{ enabled: false }}>
          {resume.content}
        </Streamdown>
      </div>
    </div>
  );
}
