import { describe, it, expect } from "vitest";
import { isStale, STALE_THRESHOLDS } from "@/lib/job-freshness";

describe("isStale", () => {
  const now = new Date("2026-04-21T12:00:00Z");

  it("returns false for null timestamps", () => {
    expect(isStale(null, 14, now)).toBe(false);
  });

  it("returns false for fresh artifacts (within threshold)", () => {
    const tenDaysAgo = new Date(now.getTime() - 10 * 86_400_000).toISOString();
    expect(isStale(tenDaysAgo, 14, now)).toBe(false);
  });

  it("returns true for stale artifacts (past threshold)", () => {
    const twentyDaysAgo = new Date(now.getTime() - 20 * 86_400_000).toISOString();
    expect(isStale(twentyDaysAgo, 14, now)).toBe(true);
  });

  it("returns true exactly at the threshold boundary (inclusive)", () => {
    const exactly14DaysAgo = new Date(now.getTime() - 14 * 86_400_000).toISOString();
    expect(isStale(exactly14DaysAgo, 14, now)).toBe(true);
  });

  it("returns false for invalid date strings (silent fallback)", () => {
    expect(isStale("not-a-date", 14, now)).toBe(false);
  });

  it("honors per-artifact thresholds independently", () => {
    const fortyDaysAgo = new Date(now.getTime() - 40 * 86_400_000).toISOString();
    // 40 >= 14 → stale under cover_letter
    expect(isStale(fortyDaysAgo, STALE_THRESHOLDS.cover_letter, now)).toBe(true);
    // 40 < 60 → fresh under company_research
    expect(isStale(fortyDaysAgo, STALE_THRESHOLDS.company_research, now)).toBe(false);
  });

  it("exposes the four expected threshold constants", () => {
    expect(STALE_THRESHOLDS.cover_letter).toBe(14);
    expect(STALE_THRESHOLDS.tailored_resume).toBe(14);
    expect(STALE_THRESHOLDS.company_research).toBe(60);
    expect(STALE_THRESHOLDS.salary_intelligence).toBe(30);
  });
});
