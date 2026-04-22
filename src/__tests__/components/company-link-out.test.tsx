import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Building2, ExternalLink } from "lucide-react";
import { normalizeUrl } from "@/lib/url-helpers";

// Inline fixture mirroring the sheet-header conditional-anchor block.
// Exercises the same URL-resolution + anchor-vs-span logic as
// src/app/(admin)/admin/jobs/job-detail-sheet.tsx lines ~117-135.
function CompanyHeaderFixture({
  company,
  jobUrl,
  researchUrl,
}: {
  company: string;
  jobUrl: string | null;
  researchUrl: string | null;
}) {
  if (!company) return null;
  const companyUrl = normalizeUrl(researchUrl ?? jobUrl ?? null);
  const inner = (
    <>
      <Building2 className="size-3.5" />
      {company}
      {companyUrl && (
        <ExternalLink className="size-3 opacity-60" aria-hidden="true" />
      )}
    </>
  );
  return companyUrl ? (
    <a
      href={companyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-sm"
    >
      {inner}
    </a>
  ) : (
    <span className="flex items-center gap-1">{inner}</span>
  );
}

describe("Company link-out (AI-RENDER-06)", () => {
  it("renders anchor with target=_blank + rel=noopener noreferrer when LLM URL resolves", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl={null}
        researchUrl="https://acme.com"
      />
    );
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("https://acme.com");
    expect(anchor!.getAttribute("target")).toBe("_blank");
    expect(anchor!.getAttribute("rel")).toBe("noopener noreferrer");
    expect(anchor!.textContent).toContain("Acme");
  });

  it("falls back to feed URL when LLM URL is null", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl="acme.com"
        researchUrl={null}
      />
    );
    const anchor = container.querySelector("a");
    expect(anchor).not.toBeNull();
    expect(anchor!.getAttribute("href")).toBe("https://acme.com");
  });

  it("prefers LLM URL when BOTH are populated with different values", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl="https://tracking.example/acme"
        researchUrl="https://acme.com"
      />
    );
    const anchor = container.querySelector("a");
    expect(anchor!.getAttribute("href")).toBe("https://acme.com");
  });

  it("renders <span> (no anchor) when both URLs are null", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl={null}
        researchUrl={null}
      />
    );
    expect(container.querySelector("a")).toBeNull();
    const span = container.querySelector("span");
    expect(span).not.toBeNull();
    expect(span!.textContent).toContain("Acme");
  });

  it("renders <span> (no anchor) when URLs are garbage (normalized to null)", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl="N/A"
        researchUrl="-"
      />
    );
    expect(container.querySelector("a")).toBeNull();
  });

  it("does NOT render anchor for javascript: URI (security regression guard)", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl="https://acme.com"
        researchUrl="javascript:alert(1)"
      />
    );
    // researchUrl is preferred by `??` (non-null string wins). normalizeUrl
    // rejects it → companyUrl = null → no anchor. The feed URL is NEVER
    // considered because `??` short-circuits on the first non-null value,
    // even if that value subsequently fails normalization. This is the
    // documented D-19 behavior.
    const anchor = container.querySelector("a");
    expect(anchor).toBeNull();
  });

  it("renders ExternalLink icon with aria-hidden=true when anchor resolves", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl={null}
        researchUrl="https://acme.com"
      />
    );
    const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]');
    // At least one hidden icon is present (the ExternalLink). Building2's
    // aria-hidden default from lucide-react varies by version — just assert
    // the invariant we control.
    expect(hiddenIcons.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render ExternalLink icon when no URL resolves", () => {
    const { container } = render(
      <CompanyHeaderFixture
        company="Acme"
        jobUrl={null}
        researchUrl={null}
      />
    );
    // ExternalLink is only rendered inside the `companyUrl && (...)` branch
    // of `inner`. No anchor ⇒ no ExternalLink in the tree.
    const extLinkIcon = container.querySelector(".lucide-external-link");
    expect(extLinkIcon).toBeNull();
  });
});
