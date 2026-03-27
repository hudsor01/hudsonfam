interface MetricCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  color?: "green" | "gold" | "red" | "blue" | "default";
}

const colorClasses: Record<string, string> = {
  green: "text-emerald-400",
  gold: "text-accent",
  red: "text-red-400",
  blue: "text-primary",
  default: "text-text",
};

export function MetricCard({ label, value, suffix, color = "default" }: MetricCardProps) {
  return (
    <div className="flex-1 text-center">
      <div className={`text-2xl font-semibold ${colorClasses[color]}`}>
        {value}
        {suffix && <span className="text-base">{suffix}</span>}
      </div>
      <div className="text-xs uppercase tracking-wider text-text-dim mt-1">
        {label}
      </div>
    </div>
  );
}
