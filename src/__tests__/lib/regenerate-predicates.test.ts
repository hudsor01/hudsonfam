import { describe, it, expect } from "vitest";
import {
  coverLetterIsDone,
  tailoredResumeIsDone,
  salaryIntelligenceIsDone,
} from "@/lib/regenerate-predicates";
import type { FreshJobDetail } from "@/lib/jobs-db";

/**
 * Minimal fixture helpers — only the fields the predicates read are set.
 * Casting to `FreshJobDetail` keeps the test file free of the large
 * interface's unrelated fields; the predicates only touch
 * `cover_letter.generated_at`, `tailored_resume.generated_at`, and
 * `salary_intelligence.search_date`.
 */
function coverLetterDetail(
  generated_at: string | null | undefined,
): FreshJobDetail {
  return {
    cover_letter:
      generated_at === undefined
        ? null
        : ({ generated_at } as FreshJobDetail["cover_letter"]),
  } as FreshJobDetail;
}

function tailoredResumeDetail(
  generated_at: string | null | undefined,
): FreshJobDetail {
  return {
    tailored_resume:
      generated_at === undefined
        ? null
        : ({ generated_at } as FreshJobDetail["tailored_resume"]),
  } as FreshJobDetail;
}

function salaryDetail(
  search_date: string | null | undefined,
): FreshJobDetail {
  return {
    salary_intelligence:
      search_date === undefined
        ? null
        : ({ search_date } as FreshJobDetail["salary_intelligence"]),
  } as FreshJobDetail;
}

const BASELINE_ISO = "2026-04-20T00:00:00.000Z";
const NEWER_ISO = "2026-04-22T14:00:00.000Z";
const EARLIER_ISO = "2026-04-19T00:00:00.000Z";

describe("coverLetterIsDone — ISO timestamp predicate (AI-ACTION-05 pattern)", () => {
  it("returns false when detail is null", () => {
    expect(coverLetterIsDone(null, BASELINE_ISO)).toBe(false);
  });

  it("returns false when cover_letter is null", () => {
    expect(coverLetterIsDone(coverLetterDetail(undefined), BASELINE_ISO)).toBe(
      false,
    );
  });

  it("returns false when generated_at is missing on cover_letter", () => {
    expect(coverLetterIsDone(coverLetterDetail(null), BASELINE_ISO)).toBe(
      false,
    );
  });

  it("returns true when serverBaseline is null and cover_letter has generated_at (INSERT-wait fallback)", () => {
    expect(coverLetterIsDone(coverLetterDetail(NEWER_ISO), null)).toBe(true);
  });

  it("returns false at the exact baseline (strictly greater-than comparison)", () => {
    expect(coverLetterIsDone(coverLetterDetail(BASELINE_ISO), BASELINE_ISO)).toBe(
      false,
    );
  });

  it("returns false when generated_at is earlier than baseline", () => {
    expect(coverLetterIsDone(coverLetterDetail(EARLIER_ISO), BASELINE_ISO)).toBe(
      false,
    );
  });

  it("returns true when generated_at is strictly newer than baseline", () => {
    expect(coverLetterIsDone(coverLetterDetail(NEWER_ISO), BASELINE_ISO)).toBe(
      true,
    );
  });
});

describe("tailoredResumeIsDone — ISO timestamp predicate (AI-ACTION-05 pattern)", () => {
  it("returns false when detail is null", () => {
    expect(tailoredResumeIsDone(null, BASELINE_ISO)).toBe(false);
  });

  it("returns false when tailored_resume is null", () => {
    expect(
      tailoredResumeIsDone(tailoredResumeDetail(undefined), BASELINE_ISO),
    ).toBe(false);
  });

  it("returns false when generated_at is missing", () => {
    expect(tailoredResumeIsDone(tailoredResumeDetail(null), BASELINE_ISO)).toBe(
      false,
    );
  });

  it("returns true when serverBaseline is null and tailored_resume has generated_at", () => {
    expect(tailoredResumeIsDone(tailoredResumeDetail(NEWER_ISO), null)).toBe(
      true,
    );
  });

  it("returns false at the exact baseline", () => {
    expect(
      tailoredResumeIsDone(tailoredResumeDetail(BASELINE_ISO), BASELINE_ISO),
    ).toBe(false);
  });

  it("returns true when generated_at advances past baseline", () => {
    expect(
      tailoredResumeIsDone(tailoredResumeDetail(NEWER_ISO), BASELINE_ISO),
    ).toBe(true);
  });
});

describe("salaryIntelligenceIsDone — date-granular predicate (AI-ACTION-06, D-04)", () => {
  const SALARY_BASELINE = "2026-04-20";
  const SALARY_NEWER = "2026-04-21";
  const SALARY_EARLIER = "2026-04-19";

  it("returns false when detail is null", () => {
    expect(salaryIntelligenceIsDone(null, SALARY_BASELINE)).toBe(false);
  });

  it("returns false when salary_intelligence is null", () => {
    expect(
      salaryIntelligenceIsDone(salaryDetail(undefined), SALARY_BASELINE),
    ).toBe(false);
  });

  it("returns false when search_date is missing", () => {
    expect(salaryIntelligenceIsDone(salaryDetail(null), SALARY_BASELINE)).toBe(
      false,
    );
  });

  it("returns true when serverBaseline is null and search_date exists (INSERT-wait)", () => {
    expect(salaryIntelligenceIsDone(salaryDetail(SALARY_NEWER), null)).toBe(
      true,
    );
  });

  it("returns false on same-day regenerate (Pitfall 1 / D-04 — known rough edge)", () => {
    // Same-day regenerate does NOT advance search_date; predicate returns false
    // across all 60 polls, triggering silent-success.
    expect(
      salaryIntelligenceIsDone(salaryDetail(SALARY_BASELINE), SALARY_BASELINE),
    ).toBe(false);
  });

  it("returns false when search_date is earlier than baseline", () => {
    expect(
      salaryIntelligenceIsDone(salaryDetail(SALARY_EARLIER), SALARY_BASELINE),
    ).toBe(false);
  });

  it("returns true when search_date is a later calendar day (UTC-midnight parse, D-04)", () => {
    expect(
      salaryIntelligenceIsDone(salaryDetail(SALARY_NEWER), SALARY_BASELINE),
    ).toBe(true);
  });
});
