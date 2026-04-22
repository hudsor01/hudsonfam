import { describe, it, expect } from "vitest";
import { normalizeUrl } from "@/lib/url-helpers";

describe("normalizeUrl — UI-SPEC §4 input/output fixtures", () => {
  it("passes through https:// URLs", () => {
    expect(normalizeUrl("https://acme.com")).toBe("https://acme.com");
  });

  it("passes through http:// URLs", () => {
    expect(normalizeUrl("http://acme.com")).toBe("http://acme.com");
  });

  it("passes through https:// URLs with path + query", () => {
    expect(normalizeUrl("https://acme.com/about?ref=x")).toBe(
      "https://acme.com/about?ref=x"
    );
  });

  it("prepends https:// to www.-prefixed domain", () => {
    expect(normalizeUrl("www.acme.com")).toBe("https://www.acme.com");
  });

  it("prepends https:// to bare domain", () => {
    expect(normalizeUrl("acme.com")).toBe("https://acme.com");
  });

  it("prepends https:// to bare domain with path", () => {
    expect(normalizeUrl("acme.com/careers")).toBe("https://acme.com/careers");
  });

  it("returns null for empty string", () => {
    expect(normalizeUrl("")).toBeNull();
  });

  it("returns null for single dash", () => {
    expect(normalizeUrl("-")).toBeNull();
  });

  it("returns null for N/A / n/a (case-insensitive)", () => {
    expect(normalizeUrl("N/A")).toBeNull();
    expect(normalizeUrl("n/a")).toBeNull();
  });

  it("returns null for null / undefined (string) / null (type)", () => {
    expect(normalizeUrl("null")).toBeNull();
    expect(normalizeUrl("undefined")).toBeNull();
    expect(normalizeUrl(null)).toBeNull();
  });

  it("returns null for no-dot garbage", () => {
    expect(normalizeUrl("just a string no dots")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("accepts file.txt (lenient TLD — Researcher Note in UI-SPEC §4)", () => {
    // Researcher Note: UI-SPEC explicitly accepts this as a lenient
    // fallback. Broken DNS + `rel="noopener noreferrer"` + target="_blank"
    // makes this harmless in practice.
    expect(normalizeUrl("file.txt")).toBe("https://file.txt");
  });

  it("rejects javascript: URI (security — scheme returns null)", () => {
    // javascript:alert(1) doesn't match ^https?:// AND doesn't match the
    // bare-domain regex (contains colon + characters that aren't in a
    // plausible TLD shape). Returns null.
    expect(normalizeUrl("javascript:alert(1)")).toBeNull();
  });

  it("rejects data: URI (security)", () => {
    expect(normalizeUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
  });

  it("rejects file: URI (security)", () => {
    // file:// URIs could leak local-filesystem paths; the regex doesn't
    // match `file://...` because /^https?:\/\// check fails and the bare-
    // domain regex doesn't accept the `file:` prefix.
    expect(normalizeUrl("file:///etc/passwd")).toBeNull();
  });
});
