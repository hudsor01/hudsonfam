import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 proxy (renamed from middleware.ts in Next.js 16 — per
 * official docs "Migrate Middleware Convention to Proxy"). Generates a
 * per-request CSP nonce and attaches a Content-Security-Policy header
 * scoped to /admin/* per CONTEXT.md D-04, D-05, D-06.
 *
 * CSP shape (D-04 pragmatic, not strict-nonce-for-styles):
 *   default-src 'self'
 *   script-src 'self' 'nonce-{n}' 'strict-dynamic'   (+ 'unsafe-eval' in dev for Turbopack HMR)
 *   style-src  'self' 'unsafe-inline'                 (Tailwind v4 + shadcn inline styles)
 *   object-src 'none'                                  (blocks Flash / PDF embed XSS vectors — Pitfall 2)
 *   frame-ancestors 'none'                             (clickjacking defense)
 *   base-uri   'self'                                  (blocks base-tag injection)
 *
 * Scope: /admin/* only (D-05). Public site (blog MDX, photo OG tags, memorial
 * media embeds) is NOT hardened by this proxy to avoid breaking existing
 * inline patterns the public surface may rely on.
 *
 * Enforcement: real CSP from day one, NOT Report-Only (D-06). Tailored resume
 * is the first markdown-rendered surface — block XSS now, iterate later.
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";

  // 'strict-dynamic' is required so Next.js's _next/static/chunks/*.js webpack
  // runtime (loaded by a nonce-allowed script) continues to work without
  // individual nonce plumbing for every chunk.
  // 'unsafe-eval' is required for Turbopack HMR eval()-based hot-update
  // module loading; production builds do NOT include it.
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

  // Set on BOTH request (so Server Components can read via headers()) AND
  // response (so the browser enforces). Setting only one is a silent miss.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  // D-05: scope strictly to /admin — do NOT expand to /(.*) because blog MDX
  // and other public surfaces may rely on inline patterns CSP would break.
  matcher: ["/admin/:path*"],
};
