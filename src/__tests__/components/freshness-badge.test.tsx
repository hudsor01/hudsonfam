import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FreshnessBadge } from "@/app/(admin)/admin/jobs/freshness-badge";

describe("FreshnessBadge", () => {
  it("renders fresh state with formatted date and model", () => {
    const { container } = render(
      <FreshnessBadge
        generatedDate="4/21/26"
        modelUsed="gpt-4o-mini"
        isStale={false}
        ageDays={0}
      />
    );
    expect(container.textContent).toContain("Generated 4/21/26");
    expect(container.textContent).toContain("gpt-4o-mini");
    expect(container.textContent).toContain("·"); // middle-dot
    expect(container.textContent).not.toContain(" - ");
    expect(container.textContent).not.toContain(" | ");
    expect(container.querySelector(".bg-warning")).toBeNull();
  });

  it("drops separator and model when modelUsed is null", () => {
    const { container } = render(
      <FreshnessBadge
        generatedDate="4/19/26"
        modelUsed={null}
        isStale={false}
        ageDays={2}
      />
    );
    expect(container.textContent).toContain("Generated 4/19/26");
    expect(container.textContent).not.toContain("·");
  });

  it("renders stale state with amber dot", () => {
    const { container } = render(
      <FreshnessBadge
        generatedDate="4/16/26"
        modelUsed="gpt-4o-mini"
        isStale={true}
        ageDays={5}
      />
    );
    const dot = container.querySelector(".bg-warning");
    expect(dot).not.toBeNull();
    expect(dot?.getAttribute("aria-label")).toBe("Stale artifact");
  });

  it("renders nothing when generatedDate is empty", () => {
    const { container } = render(
      <FreshnessBadge
        generatedDate=""
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
        generatedDate="4/21/26"
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
