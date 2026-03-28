import { type HTMLAttributes, forwardRef } from "react";

type BadgeVariant = "default" | "primary" | "accent" | "outline";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-card text-muted-foreground border border-border",
  primary: "bg-primary/15 text-primary border border-primary/25",
  accent: "bg-accent/15 text-accent border border-accent/25",
  outline: "bg-transparent text-muted-foreground border border-border",
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = "default", className = "", children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full
          text-xs font-medium tracking-wide
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {children}
      </span>
    );
  }
);

Badge.displayName = "Badge";

export { Badge, type BadgeProps, type BadgeVariant };
