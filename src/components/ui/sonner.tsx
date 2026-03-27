"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      style={
        {
          "--normal-bg": "oklch(0.20 0.02 258)",
          "--normal-text": "oklch(0.94 0.02 80)",
          "--normal-border": "oklch(0.28 0.02 256)",
          "--success-bg": "oklch(0.20 0.02 258)",
          "--success-text": "oklch(0.70 0.18 160)",
          "--success-border": "oklch(0.35 0.10 160)",
          "--error-bg": "oklch(0.20 0.02 258)",
          "--error-text": "oklch(0.65 0.20 25)",
          "--error-border": "oklch(0.35 0.12 25)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
