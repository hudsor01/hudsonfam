import { describe, it, expect } from "vitest";
import { isCompanyResearchEmpty } from "@/lib/is-company-research-empty";
import { EMPTY_STATE_COPY } from "@/lib/empty-state-copy";
import type { CompanyResearch } from "@/lib/jobs-db";

const baseAllNull: CompanyResearch = {
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

describe("EMPTY_STATE_COPY — six locked strings (AI-RENDER-04 / D-12)", () => {
  it("locks cover_letter.missing", () => {
    expect(EMPTY_STATE_COPY.cover_letter.missing).toBe("No cover letter yet.");
  });

  it("locks cover_letter.empty", () => {
    expect(EMPTY_STATE_COPY.cover_letter.empty).toBe(
      "Cover letter was generated but is empty."
    );
  });

  it("locks tailored_resume.missing", () => {
    expect(EMPTY_STATE_COPY.tailored_resume.missing).toBe(
      "No tailored resume yet."
    );
  });

  it("locks tailored_resume.empty", () => {
    expect(EMPTY_STATE_COPY.tailored_resume.empty).toBe(
      "Tailored resume was generated but is empty."
    );
  });

  it("locks company_research.missing", () => {
    expect(EMPTY_STATE_COPY.company_research.missing).toBe(
      "No company research yet."
    );
  });

  it("locks company_research.empty", () => {
    expect(EMPTY_STATE_COPY.company_research.empty).toBe(
      "Company research was generated but is empty."
    );
  });
});

describe("isCompanyResearchEmpty", () => {
  it("returns true when every LLM-derived field is null/empty", () => {
    expect(isCompanyResearchEmpty(baseAllNull)).toBe(true);
  });

  it("returns false when ai_summary is populated", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, ai_summary: "Real summary" })
    ).toBe(false);
  });

  it("returns false when tech_stack has entries", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, tech_stack: ["React"] })
    ).toBe(false);
  });

  it("returns false when recent_news is populated", () => {
    expect(
      isCompanyResearchEmpty({
        ...baseAllNull,
        recent_news: "Series B announcement",
      })
    ).toBe(false);
  });

  it("returns false when glassdoor_rating is a number (even a low rating)", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, glassdoor_rating: 4.2 })
    ).toBe(false);
  });

  it("returns false when funding_stage is populated", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, funding_stage: "Series B" })
    ).toBe(false);
  });

  it("returns false when employee_count is populated", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, employee_count: "51-200" })
    ).toBe(false);
  });

  it("returns false when salary_range_min is a number", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, salary_range_min: 100000 })
    ).toBe(false);
  });

  it("returns false when salary_range_max is a number", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, salary_range_max: 150000 })
    ).toBe(false);
  });

  it("treats whitespace-only ai_summary / recent_news as empty", () => {
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, ai_summary: "   " })
    ).toBe(true);
    expect(
      isCompanyResearchEmpty({ ...baseAllNull, recent_news: "\t\n" })
    ).toBe(true);
  });
});
