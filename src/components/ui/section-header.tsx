import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Small uppercase label (used in sidebars and section dividers) */
  label?: string;
  /** Large serif heading (used as page title) */
  title?: string;
  /** Subtitle text below the title */
  subtitle?: string;
  action?: {
    text: string;
    href: string;
  };
}

const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ label, title, subtitle, action, className, ...props }, ref) => {
    // Page-level header with title + subtitle
    if (title) {
      return (
        <div
          ref={ref}
          className={cn("mb-4", className)}
          {...props}
        >
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-serif text-foreground text-balance">{title}</h1>
            {action && (
              <a
                href={action.href}
                className="text-xs text-text-dim hover:text-muted-foreground transition-colors"
              >
                {action.text}
              </a>
            )}
          </div>
          {subtitle && (
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          )}
        </div>
      );
    }

    // Inline section label (original behavior)
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between mb-4", className)}
        {...props}
      >
        <h3 className="text-xs font-sans font-semibold tracking-[3px] text-primary uppercase">
          {label}
        </h3>
        {action && (
          <a
            href={action.href}
            className="text-xs text-text-dim hover:text-muted-foreground transition-colors"
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
