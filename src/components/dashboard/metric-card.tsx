"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  color?: "green" | "gold" | "red" | "blue" | "default";
  tooltip?: string;
}

const colorClasses: Record<string, string> = {
  green: "text-emerald-400",
  gold: "text-accent",
  red: "text-red-400",
  blue: "text-primary",
  default: "text-foreground",
};

export function MetricCard({ label, value, suffix, color = "default", tooltip }: MetricCardProps) {
  const content = (
    <div className="@container flex-1 text-center">
      <div className={`text-xl @sm:text-2xl @md:text-3xl font-semibold ${colorClasses[color]}`}>
        {value}
        {suffix && <span className="text-sm @sm:text-base">{suffix}</span>}
      </div>
      <div className="text-xs uppercase tracking-wider text-text-dim mt-1">
        {label}
      </div>
    </div>
  );

  if (!tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {content}
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}
