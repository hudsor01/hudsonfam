import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FreshnessBadge } from "@/app/(admin)/admin/jobs/freshness-badge";

describe("FreshnessBadge", () => {
  it("renders fresh state with relative time and model", () => {
    const { container } = render(
      <FreshnessBadge
        relativeTime="3 hours ago"
        modelUsed="gpt-4o-mini"
        isStale={false}
        ageDays={0}
      />
    );
    expect(container.textContent).toContain("Generated 3 hours ago");
    expect(container.textContent).toContain("gpt-4o-mini");
    expect(container.textContent).toContain("·"); // middle-dot
    expect(container.textContent).not.toContain(" - ");
    expect(container.textContent).not.toContain(" | ");
    expect(container.querySelector(".bg-warning")).toBeNull();
  });

  it("drops separator and model when modelUsed is null", () => {
    const { container } = render(
      <FreshnessBadge
        relativeTime="2 days ago"
        modelUsed={null}
        isStale={false}
        ageDays={2}
      />
    );
    expect(container.textContent).toContain("Generated 2 days ago");
    expect(container.textContent).not.toContain("·");
  });

  it("renders stale state with amber dot", () => {
    const { container } = render(
      <FreshnessBadge
        relativeTime="5 days ago"
        modelUsed="gpt-4o-mini"
        isStale={true}
        ageDays={5}
      />
    );
    const dot = container.querySelector(".bg-warning");
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute("aria-label")).toBe("Stale artifact");
  });

  it("renders nothing when relativeTime is empty", () => {
    const { container } = render(
      <FreshnessBadge
        relativeTime=""
        modelUsed="gpt-4o-mini"
        isStale={false}
        ageDays={null}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses text-muted-foreground and text-[11px] classes (UI-SPEC typography)", () => {
    const { container } = render(
      <FreshnessBadge
        relativeTime="1 hour ago"
        modelUsed="gpt-4o-mini"
        isStale={false}
        ageDays={0}
      />
    );
    const root = container.firstElementChild as HTMLElement | null;
    expect(root).not.toBeNull();
    expect(root?.className).toContain("text-muted-foreground");
    expect(root?.className).toContain("text-[11px]");
    expect(root?.className).toContain("font-medium");
  });
});
