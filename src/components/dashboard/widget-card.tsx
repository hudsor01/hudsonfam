interface WidgetCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function WidgetCard({ title, children, className = "", icon }: WidgetCardProps) {
  return (
    <div className={`bg-surface border border-border rounded-xl overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        {icon && <span className="text-text-muted">{icon}</span>}
        <h3 className="text-sm font-medium text-text tracking-wide uppercase">
          {title}
        </h3>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}
