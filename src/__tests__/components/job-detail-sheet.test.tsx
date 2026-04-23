import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ReactElement } from "react";
import { render as rtlRender } from "@testing-library/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ProvenanceTag } from "@/app/(admin)/admin/jobs/provenance-tag";

/**
 * Phase 22 Plan 22-07 tests for `src/app/(admin)/admin/jobs/job-detail-sheet.tsx`.
 *
 * Two concerns:
 *  1. Grep gate G-1 (UI-SPEC §Grep-verifiable gates) — every `formatSalary(`
 *     render site in the sheet is followed within 5 source lines by a
 *     `<ProvenanceTag` or `<Badge variant="outline"`. Function-declaration
 *     lines are excluded (`function formatSalary(min, max)` at line 49 is
 *     not a render site). Grep gate G-4 also checked — SalaryIntelligenceSection
 *     is wrapped in SectionErrorBoundary section="salary_intelligence".
 *  2. D-12 currency cascade — when `detail.salary_currency` is null the
 *     header salary block does not render; when
 *     `detail.company_research.salary_currency` is null the Company Intel
 *     salary-range block does not render. Both guards must be present in the
 *     production source (source-text assertions — full Sheet mount is
 *     unnecessary to lock in the guard expression itself; same inline-fixture
 *     pattern Plan 21-06 empty-states.test.tsx established).
 *
 * Plus ProvenanceTag smoke tests for the two retrofit sources (scraped +
 * company_research) at the sheet level so that color-class + visible-label
 * drift trips this file rather than silently regressing.
 */

function render(ui: ReactElement) {
  return rtlRender(ui, {
    wrapper: ({ children }) => (
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    ),
  });
}

const SHEET_PATH = path.join(
  process.cwd(),
  "src/app/(admin)/admin/jobs/job-detail-sheet.tsx"
);
const sheetSource = readFileSync(SHEET_PATH, "utf-8");
const sheetLines = sheetSource.split("\n");

describe("job-detail-sheet.tsx — provenance-tag adjacency (grep gate G-1)", () => {
  it("every formatSalary( call site (excluding the function declaration) is within 5 lines of <ProvenanceTag or <Badge variant=\"outline\"", () => {
    const unmatched: number[] = [];
    for (let i = 0; i < sheetLines.length; i++) {
      const line = sheetLines[i];
      // Skip the function declaration line itself
      if (/function\s+formatSalary\s*\(/.test(line)) continue;
      if (!/formatSalary\s*\(/.test(line)) continue;

      // Look ahead up to 5 lines for a ProvenanceTag or outline Badge
      const window = sheetLines
        .slice(i, Math.min(i + 6, sheetLines.length))
        .join("\n");
      const hasTag =
        /<ProvenanceTag\b/.test(window) ||
        /<Badge\s+variant="outline"/.test(window);
      if (!hasTag) unmatched.push(i + 1); // 1-indexed line number
    }
    expect(
      unmatched,
      `Lines with formatSalary( lacking adjacent provenance: ${unmatched.join(", ")}`
    ).toEqual([]);
  });

  it("contains <ProvenanceTag source=\"scraped\" (header retrofit) exactly once", () => {
    const count = (sheetSource.match(/<ProvenanceTag\s+source="scraped"/g) || [])
      .length;
    expect(count).toBe(1);
  });

  it("contains <ProvenanceTag source=\"company_research\" (Company Intel retrofit) exactly once", () => {
    const count = (
      sheetSource.match(/<ProvenanceTag\s+source="company_research"/g) || []
    ).length;
    expect(count).toBe(1);
  });

  it("wraps SalaryIntelligenceSection in SectionErrorBoundary section=\"salary_intelligence\" (grep gate G-4)", () => {
    // Multi-line match: SectionErrorBoundary + section="salary_intelligence" precedes <SalaryIntelligenceSection
    const match = sheetSource.match(
      /SectionErrorBoundary[\s\S]{0,200}section="salary_intelligence"[\s\S]{0,200}<SalaryIntelligenceSection/
    );
    expect(match).not.toBeNull();
  });
});

describe("job-detail-sheet.tsx — D-12 currency cascade (block hides when currency is null)", () => {
  it("header salary block guards on && detail.salary_currency", () => {
    // The header block's guard must include `detail.salary_currency` as a truthy check after formatSalary().
    const match = sheetSource.match(
      /formatSalary\(detail\.salary_min,\s*detail\.salary_max\)[\s\S]{0,80}&&[\s\S]{0,30}detail\.salary_currency/
    );
    expect(match).not.toBeNull();
  });

  it("Company Intel salary block guards on && detail.company_research.salary_currency", () => {
    // Multi-line match on the Company Intel guard expression.
    const match = sheetSource.match(
      /detail\.company_research\.salary_range_max\)[\s\S]{0,80}&&[\s\S]{0,80}detail\.company_research\.salary_currency/
    );
    expect(match).not.toBeNull();
  });
});

describe("ProvenanceTag smoke tests for the two retrofit sources", () => {
  it("ProvenanceTag renders with text-muted-foreground for source=\"scraped\"", () => {
    const { container } = render(<ProvenanceTag source="scraped" />);
    const badge = container.querySelector(".text-muted-foreground");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("scraped");
  });

  it("ProvenanceTag renders with text-success for source=\"company_research\"", () => {
    const { container } = render(<ProvenanceTag source="company_research" />);
    const badge = container.querySelector(".text-success");
    expect(badge).toBeTruthy();
    expect(badge?.textContent).toBe("company research");
  });
});

describe("job-detail-sheet.tsx — Phase 23 button mount assertions (G-4)", () => {
  it("TriggerCompanyResearchButton is nested inside SectionErrorBoundary section=\"company_research\" (G-4)", () => {
    const match = sheetSource.match(
      /SectionErrorBoundary[\s\S]{0,400}section="company_research"[\s\S]{0,600}<TriggerCompanyResearchButton/
    );
    expect(
      match,
      "TriggerCompanyResearchButton is not nested inside SectionErrorBoundary section=\"company_research\" — move it inside the existing boundary (G-4)"
    ).not.toBeNull();
  });

  it("RegenerateButton (artifact=\"cover_letter\") is nested inside SectionErrorBoundary section=\"cover_letter\" (G-4)", () => {
    // Phase 24 D-01/D-02: generalized RegenerateButton replaces the Phase 23
    // RegenerateCoverLetterButton. The cover_letter section has three ternary
    // branches (null / empty / populated) before the populated branch's meta
    // row; the mount point sits ~3200 chars after `section="cover_letter"`.
    // A 4000-char window accommodates the current distance with headroom; if
    // a future refactor moves the mount point further, this test fails loudly.
    const match = sheetSource.match(
      /SectionErrorBoundary[\s\S]{0,400}section="cover_letter"[\s\S]{0,4000}<RegenerateButton[\s\S]{0,200}artifact="cover_letter"/
    );
    expect(
      match,
      "RegenerateButton artifact=\"cover_letter\" is not nested inside SectionErrorBoundary section=\"cover_letter\" — move it inside the existing boundary (G-4)"
    ).not.toBeNull();
  });

  it("TriggerCompanyResearchButton mounts only inside the company_research === null branch (source-text guard)", () => {
    const lines = sheetSource.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!/detail\.company_research\s*===\s*null/.test(lines[i])) continue;
      const window = lines.slice(i, Math.min(i + 20, lines.length)).join("\n");
      expect(
        window,
        "TriggerCompanyResearchButton not found within 20 lines after company_research === null branch condition"
      ).toMatch(/<TriggerCompanyResearchButton/);
      return;
    }
    throw new Error("No `detail.company_research === null` branch found in job-detail-sheet.tsx");
  });

  it("RegenerateButton appears within 20 lines after a Download PDF anchor (populated cover_letter branch guard)", () => {
    // Phase 24 D-01/D-02: RegenerateButton (generalized) sits adjacent to the
    // Download PDF anchor inside the populated-branch meta row, same spatial
    // relationship Phase 23 locked; renamed import (RegenerateButton) is the
    // only delta vs pre-Phase-24 source.
    const lines = sheetSource.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (!/Download PDF/.test(lines[i])) continue;
      const window = lines.slice(i, Math.min(i + 20, lines.length)).join("\n");
      expect(
        window,
        "RegenerateButton not found within 20 lines after the Download PDF anchor (populated-branch meta row)"
      ).toMatch(/<RegenerateButton/);
      return;
    }
    throw new Error("No `Download PDF` anchor found in job-detail-sheet.tsx");
  });
});

// ---------------------------------------------------------------------------
// Phase 24 Plan 03 — G-4 boundary pairings (3 mounts) + G-5 verbatim labels
// ---------------------------------------------------------------------------
//
// G-4 asserts that each of the 3 RegenerateButton mounts is nested inside the
// matching SectionErrorBoundary. Because the tailored_resume + salary_intelligence
// mounts live *inside* their respective section components (mount-inside-section
// pattern F — Pitfall 4 recommendation), the G-4 assertion splits across three
// files: the sheet owns the cover_letter pairing (asserted above); the two
// section-component files own the artifact-prop declaration. The pairings below
// assert the nested mount shape via source-text adjacency in the appropriate
// file for each artifact.
//
// G-5 asserts that all 3 verbatim button labels appear in source at their
// respective mount sites — the single source-of-truth for the contractual
// labels specified in ROADMAP Phase 24 Success Criteria.
// ---------------------------------------------------------------------------

const TAILORED_RESUME_PATH = path.join(
  process.cwd(),
  "src/app/(admin)/admin/jobs/tailored-resume-section.tsx"
);
const SALARY_INTELLIGENCE_PATH = path.join(
  process.cwd(),
  "src/app/(admin)/admin/jobs/salary-intelligence-section.tsx"
);
const tailoredResumeSource = readFileSync(TAILORED_RESUME_PATH, "utf-8");
const salaryIntelligenceSource = readFileSync(
  SALARY_INTELLIGENCE_PATH,
  "utf-8"
);

describe("Phase 24 Plan 03 — G-4 three boundary pairings (cover_letter, tailored_resume, salary_intelligence)", () => {
  it("G-4 pairing 1/3: cover_letter — <RegenerateButton artifact=\"cover_letter\" nested inside SectionErrorBoundary section=\"cover_letter\" in job-detail-sheet.tsx", () => {
    const match = sheetSource.match(
      /SectionErrorBoundary[\s\S]{0,400}section="cover_letter"[\s\S]{0,4000}<RegenerateButton[\s\S]{0,200}artifact="cover_letter"/
    );
    expect(
      match,
      "cover_letter RegenerateButton not nested inside its SectionErrorBoundary — G-4 pairing broken"
    ).not.toBeNull();
  });

  it("G-4 pairing 2/3: tailored_resume — <RegenerateButton artifact=\"tailored_resume\" present in tailored-resume-section.tsx", () => {
    // The TailoredResumeSection is wrapped by SectionErrorBoundary
    // section="tailored_resume" upstream in job-detail-sheet.tsx (asserted
    // below); this file owns the artifact="tailored_resume" declaration.
    expect(tailoredResumeSource).toMatch(/<RegenerateButton[\s\S]{0,400}artifact="tailored_resume"/);
    // Upstream wrap — the section call site must sit inside the matching boundary.
    expect(sheetSource).toMatch(
      /SectionErrorBoundary[\s\S]{0,200}section="tailored_resume"[\s\S]{0,400}<TailoredResumeSection/
    );
  });

  it("G-4 pairing 3/3: salary_intelligence — <RegenerateButton artifact=\"salary_intelligence\" present in salary-intelligence-section.tsx", () => {
    expect(salaryIntelligenceSource).toMatch(
      /<RegenerateButton[\s\S]{0,400}artifact="salary_intelligence"/
    );
    // Upstream wrap — already asserted above in the grep-gate block, re-asserted
    // here for pairing-completeness traceability.
    expect(sheetSource).toMatch(
      /SectionErrorBoundary[\s\S]{0,200}section="salary_intelligence"[\s\S]{0,400}<SalaryIntelligenceSection/
    );
  });

  it("G-5 verbatim labels: all 3 ROADMAP-SC mount labels appear in source at their respective mount sites", () => {
    // Mount A (cover_letter) — job-detail-sheet.tsx
    expect(sheetSource).toContain('"Regenerate cover letter"');
    // Mount B (tailored_resume) — tailored-resume-section.tsx
    expect(tailoredResumeSource).toContain('"Regenerate tailored resume"');
    // Mount C (salary_intelligence) — salary-intelligence-section.tsx
    expect(salaryIntelligenceSource).toContain('"Regenerate salary intelligence"');
  });

  it("G-4 regression guard: no legacy RegenerateCoverLetterButton references remain in source (full CL → generalized-button migration)", () => {
    // Plan 24-03 completes the rename from Phase 23's RegenerateCoverLetterButton
    // to the generalized RegenerateButton. After Plan 24-01 deleted the original
    // component file, any lingering reference would be a compile-time dead link.
    expect(sheetSource).not.toMatch(/RegenerateCoverLetterButton/);
    expect(sheetSource).not.toMatch(/regenerate-cover-letter-button/);
  });

  it("prop threading: baselineGeneratedAtIso reaches TailoredResumeSection via detail.tailored_resume?.generated_at ?? null", () => {
    expect(sheetSource).toMatch(
      /baselineGeneratedAtIso=\{[\s\S]{0,200}detail\.tailored_resume\?\.generated_at\s*\?\?\s*null/
    );
  });

  it("prop threading: jobId + baselineSearchDate reach SalaryIntelligenceSection", () => {
    // SalaryIntelligenceSection jobId threading guard (Pitfall 4 A4). Window
    // set to 800 chars — the `salary={...}` block before jobId spans the
    // nested ternary + 3-property object literal (~450 chars) so a tighter
    // ceiling would false-fail on a valid formatter change.
    expect(sheetSource).toMatch(
      /<SalaryIntelligenceSection[\s\S]{0,800}jobId=\{detail\.id\}/
    );
    // SalaryIntelligenceSection baselineSearchDate threading guard.
    expect(sheetSource).toMatch(
      /baselineSearchDate=\{[\s\S]{0,200}detail\.salary_intelligence\?\.search_date\s*\?\?\s*null/
    );
  });
});
