"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { FileText } from "lucide-react";

const SECTION_LABELS = {
  cover_letter: "Cover Letter",
  tailored_resume: "Tailored Resume",
  company_research: "Company Intel",
  salary_intelligence: "Salary Intelligence",
} as const;

export type Section = keyof typeof SECTION_LABELS;

interface Props {
  section: Section;
  jobId: number;
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Per-section error boundary (CONTEXT.md D-09 / D-10).
 *
 * Catches render-time errors in a single AI artifact section so one failing
 * section does not blank out the whole job detail sheet.
 *
 * Fallback UI (UI-SPEC §3):
 *   - Section heading still renders (muted)
 *   - Body replaced with muted italic line: "Couldn't render this section — the data may have changed shape."
 *   - No error.message or stack leaks to DOM
 *   - No "Try Again" button (retry only makes sense after regenerate lands in Phase 23)
 *
 * NOT destructive — uses text-muted-foreground. --color-destructive is reserved
 * for Phase 23 regenerate failures.
 *
 * Hand-rolled class component (no react-error-boundary dep) per D-09 discretion.
 * Must run client-side — React class components cannot render on the server
 * in Next.js 16 App Router.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Per D-10: log server-side context, never surface error detail to client.
    // Prefix "[ai-section]" so downstream log tooling can grep for this pattern.
    console.error("[ai-section] failed to render", {
      section: this.props.section,
      jobId: this.props.jobId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5 text-muted-foreground">
            <FileText className="size-4" />
            {SECTION_LABELS[this.props.section]}
          </h3>
          <p className="text-sm text-muted-foreground italic">
            Couldn&rsquo;t render this section &mdash; the data may have changed shape.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
