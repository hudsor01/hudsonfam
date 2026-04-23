"use client";

import { DollarSign } from "lucide-react";
import { Streamdown } from "streamdown";
import { FreshnessBadge } from "./freshness-badge";
import { ProvenanceTag } from "./provenance-tag";
import { RegenerateButton } from "./regenerate-button";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
import { parseSalaryHeadline } from "@/lib/parse-salary-report";
import { formatSingleSalary } from "@/lib/format-salary";
import { regenerateSalaryIntelligence } from "@/lib/job-actions";
import { salaryIntelligenceIsDone } from "@/lib/regenerate-predicates";

export interface SalaryFreshness {
  generatedDate: string;
  isStale: boolean;
  ageDays: number;
}

export interface SalaryIntelligenceView {
  /** JSONB passthrough from DB — type-guarded at render time via parseSalaryHeadline. */
  report_json: unknown;
  /** LLM narrative — untrusted markdown; rendered via Streamdown with skipHtml. */
  llm_analysis: string | null;
  /** Server-computed freshness primitives — hydration-safe. */
  freshness: SalaryFreshness;
}

interface Props {
  salary: SalaryIntelligenceView | null;
  /** Numeric job id threaded to the RegenerateButton's Server Action (Phase 24 D-09). */
  jobId: number;
  /**
   * Server-computed YYYY-MM-DD date string from `salary_intelligence.search_date`
   * threaded through to the RegenerateButton's polling predicate (Phase 24 D-09).
   * Postgres column is `date`, NOT `timestamp`, so this is a date-granular string
   * (e.g. "2026-04-20"). The `salaryIntelligenceIsDone` predicate UTC-midnight
   * parses both sides to avoid TZ drift. Same-day re-runs trigger silent-success
   * (documented rough edge — D-04 / Pitfall 1). Nullable to accommodate parents
   * that know no prior row exists for the job (INSERT-wait fallback handled
   * inside RegenerateButton).
   */
  baselineSearchDate: string | null;
}

/**
 * Renders the salary_intelligence section inside the job detail sheet.
 *
 * Three branches (Plan 21-06 always-render-shell posture):
 *   - null → "No salary intelligence yet."
 *   - !llm_analysis.trim() && !parseSalaryHeadline(report_json) → "Salary intelligence was generated but is empty."
 *   - else → heading + meta + optional headline row + optional Streamdown prose
 *
 * XSS posture (AI-SAFETY-01): Streamdown with `skipHtml` strips raw HTML;
 * `linkSafety={{ enabled: false }}` is the admin-only surface pattern
 * inherited from TailoredResumeSection. CSP from Plan 20-07 is defense in depth.
 */
export function SalaryIntelligenceSection({
  salary,
  jobId,
  baselineSearchDate,
}: Props) {
  if (salary === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="size-4" />
          Salary Intelligence
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.salary_intelligence.missing}
        </p>
      </div>
    );
  }

  const hasProse = !!salary.llm_analysis?.trim();
  const headline = parseSalaryHeadline(salary.report_json);

  if (!hasProse && !headline) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="size-4" />
          Salary Intelligence
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.salary_intelligence.empty}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <DollarSign className="size-4" />
          Salary Intelligence
        </h3>
        <div className="flex items-center gap-3 flex-wrap">
          <FreshnessBadge
            generatedDate={salary.freshness.generatedDate}
            modelUsed={null}
            isStale={salary.freshness.isStale}
            ageDays={salary.freshness.ageDays}
          />
          <RegenerateButton
            jobId={jobId}
            artifact="salary_intelligence"
            label="Regenerate salary intelligence"
            action={regenerateSalaryIntelligence}
            isDone={salaryIntelligenceIsDone}
            baselineGeneratedAt={baselineSearchDate}
          />
        </div>
      </div>

      {headline && (
        <div className="flex items-center gap-2 flex-wrap">
          {headline.figures.map((f, i) => (
            <span key={f.key} className="inline-flex items-center gap-1">
              <span className="text-[11px] font-medium text-muted-foreground">
                {f.label}
              </span>
              <span className="text-sm font-semibold text-foreground tabular-nums">
                {formatSingleSalary(f.value, headline.currency)}
              </span>
              <ProvenanceTag source="llm" />
              {i < headline.figures.length - 1 && (
                <span aria-hidden="true" className="text-muted-foreground">·</span>
              )}
            </span>
          ))}
        </div>
      )}

      {hasProse && (
        <div className="text-sm text-muted-foreground bg-card/50 rounded-lg p-4 border border-border max-h-96 overflow-y-auto">
          <Streamdown skipHtml linkSafety={{ enabled: false }}>
            {salary.llm_analysis!}
          </Streamdown>
        </div>
      )}
    </div>
  );
}
