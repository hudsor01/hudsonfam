import { ServiceHealth } from "@/lib/dashboard/types";

interface ServiceMonitorProps {
  title: string;
  services: ServiceHealth[];
}

function StatusDot({ status }: { status: ServiceHealth["status"] }) {
  const colors = {
    up: "bg-emerald-400",
    down: "bg-red-400",
    unknown: "bg-yellow-400",
  };

  return (
    <span className={`inline-block size-2 rounded-full ${colors[status]}`} />
  );
}

export function ServiceMonitor({ title, services }: ServiceMonitorProps) {
  const allUp = services.every((s) => s.status === "up");
  const anyDown = services.some((s) => s.status === "down");

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="text-sm font-medium text-text tracking-wide uppercase">
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
      <div className="divide-y divide-border/50">
        {services.map((service) => (
          <a
            key={service.name}
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between px-4 py-2.5 hover:bg-bg/50 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <StatusDot status={service.status} />
              <span className="text-sm text-text">{service.name}</span>
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
