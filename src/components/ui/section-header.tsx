import { type HTMLAttributes, forwardRef } from "react";

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  action?: {
    text: string;
    href: string;
  };
}

const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ label, action, className = "", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`flex items-center justify-between mb-4 ${className}`}
        {...props}
      >
        <h3 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
          {label}
        </h3>
        {action && (
          <a
            href={action.href}
            className="text-xs text-text-dim hover:text-text-muted transition-colors"
          >
            {action.text}
          </a>
        )}
      </div>
    );
  }
);

SectionHeader.displayName = "SectionHeader";

export { SectionHeader, type SectionHeaderProps };
