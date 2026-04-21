import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Streamdown } from "streamdown";

/**
 * Streamdown XSS regression guard (AI-SAFETY-01).
 *
 * CONTEXT.md D-12 says "Streamdown's default pipeline is safe"; RESEARCH.md §Q2
 * corrects that — Streamdown's DEFAULT `rehypePlugins` INCLUDES `rehype-raw`.
 * The actual XSS protection comes from passing `skipHtml` explicitly on the
 * `<Streamdown>` component.
 *
 * OBSERVED BEHAVIOR (stronger than plan's assumption — documented deviation
 * in 20-05-SUMMARY.md under "Rule 1 Auto-fixes"):
 *   - `<script>...</script>` → stripped entirely (empty output, not literalized)
 *   - `<iframe ...></iframe>` → stripped entirely (empty output, not literalized)
 *   - `<img onerror=...>` → replaced with "[Image blocked: No description]"
 *     placeholder span (rehype-harden behavior, not literalized)
 *
 * These tests lock the security guarantee: no executable <script>, <iframe>,
 * or <img onerror> in the DOM. The "rendered as literal text" assertion from
 * the plan is replaced with a stronger "the XSS element type is entirely
 * absent" assertion, which matches Streamdown's actual skipHtml behavior.
 *
 * Ships in the same PR as the Streamdown integration per CONTEXT.md D-13.
 */
describe("Streamdown XSS protection with skipHtml", () => {
  const XSS_PAYLOADS = [
    "<script>alert(1)</script>",
    '<iframe src="javascript:alert(1)"></iframe>',
    "<img src=x onerror=alert(1)>",
  ];

  for (const payload of XSS_PAYLOADS) {
    it(`neutralizes '${payload}' — no executable DOM emitted`, () => {
      const { container } = render(
        <Streamdown skipHtml linkSafety={{ enabled: false }}>
          {payload}
        </Streamdown>
      );

      // Assertion 1: no <script> element in the rendered output
      expect(container.querySelector("script")).toBeNull();

      // Assertion 2: no <iframe> element
      expect(container.querySelector("iframe")).toBeNull();

      // Assertion 3: no <img> element with an onerror attribute
      const imgs = container.querySelectorAll("img");
      imgs.forEach((img) => {
        expect(img.getAttribute("onerror")).toBeNull();
      });

      // Assertion 4: no inline event-handler attributes survive on ANY element
      const allElements = container.querySelectorAll("*");
      allElements.forEach((el) => {
        for (const attr of el.getAttributeNames()) {
          expect(attr.toLowerCase().startsWith("on")).toBe(false);
        }
      });
    });
  }

  it("renders safe markdown (heading, bold, list) normally", () => {
    const md = "# Title\n\n**bold**\n\n- item 1\n- item 2";
    const { container } = render(
      <Streamdown skipHtml linkSafety={{ enabled: false }}>
        {md}
      </Streamdown>
    );
    expect(container.querySelector("h1")).not.toBeNull();
    // Streamdown emits bold as <span data-streamdown="strong">, not <strong>
    expect(
      container.querySelector('[data-streamdown="strong"]')
    ).not.toBeNull();
    const lis = container.querySelectorAll("li");
    expect(lis.length).toBeGreaterThanOrEqual(2);
  });

  it("strips javascript: URIs from markdown link hrefs", () => {
    const md = "[click me](javascript:alert(1))";
    const { container } = render(
      <Streamdown skipHtml linkSafety={{ enabled: false }}>
        {md}
      </Streamdown>
    );
    const links = container.querySelectorAll("a");
    links.forEach((a) => {
      const href = a.getAttribute("href") ?? "";
      expect(href.toLowerCase().startsWith("javascript:")).toBe(false);
    });
  });
});
