"use client";

import { ServiceHealth } from "@/lib/dashboard/types";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ServiceMonitorProps {
  title: string;
  services: ServiceHealth[];
}

const statusLabels: Record<ServiceHealth["status"], string> = {
  up: "Service is running normally",
  down: "Service is down or unreachable",
  unknown: "Service status could not be determined",
};

function StatusDot({ status }: { status: ServiceHealth["status"] }) {
  const colors = {
    up: "bg-emerald-400",
    down: "bg-red-400",
    unknown: "bg-yellow-400",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`inline-block size-2 rounded-full ${colors[status]} cursor-default`} />
      </TooltipTrigger>
      <TooltipContent>
        <p>{statusLabels[status]}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function ServiceMonitor({ title, services }: ServiceMonitorProps) {
  const allUp = services.every((s) => s.status === "up");
  const anyDown = services.some((s) => s.status === "down");

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground tracking-wide uppercase">
          {title}
        </h3>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            allUp
              ? "bg-emerald-400/10 text-emerald-400"
              : anyDown
                ? "bg-red-400/10 text-red-400"
                : "bg-yellow-400/10 text-yellow-400"
          }`}
        >
          {allUp ? "All Up" : anyDown ? "Degraded" : "Partial"}
        </span>
      </div>
      <div>
        {services.map((service) => (
          <a
            key={service.name}
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2.5 not-last:border-b not-last:border-border/50 hover:bg-background/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <StatusDot status={service.status} />
              <span className="text-sm text-foreground">{service.name}</span>
            </div>
            {service.responseTime !== undefined && service.status === "up" && (
              <span className="text-xs text-text-dim">
                {service.responseTime}ms
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
