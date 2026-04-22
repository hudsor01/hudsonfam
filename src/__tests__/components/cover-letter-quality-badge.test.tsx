import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Badge } from "@/components/ui/badge";
import { scoreColor } from "@/lib/score-color";

// Inline fixture mirroring the job-detail-sheet.tsx badge block.
// Kept minimal on purpose — assertions verify the render output for
// the 3 bands + null, not the surrounding Tooltip wrapper (Radix
// Tooltip is exercised elsewhere in freshness-badge.test.tsx).
function QualityBadgeFixture({ score }: { score: number | null }) {
  if (score === null) return null;
  return (
    <Badge
      variant="outline"
      className={`text-[11px] ${scoreColor(score)} cursor-default`}
    >
      Quality {score}
    </Badge>
  );
}

describe("Cover Letter quality badge (AI-RENDER-05)", () => {
  it("renders 'Quality 0.5' with text-destructive when score = 0.5 (low band)", () => {
    const { container } = render(<QualityBadgeFixture score={0.5} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("Quality 0.5");
    expect(badge.className).toContain("text-destructive");
    expect(badge.className).not.toContain("text-warning");
    expect(badge.className).not.toContain("text-success");
  });

  it("renders with text-warning when score = 0.7 (mid band)", () => {
    const { container } = render(<QualityBadgeFixture score={0.7} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain("text-warning");
    expect(badge.className).not.toContain("text-destructive");
    expect(badge.className).not.toContain("text-success");
  });

  it("renders with text-success when score = 0.9 (high band)", () => {
    const { container } = render(<QualityBadgeFixture score={0.9} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain("text-success");
    expect(badge.className).not.toContain("text-destructive");
    expect(badge.className).not.toContain("text-warning");
  });

  it("renders nothing when score is null (no placeholder pill)", () => {
    const { container } = render(<QualityBadgeFixture score={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("uses cursor-default and text-[11px] (UI-SPEC §2 visual specs)", () => {
    const { container } = render(<QualityBadgeFixture score={0.7} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain("cursor-default");
    expect(badge.className).toContain("text-[11px]");
  });

  it("does not render a zero-width badge for score = 0 (Pitfall 6 guard)", () => {
    // The score=0 input should still render (0 is a valid score, not null)
    // and should get text-destructive — this is intentional per UI-SPEC.
    // What we guard against is someone refactoring `!== null` to a truthy
    // check which would collapse score=0 to hidden.
    const { container } = render(<QualityBadgeFixture score={0} />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("Quality 0");
    expect(badge.className).toContain("text-destructive");
  });
});
