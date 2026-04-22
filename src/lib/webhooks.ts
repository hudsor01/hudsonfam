import { createHmac } from "node:crypto";

/**
 * 4 bounded sentinel strings returned to callers on any failure path.
 * Cluster IPs, raw error messages, and stack traces MUST NEVER cross this
 * boundary — they are logged server-side via console.error only.
 *
 * Mapping (D-07):
 *   AbortError / TimeoutError       → "timeout"
 *   HTTP 401 / 403                   → "auth"
 *   HTTP 429                         → "rate limit"
 *   HTTP 5xx / connect-refused / DNS → "unavailable"
 */
export type ErrorSentinel = "timeout" | "auth" | "rate limit" | "unavailable";

export type WebhookResult =
  | { ok: true }
  | { ok: false; sentinel: ErrorSentinel };

function sentinel(
  kind: ErrorSentinel,
  err: unknown,
  path: string,
  status?: number,
): WebhookResult {
  console.error(`[webhook:${path}] ${kind}`, { err, status });
  return { ok: false, sentinel: kind };
}

/**
 * POST to `${WEBHOOK_BASE}/webhook/${path}` with HMAC-SHA256 signature
 * over `${timestamp}.${path}.${rawBody}` (D-02) and X-Idempotency-Key header.
 *
 * Returns a discriminated-union result — never throws. Full error detail is
 * logged to stderr; only the 4 bounded sentinel strings reach callers.
 *
 * Env vars read at call time (not module load) so Vitest can import this file
 * without pre-wiring the environment:
 *   - N8N_WEBHOOK_SECRET  (required; missing → logs + returns "unavailable")
 *   - N8N_WEBHOOK_URL     (defaults to homelab cluster-internal URL)
 *
 * @param path            Webhook path suffix (e.g. "job-company-intel"). No leading slash.
 * @param body            JSON-serializable object; serialized ONCE (Pitfall 1).
 * @param idempotencyKey  Fresh UUID per call (D-03); caller's responsibility.
 */
export async function sendSignedWebhook(
  path: string,
  body: Record<string, unknown>,
  idempotencyKey: string,
): Promise<WebhookResult> {
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!secret) {
    return sentinel(
      "unavailable",
      new Error("N8N_WEBHOOK_SECRET not configured"),
      path,
    );
  }

  const webhookBase =
    process.env.N8N_WEBHOOK_URL || "http://n8n.cloud.svc.cluster.local:5678";

  // Pitfall 1: serialize ONCE and use the same string for signing AND sending.
  const rawBody = JSON.stringify(body);
  const timestamp = Date.now().toString();
  const canonical = `${timestamp}.${path}.${rawBody}`;
  const sig = createHmac("sha256", secret).update(canonical).digest("hex");

  try {
    const r = await fetch(`${webhookBase}/webhook/${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Hudsonfam-Signature": `sha256=${sig}`,
        "X-Hudsonfam-Timestamp": timestamp,
        "X-Idempotency-Key": idempotencyKey,
      },
      body: rawBody, // SAME string signed above (D-02 / Pitfall 1)
      signal: AbortSignal.timeout(5000),
    });

    // D-07 cascade order:
    if (r.status === 401 || r.status === 403) {
      return sentinel("auth", null, path, r.status);
    }
    if (r.status === 429) {
      return sentinel("rate limit", null, path, r.status);
    }
    if (!r.ok) {
      return sentinel("unavailable", null, path, r.status);
    }
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === "AbortError" || name === "TimeoutError") {
      return sentinel("timeout", e, path);
    }
    return sentinel("unavailable", e, path);
  }
}
