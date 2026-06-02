import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy (renamed from the deprecated Middleware convention —
 * https://nextjs.org/docs/messages/middleware-to-proxy).
 *
 * DORMANT: currently a runtime no-op — the `/admin/*` matcher matches nothing
 * because `/admin` was removed in Phase 30. Kept as security infrastructure;
 * re-activates under FUTURE-02 when the admin returns.
 *
 * Location matters: because this app lives in `src/app`, the proxy file MUST be
 * at `src/proxy.ts` (same level as `app`), NOT the repo root — a root-level
 * `proxy.ts` is silently ignored (empty middleware-manifest.json). The export
 * must be `function proxy`. Proxy runs on the Node.js runtime (edge is not
 * supported; the `runtime` config option is disallowed here); this handler uses
 * only `crypto.randomUUID()` + header APIs, all Node-safe.
 *
 * Generates a per-request CSP nonce and attaches a Content-Security-Policy
 * header scoped to /admin/* per CONTEXT.md D-04, D-05, D-06.
 *
 * CSP shape (D-04 pragmatic, not strict-nonce-for-styles):
 *   default-src 'self'
 *   script-src 'self' 'nonce-{n}' 'strict-dynamic'   (+ 'unsafe-eval' in dev for Turbopack HMR)
 *   style-src  'self' 'unsafe-inline'                 (Tailwind v4 + shadcn inline styles)
 *   object-src 'none'                                  (blocks Flash / PDF embed XSS vectors)
 *   frame-ancestors 'none'                             (clickjacking defense)
 *   base-uri   'self'                                  (blocks base-tag injection)
 *
 * Scope: /admin/* only (D-05). Public site (photo OG tags, memorial, and other
 * public pages) is NOT hardened here to avoid breaking existing inline patterns.
 *
 * Enforcement: real CSP from day one, NOT Report-Only (D-06).
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // 'strict-dynamic' is required so Next.js's _next/static/chunks/*.js webpack
  // runtime (loaded by a nonce-allowed script) continues to work without
  // individual nonce plumbing for every chunk.
  // 'unsafe-eval' (a CSP directive string, not an eval() call) is required for
  // Turbopack HMR eval()-based hot-update loading in dev; prod omits it.
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    isDev ? "'unsafe-eval'" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const cspHeader = `
    default-src 'self';
    script-src ${scriptSrc};
    style-src 'self' 'unsafe-inline';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
  `
    .replace(/\s{2,}/g, " ")
    .trim();

  // Pass the nonce to Server Components via a request header (read with
  // headers()). The CSP itself is a *response* header — the browser only
  // enforces it there — so we set CSP on the response below, not the request.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  // D-05: scope strictly to /admin — do NOT expand to /(.*) because photo OG tags,
  // memorial, and public pages use inline styles / external images that a broader
  // CSP would block.
  matcher: ["/admin/:path*"],
};
