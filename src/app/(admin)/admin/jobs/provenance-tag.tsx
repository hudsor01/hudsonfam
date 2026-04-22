"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  provenanceColor,
  provenanceLabel,
  type ProvenanceSource,
} from "@/lib/provenance";

/**
 * Verbatim tooltip copy from UI-SPEC §Copywriting Contract — one sentence
 * per source, ending with a period. No URLs, no em-dashes.
 */
const TOOLTIPS: Record<ProvenanceSource, string> = {
  scraped:
    "Source: scraped from the job feed (raw value from the source posting).",
  llm:
    "Source: LLM estimate generated from external market data. Not a verified figure.",
  company_research:
    "Source: estimated during company research against public signals.",
  original_posting:
    "Source: directly quoted from the job posting description.",
};

interface ProvenanceTagProps {
  source: ProvenanceSource;
  className?: string;
}

/**
 * Reusable provenance tag — shadcn Badge variant="outline" + Radix Tooltip
 * wrapper. Called from 3 sites (header salary, Company Intel salary range,
 * SalaryIntelligenceSection headline figures). Matches the Plan 21-05
 * quality-badge JSX shape exactly, only swapping scoreColor → provenanceColor,
 * text-[11px] → text-[10px] (one size smaller per D-10), and the hard-coded
 * "Quality {n}" label for the provenanceLabel() lookup.
 *
 * No aria-label override: the visible Badge text ("LLM estimate", etc.) IS
 * the accessible name. Radix wraps the Badge in a focusable role="button"
 * so keyboard + screen-reader users both get the tooltip content.
 */
export function ProvenanceTag({ source, className }: ProvenanceTagProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={`text-[10px] ${provenanceColor(source)} cursor-default${className ? ` ${className}` : ""}`}
        >
          {provenanceLabel(source)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[220px]">
        {TOOLTIPS[source]}
      </TooltipContent>
    </Tooltip>
  );
}
