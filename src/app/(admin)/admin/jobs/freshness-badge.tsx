"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FreshnessBadgeProps {
  /** Pre-computed server-side formatted date string, e.g. "4/21/26" (America/Chicago). */
  generatedDate: string;
  /** e.g. "gpt-4o-mini"; null renders without the separator or model name. */
  modelUsed: string | null;
  /** Pre-computed boolean from isStale() on the server. */
  isStale: boolean;
  /** Integer days (for the tooltip text). null hides the tooltip figure. */
  ageDays: number | null;
  className?: string;
}

/**
 * Subtle freshness badge used on every AI artifact section.
 *
 * UI-SPEC §2 / Phase 21 revision:
 *   - Fresh: "Generated {generatedDate} · {modelUsed}" in muted text
 *     (e.g. "Generated 4/21/26 · gpt-4o-mini"; date formatted server-side
 *     in America/Chicago via attachFreshness)
 *   - Stale: adds a 6px amber dot (size-1.5 bg-warning) + hover tooltip
 *     ("Generated {ageDays} days ago; may need regeneration")
 *   - No timestamp: renders nothing (caller handles empty state — Phase 21)
 *
 * Colors: only --color-warning (stale dot) + --color-muted-foreground (text).
 * NOT --color-destructive (reserved for Phase 23 regenerate failures).
 *
 * Hydration safety: all date math stays server-side (generatedDate + isStale
 * + ageDays arrive pre-computed as props). Component never calls `new Date()`.
 */
export function FreshnessBadge({
  generatedDate,
  modelUsed,
  isStale,
  ageDays,
  className,
}: FreshnessBadgeProps) {
  if (!generatedDate) return null;

  const content = (
    <>
      <span>Generated {generatedDate}</span>
      {modelUsed && (
        <>
          <span aria-hidden="true">·</span>
          <span>{modelUsed}</span>
        </>
      )}
    </>
  );

  if (!isStale) {
    return (
      <span
        className={`flex items-center gap-1 text-[11px] font-medium text-muted-foreground${className ? ` ${className}` : ""}`}
      >
        {content}
      </span>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={`flex items-center gap-1 text-[11px] font-medium text-muted-foreground cursor-default${className ? ` ${className}` : ""}`}
          >
            <span
              aria-label="Stale artifact"
              className="size-1.5 rounded-full bg-warning"
            />
            {content}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[220px]">
          Generated {ageDays} days ago; may need regeneration
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
