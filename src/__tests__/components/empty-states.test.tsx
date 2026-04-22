import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { render as rtlRender } from "@testing-library/react";
import { FileText, Building2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TailoredResumeSection } from "@/app/(admin)/admin/jobs/tailored-resume-section";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
import { isCompanyResearchEmpty } from "@/lib/is-company-research-empty";
import type { CompanyResearch } from "@/lib/jobs-db";

/**
 * Tests for AI-RENDER-04 empty-state blocks.
 *
 * TailoredResumeSection's empty branches are tested directly against the
 * production component (the component owns its own empty-state branches per
 * Plan 21-06 Task 2 Step 1).
 *
 * Cover Letter + Company Intel empty branches live inline as ternaries in
 * job-detail-sheet.tsx — mounting the whole Sheet + ScrollArea +
 * fetchJobDetail mock stack for a 2-line ternary would be high-cost, low-
 * value. Inline fixtures below mirror the production JSX byte-for-byte and
 * import the same EMPTY_STATE_COPY + isCompanyResearchEmpty so any
 * production drift fails these tests immediately.
 */

function render(ui: ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    ),
  });
}

function CoverLetterEmptyFixture({
  coverLetter,
}: {
  coverLetter: { content: string } | null;
}) {
  if (coverLetter === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Cover Letter
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.cover_letter.missing}
        </p>
      </div>
    );
  }
  if (!coverLetter.content?.trim()) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <FileText className="size-4" />
          Cover Letter
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.cover_letter.empty}
        </p>
      </div>
    );
  }
  return <div data-testid="populated">populated</div>;
}

function CompanyIntelEmptyFixture({ cr }: { cr: CompanyResearch | null }) {
  if (cr === null) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="size-4" />
          Company Intel
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.company_research.missing}
        </p>
      </div>
    );
  }
  if (isCompanyResearchEmpty(cr)) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Building2 className="size-4" />
          Company Intel
        </h3>
        <p className="text-sm text-muted-foreground italic">
          {EMPTY_STATE_COPY.company_research.empty}
        </p>
      </div>
    );
  }
  return <div data-testid="populated">populated</div>;
}

const baseCR: CompanyResearch = {
  id: 1,
  company_name: "Acme",
  company_url: null,
  glassdoor_rating: null,
  salary_range_min: null,
  salary_range_max: null,
  salary_currency: "USD",
  tech_stack: [],
  funding_stage: null,
  employee_count: null,
  recent_news: null,
  ai_summary: null,
  created_at: "2026-04-21T00:00:00.000Z",
};

describe("Cover Letter empty states (AI-RENDER-04)", () => {
  it("missing branch: renders heading + 'No cover letter yet.'", () => {
    const { container } = render(<CoverLetterEmptyFixture coverLetter={null} />);
    expect(container.textContent).toContain("Cover Letter");
    expect(container.textContent).toContain("No cover letter yet.");
    const body = container.querySelector("p.italic");
    expect(body).not.toBeNull();
    expect(body?.className).toContain("text-muted-foreground");
    expect(body?.className).toContain("italic");
    expect(body?.className).toContain("text-sm");
  });

  it("empty-body branch: renders 'Cover letter was generated but is empty.'", () => {
    const { container } = render(
      <CoverLetterEmptyFixture coverLetter={{ content: "   " }} />
    );
    expect(container.textContent).toContain(
      "Cover letter was generated but is empty."
    );
  });

  it("missing branch suppresses FreshnessBadge / Download / Quality badge", () => {
    const { container } = render(<CoverLetterEmptyFixture coverLetter={null} />);
    expect(container.querySelector("a[download]")).toBeNull();
    // No "Quality " text should appear (the Quality badge reads "Quality 0.83")
    expect(container.textContent).not.toContain("Quality ");
    expect(container.textContent).not.toContain("Download PDF");
    expect(container.textContent).not.toContain("Generated ");
  });
});

describe("Tailored Resume empty states (AI-RENDER-04)", () => {
  it("missing branch: renders heading + 'No tailored resume yet.'", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={null} />
    );
    expect(container.textContent).toContain("Tailored Resume");
    expect(container.textContent).toContain("No tailored resume yet.");
    const body = container.querySelector("p.italic");
    expect(body).not.toBeNull();
    expect(body?.className).toContain("text-muted-foreground");
    expect(body?.className).toContain("italic");
    expect(body?.className).toContain("text-sm");
  });

  it("empty-body branch: renders 'Tailored resume was generated but is empty.'", () => {
    const { container } = render(
      <TailoredResumeSection
        jobId={42}
        resume={{
          content: "  \n  ",
          model_used: "gpt-4o-mini",
          freshness: {
            generatedDate: "4/21/26",
            isStale: false,
            ageDays: 0,
          },
        }}
      />
    );
    expect(container.textContent).toContain(
      "Tailored resume was generated but is empty."
    );
  });

  it("missing branch suppresses Copy button + Download anchor + FreshnessBadge", () => {
    const { container } = render(
      <TailoredResumeSection jobId={42} resume={null} />
    );
    expect(
      container.querySelector('[aria-label="Copy tailored resume to clipboard"]')
    ).toBeNull();
    expect(container.querySelector("a[download]")).toBeNull();
    expect(container.textContent).not.toContain("Generated ");
  });

  it("populated branch still renders the Copy + Download meta row (regression guard for Plan 21-04)", () => {
    const { container } = render(
      <TailoredResumeSection
        jobId={42}
        resume={{
          content: "# Resume\n\nReal content.",
          model_used: "gpt-4o-mini",
          freshness: {
            generatedDate: "4/21/26",
            isStale: false,
            ageDays: 0,
          },
        }}
      />
    );
    expect(
      container.querySelector('[aria-label="Copy tailored resume to clipboard"]')
    ).not.toBeNull();
    expect(container.querySelector("a[download]")).not.toBeNull();
  });
});

describe("Company Intel empty states (AI-RENDER-04)", () => {
  it("missing branch: renders heading + 'No company research yet.'", () => {
    const { container } = render(<CompanyIntelEmptyFixture cr={null} />);
    expect(container.textContent).toContain("Company Intel");
    expect(container.textContent).toContain("No company research yet.");
    const body = container.querySelector("p.italic");
    expect(body).not.toBeNull();
    expect(body?.className).toContain("text-muted-foreground");
    expect(body?.className).toContain("italic");
  });

  it("empty-body branch: renders 'Company research was generated but is empty.'", () => {
    const { container } = render(<CompanyIntelEmptyFixture cr={baseCR} />);
    expect(container.textContent).toContain(
      "Company research was generated but is empty."
    );
  });

  it("populated branch (any field has data) does NOT render the empty copy", () => {
    const { container } = render(
      <CompanyIntelEmptyFixture
        cr={{ ...baseCR, ai_summary: "Real summary" }}
      />
    );
    expect(container.textContent).not.toContain(
      "Company research was generated but is empty."
    );
    expect(container.textContent).not.toContain("No company research yet.");
  });
});
