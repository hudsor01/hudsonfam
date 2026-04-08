"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Film,
  Search,
  FileSignature,
  FileText,
  Bot,
  Wifi,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type FamilyServiceHealth } from "@/lib/dashboard/types";

const SERVICE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  "Media Library": Film,
  "Request Media": Search,
  DocuSeal: FileSignature,
  "Stirling PDF": FileText,
  "Hudson AI": Bot,
};

const GROUP_ORDER = ["Media & Entertainment", "Documents & Tools", "AI"];

interface ServicesGridProps {
  initialServices: Record<string, FamilyServiceHealth[]>;
}

function StatusDot({ status }: { status: FamilyServiceHealth["status"] }) {
  const colors: Record<string, string> = {
    up: "bg-success shadow-success/50",
    down: "bg-destructive shadow-destructive/50",
    unknown: "bg-warning shadow-warning/50",
  };

  const labels: Record<string, string> = {
    up: "Online",
    down: "Offline",
    unknown: "Unknown",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`inline-block size-2.5 rounded-full shadow-sm ${colors[status]} cursor-default`}
        />
      </TooltipTrigger>
      <TooltipContent>
        <p>{labels[status]}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function ServiceCard({ service }: { service: FamilyServiceHealth }) {
  const Icon = SERVICE_ICONS[service.name];

  return (
    <a
      href={service.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block"
    >
      <Card hover padding="none" className="h-full">
        <div className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary/15 transition-colors">
              {Icon && <Icon className="size-5" />}
            </div>
            <div className="flex items-center gap-2">
              {service.lanOnly && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
                        <Wifi className="size-2.5" />
                        LAN
                      </Badge>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Only available on home network</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {service.status !== "skipped" && (
                <StatusDot status={service.status} />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-medium text-foreground">
              {service.name}
            </h3>
            <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {service.description}
          </p>
          {service.responseTime !== undefined && service.status === "up" && (
            <p className="text-[10px] text-text-dim mt-2">
              {service.responseTime}ms
            </p>
          )}
        </div>
      </Card>
    </a>
  );
}

export function ServicesGrid({ initialServices }: ServicesGridProps) {
  const [services, setServices] = useState(initialServices);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/services");
      if (res.ok) {
        const data = await res.json();
        setServices(data.services);
        setLastUpdated(new Date(data.timestamp));
      }
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const totalServices = Object.values(services).flat();
  const monitored = totalServices.filter((s) => s.status !== "skipped");
  const upCount = monitored.filter((s) => s.status === "up").length;
  const allUp = upCount === monitored.length;

  return (
    <div className="mt-6">
      {/* Status bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              allUp
                ? "bg-success/10 text-success"
                : "bg-warning/10 text-warning"
            }`}
          >
            {upCount}/{monitored.length} Online
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-dim">
            Updated{" "}
            {lastUpdated.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Service groups */}
      <div className="space-y-8">
        {GROUP_ORDER.map((groupName) => {
          const groupServices = services[groupName];
          if (!groupServices?.length) return null;

          return (
            <div key={groupName}>
              <h2 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase mb-4">
                {groupName}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupServices.map((service) => (
                  <ServiceCard key={service.name} service={service} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
