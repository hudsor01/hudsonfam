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
import type { JobDetail } from "@/lib/jobs-db";

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
  const [detail, setDetail] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId || !open) {
      setDetail(null);
      return;
    }
    setLoading(true);
    fetchJobDetail(jobId).then((d) => {
      setDetail(d);
      setLoading(false);
    });
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
                  {detail.company && (
                    <span className="flex items-center gap-1">
                      <Building2 className="size-3.5" />
                      {detail.company}
                    </span>
                  )}
                  {detail.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" />
                      {detail.location}
                    </span>
                  )}
                  {formatSalary(detail.salary_min, detail.salary_max) && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="size-3.5" />
                      {formatSalary(detail.salary_min, detail.salary_max)}
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

              {detail.cover_letter && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="size-4" />
                      Cover Letter
                    </h3>
                    <a
                      href={`/api/jobs/${detail.id}/cover-letter-pdf`}
                      download
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <Download className="size-3" />
                      Download PDF
                    </a>
                  </div>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-card/50 rounded-lg p-4 border border-border max-h-64 overflow-y-auto">
                    {detail.cover_letter.content}
                  </div>
                </div>
              )}

              {detail.company_research && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-1.5">
                      <Building2 className="size-4" />
                      Company Intel
                    </h3>
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
                        detail.company_research.salary_range_max) && (
                        <div className="flex items-center gap-1">
                          <DollarSign className="size-3.5" />
                          {formatSalary(
                            detail.company_research.salary_range_min,
                            detail.company_research.salary_range_max
                          )}
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
                </>
              )}

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
