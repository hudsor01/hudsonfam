"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ExternalLink,
  FileText,
  Download,
  Building2,
  MapPin,
  DollarSign,
  Star,
  Loader2,
} from "lucide-react";
import { sourceColors } from "./columns";
import { fetchJobDetail } from "@/lib/job-actions";
import type { FreshJobDetail } from "@/lib/jobs-db";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { scoreColor, scoreLabel } from "@/lib/score-color";
import { normalizeUrl } from "@/lib/url-helpers";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
import { isCompanyResearchEmpty } from "@/lib/is-company-research-empty";
import { FreshnessBadge } from "./freshness-badge";
import { SectionErrorBoundary } from "./section-error-boundary";
import { TailoredResumeSection } from "./tailored-resume-section";
import { SalaryIntelligenceSection } from "./salary-intelligence-section";
import { ProvenanceTag } from "./provenance-tag";

interface JobDetailSheetProps {
  jobId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange: (jobId: number, status: string) => void;
}

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => `$${Math.round(n / 1000)}K`;
  if (min && max) return `${fmt(min)} - ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `up to ${fmt(max!)}`;
}

export function JobDetailSheet({
  jobId,
  open,
  onOpenChange,
  onStatusChange,
}: JobDetailSheetProps) {
  const [detail, setDetail] = useState<FreshJobDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId || !open) return;
    let stale = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchJobDetail(jobId).then((d) => {
      if (!stale) {
        setDetail(d);
        setLoading(false);
      }
    });
    return () => {
      stale = true;
      setDetail(null);
    };
  }, [jobId, open]);

  const handleApply = () => {
    if (!detail?.url) return;
    window.open(detail.url, "_blank", "noopener,noreferrer");
    onStatusChange(detail.id, "applied");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : detail ? (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              <SheetHeader className="space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${sourceColors[detail.source] ?? "bg-card text-muted-foreground border-border"}`}
                  >
                    {detail.source.replace("serpapi_", "").replace(/_/g, " ")}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      detail.match_score >= 7
                        ? "text-score-high"
                        : detail.match_score >= 4
                          ? "text-score-mid"
                          : "text-muted-foreground"
                    }`}
                  >
                    {detail.match_score}/10
                  </span>
                </div>
                <SheetTitle className="text-xl leading-tight">
                  {detail.title}
                </SheetTitle>
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {detail.company &&
                    (() => {
                      const companyUrl = normalizeUrl(
                        detail.company_research?.company_url ??
                          detail.company_url ??
                          null
                      );
                      const inner = (
                        <>
                          <Building2 className="size-3.5" />
                          {detail.company}
                          {companyUrl && (
                            <ExternalLink
                              className="size-3 opacity-60"
                              aria-hidden="true"
                            />
                          )}
                        </>
                      );
                      return companyUrl ? (
                        <a
                          href={companyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
                        >
                          {inner}
                        </a>
                      ) : (
                        <span className="flex items-center gap-1">{inner}</span>
                      );
                    })()}
                  {detail.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {detail.location}
                    </span>
                  )}
                  {formatSalary(detail.salary_min, detail.salary_max) &&
                    detail.salary_currency && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="size-3.5" />
                        {formatSalary(detail.salary_min, detail.salary_max)}
                        <ProvenanceTag source="scraped" />
                      </span>
                    )}
                </div>
              </SheetHeader>

              {detail.url && (
                <Button onClick={handleApply} className="w-full gap-2">
                  <ExternalLink className="size-4" />
                  Apply Now
                </Button>
              )}

              <Separator />

              <SectionErrorBoundary section="cover_letter" jobId={detail.id}>
                {detail.cover_letter === null ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="size-4" />
                      Cover Letter
                    </h3>
                    <p className="text-sm text-muted-foreground italic">
                      {EMPTY_STATE_COPY.cover_letter.missing}
                    </p>
                  </div>
                ) : !detail.cover_letter.content?.trim() ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="size-4" />
                      Cover Letter
                    </h3>
                    <p className="text-sm text-muted-foreground italic">
                      {EMPTY_STATE_COPY.cover_letter.empty}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <FileText className="size-4" />
                        Cover Letter
                      </h3>
                      <div className="flex items-center gap-3 flex-wrap">
                        {detail.cover_letter.quality_score !== null && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="outline"
                                className={`text-[11px] ${scoreColor(detail.cover_letter.quality_score)} cursor-default`}
                              >
                                Quality {detail.cover_letter.quality_score}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs max-w-[220px]">
                              Cover letter quality score: {detail.cover_letter.quality_score} ({scoreLabel(detail.cover_letter.quality_score)})
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <FreshnessBadge
                          generatedDate={detail.cover_letter.freshness.generatedDate}
                          modelUsed={detail.cover_letter.model_used}
                          isStale={detail.cover_letter.freshness.isStale}
                          ageDays={detail.cover_letter.freshness.ageDays}
                        />
                        <a
                          href={`/api/jobs/${detail.id}/cover-letter-pdf`}
                          download
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <Download className="size-3" />
                          Download PDF
                        </a>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-card/50 rounded-lg p-4 border border-border max-h-64 overflow-y-auto">
                      {detail.cover_letter.content}
                    </div>
                  </div>
                )}
              </SectionErrorBoundary>

              <Separator />
              <SectionErrorBoundary
                section="tailored_resume"
                jobId={detail.id}
              >
                <TailoredResumeSection
                  jobId={detail.id}
                  resume={
                    detail.tailored_resume
                      ? {
                          content: detail.tailored_resume.content,
                          model_used: detail.tailored_resume.model_used,
                          freshness: detail.tailored_resume.freshness,
                        }
                      : null
                  }
                />
              </SectionErrorBoundary>

              <Separator />
              <SectionErrorBoundary
                section="salary_intelligence"
                jobId={detail.id}
              >
                <SalaryIntelligenceSection
                  salary={
                    detail.salary_intelligence
                      ? {
                          report_json: detail.salary_intelligence.report_json,
                          llm_analysis: detail.salary_intelligence.llm_analysis,
                          freshness: detail.salary_intelligence.freshness,
                        }
                      : null
                  }
                />
              </SectionErrorBoundary>

              <Separator />
              <SectionErrorBoundary
                section="company_research"
                jobId={detail.id}
              >
                {detail.company_research === null ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Building2 className="size-4" />
                      Company Intel
                    </h3>
                    <p className="text-sm text-muted-foreground italic">
                      {EMPTY_STATE_COPY.company_research.missing}
                    </p>
                  </div>
                ) : isCompanyResearchEmpty(detail.company_research) ? (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Building2 className="size-4" />
                      Company Intel
                    </h3>
                    <p className="text-sm text-muted-foreground italic">
                      {EMPTY_STATE_COPY.company_research.empty}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold flex items-center gap-1.5">
                        <Building2 className="size-4" />
                        Company Intel
                      </h3>
                      <FreshnessBadge
                        generatedDate={detail.company_research.freshness.generatedDate}
                        modelUsed={null}
                        isStale={detail.company_research.freshness.isStale}
                        ageDays={detail.company_research.freshness.ageDays}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {detail.company_research.glassdoor_rating && (
                        <div className="flex items-center gap-1.5">
                          <Star className="size-3.5 text-score-mid" />
                          <span>
                            {detail.company_research.glassdoor_rating}/5
                            Glassdoor
                          </span>
                        </div>
                      )}
                      {detail.company_research.employee_count && (
                        <div className="text-muted-foreground">
                          {detail.company_research.employee_count} employees
                        </div>
                      )}
                      {detail.company_research.funding_stage && (
                        <div className="text-muted-foreground capitalize">
                          {detail.company_research.funding_stage}
                        </div>
                      )}
                      {(detail.company_research.salary_range_min ||
                        detail.company_research.salary_range_max) &&
                        detail.company_research.salary_currency && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="size-3.5" />
                            {formatSalary(
                              detail.company_research.salary_range_min,
                              detail.company_research.salary_range_max
                            )}
                            <ProvenanceTag source="company_research" />
                          </div>
                        )}
                    </div>
                    {detail.company_research.tech_stack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {detail.company_research.tech_stack.map((tech) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="text-[11px]"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {detail.company_research.ai_summary && (
                      <p className="text-sm text-muted-foreground">
                        {detail.company_research.ai_summary}
                      </p>
                    )}
                  </div>
                )}
              </SectionErrorBoundary>

              <Separator />

              {detail.description && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Description</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {detail.description}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Job not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
