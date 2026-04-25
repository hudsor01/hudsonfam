# SEED-006 Implementation Aid: Canonical HMAC Verify Code-Node Template

**Status:** Reference template for owner to apply to live n8n workflows during SEED-006 activation.

This file documents the canonical `Code` node that retrofits HMAC-SHA256 verification onto every n8n workflow that hudsonfam fires via `sendSignedWebhook` (`src/lib/webhooks.ts:46-95`). The template is a 1-to-1 mirror of the client-side signing logic and rejects requests that fail any of the 4 checks below.

## Why this exists

SEED-006 (`./.planning/seeds/SEED-006-n8n-hardening-followup.md`) wants HMAC verification added to 5 n8n workflows:

1. `job-feedback-sync` (existing, in n8n DB only — NOT in homelab git)
2. `job-company-intel` (existing, in n8n DB only — NOT in homelab git)
3. `regenerate-cover-letter` (existing, in n8n DB only — NOT in homelab git)
4. `regenerate-tailored-resume` (NEW — created during SEED-006 activation)
5. `regenerate-salary-intelligence` (NEW — created during SEED-006 activation)

The 3 existing workflows live in n8n's runtime database, NOT in git. Phase 28 audit fix work created the 2 NEW regenerate workflows as JSON files in `homelab/apps/cloud/n8n-workflows/current/` (see commit log) — those new workflows already include this HMAC verify Code node inline.

For the 3 EXISTING workflows, the owner must:
1. Open the n8n UI at `https://n8n.cloud.svc.cluster.local` (or whatever URL the homelab Tunnel exposes)
2. Open each workflow
3. Insert a `Code` node immediately after the `Webhook` trigger
4. Paste the JS body below verbatim
5. Connect the `Code` node's output to whatever node currently runs first
6. Save + activate

After all 3 are retrofitted, re-run Phase 28 CICD-13 retroactive smoke (Checks 23.A/23.B/23.C/24.A) to confirm the SAFETY chain is now FULLY VERIFIED end-to-end.

## Canonical HMAC Verify Code Node (paste verbatim into n8n Code node, JavaScript mode)

```javascript
// SEED-006: HMAC-SHA256 verification + idempotency dedup
// Mirrors hudsonfam src/lib/webhooks.ts:67-76 sign-side semantics 1-to-1.
//
// Reads from the Webhook trigger that precedes this node:
//   - $input.first().json.headers['x-hudsonfam-signature']  (e.g. "sha256=abc123...")
//   - $input.first().json.headers['x-hudsonfam-timestamp']  (unix epoch ms as string)
//   - $input.first().json.headers['x-idempotency-key']      (UUID v4)
//   - $input.first().json.body                              (parsed JSON; n8n parses for us)
//   - $input.first().json.path                              (webhook path the request hit, e.g. "regenerate-cover-letter")
//
// Reads from n8n env (set in deployment.yaml):
//   - N8N_WEBHOOK_SECRET (required; same value as hudsonfam's N8N_WEBHOOK_SECRET env)
//
// Outputs:
//   - On success: passes input through unchanged so downstream nodes operate on the verified payload
//   - On failure: throws (n8n returns 4xx to hudsonfam; hudsonfam's webhooks.ts maps 4xx → "auth" sentinel)
//
// Idempotency: dedupe on X-Idempotency-Key with a 5-minute window using n8n's getWorkflowStaticData
//   for cross-execution memory. If the same key was seen within 5 min, returns 200 with no-op (the
//   Server Action will see ok:true and the polling loop will see no row advancement; matching D-09 silent-success).

const crypto = require('crypto');

const item    = $input.first().json;
const headers = item.headers || {};
const sigHdr  = headers['x-hudsonfam-signature'] || headers['X-Hudsonfam-Signature'];
const tsHdr   = headers['x-hudsonfam-timestamp'] || headers['X-Hudsonfam-Timestamp'];
const idemKey = headers['x-idempotency-key']     || headers['X-Idempotency-Key'];
const path    = item.path || item.webhookPath || '';
const body    = item.body || {};
const rawBody = typeof body === 'string' ? body : JSON.stringify(body);

const secret = $env.N8N_WEBHOOK_SECRET;
if (!secret) {
  throw new Error('SEED-006 verify: N8N_WEBHOOK_SECRET env var not set in n8n deployment');
}

// Check 1: required headers present
if (!sigHdr || !tsHdr || !idemKey || !path) {
  throw new Error(`SEED-006 verify: missing required headers (sig=${!!sigHdr} ts=${!!tsHdr} idem=${!!idemKey} path=${!!path})`);
}

// Check 2: timestamp is recent (5-min skew tolerance — replay protection)
const tsMs = Number(tsHdr);
const nowMs = Date.now();
const skewMs = Math.abs(nowMs - tsMs);
if (!Number.isFinite(tsMs) || skewMs > 5 * 60 * 1000) {
  throw new Error(`SEED-006 verify: timestamp skew ${skewMs}ms > 5min (now=${nowMs} hdr=${tsHdr})`);
}

// Check 3: HMAC signature matches
const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(`${tsMs}.${path}.${rawBody}`).digest('hex');
const sigBuf  = Buffer.from(sigHdr, 'utf8');
const expBuf  = Buffer.from(expected, 'utf8');
if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
  throw new Error('SEED-006 verify: HMAC signature mismatch');
}

// Check 4: idempotency dedup (5-min sliding window)
const staticData = $getWorkflowStaticData('global');
staticData.seenKeys = staticData.seenKeys || {};
const cutoff = nowMs - 5 * 60 * 1000;
for (const k of Object.keys(staticData.seenKeys)) {
  if (staticData.seenKeys[k] < cutoff) delete staticData.seenKeys[k];
}
if (staticData.seenKeys[idemKey]) {
  // Duplicate request — return success but do NOT trigger downstream side effects.
  // Hudsonfam's polling loop will see no row advancement (matches D-09 silent-success cascade).
  return [{ json: { ok: true, deduped: true, idemKey } }];
}
staticData.seenKeys[idemKey] = nowMs;

// All checks passed — pass payload through to downstream nodes
return [{ json: item }];
```

## Required n8n env var

Add `N8N_WEBHOOK_SECRET` to `/home/dev-server/homelab/apps/cloud/n8n/deployment.yaml` env block:

```yaml
- name: N8N_WEBHOOK_SECRET
  valueFrom:
    secretKeyRef:
      name: hudsonfam-webhook-secrets
      key: N8N_WEBHOOK_SECRET
```

The Secret `hudsonfam-webhook-secrets` must contain the SAME value as hudsonfam's `N8N_WEBHOOK_SECRET` env var (per `src/lib/webhooks.ts:51`). Provision via ExternalSecret or `kubectl create secret generic`. The two ends MUST match byte-for-byte; signing/verification will fail otherwise.

## Verification (after retrofitting all 5 workflows)

Re-run Phase 28 CICD-13 retroactive smoke. Expected post-retrofit deltas:

| Check | Pre-SEED-006 | Post-SEED-006 |
|-------|--------------|---------------|
| 23.A `Research this company` | n8n-PENDING (Error: unavailable) | PASS — row populates within ~60 polls |
| 23.B `Regenerate cover letter` | n8n-PENDING | PASS — `cover_letters.generated_at` advances |
| 23.C HMAC headers verified end-to-end | client-PASS, n8n: PENDING | PASS — n8n verifies sig + rejects forgeries |
| 24.A `Regenerate tailored resume` | n8n-PENDING | PASS — `tailored_resumes.generated_at` advances |
| 24.B `Regenerate salary intelligence` | N/A (0 live rows) | N/A until n8n task #11 lands — separate dependency |
| 24.C Silent-success warning copy | N/A | PASS via dedup path (idempotent re-trigger ≤ 5 min returns success no-op; UI polling sees no row advance; silent-success copy renders) |

The SAFETY chain becomes FULLY VERIFIED end-to-end (sign-side + verify-side both implemented + tested in production) when this lands.

## Closure

When all 5 workflows have HMAC verify wired AND Phase 28 CICD-13 re-run shows PASS on 23.A/23.B/23.C/24.A:

1. Update `.planning/seeds/SEED-006-n8n-hardening-followup.md` frontmatter `status: dormant` → `status: closed`
2. Add `closed: 2026-MM-DD`, `closed_by: <commit-SHA>`, `closed_outcome: "..."` lines
3. Commit: `docs(seed-006): n8n HMAC verify CLOSED — 5/5 workflows retrofitted; CICD-13 chain fully verified`

## Companion artifacts

- `/home/dev-server/homelab/apps/cloud/n8n-workflows/current/SEED-006_Regenerate_Tailored_Resume.json` — NEW workflow #4 (created with HMAC verify built in)
- `/home/dev-server/homelab/apps/cloud/n8n-workflows/current/SEED-006_Regenerate_Salary_Intelligence.json` — NEW workflow #5 (created with HMAC verify built in)
- `/home/dev-server/hudsonfam/src/lib/webhooks.ts:46-95` — sign-side reference implementation (this verify mirrors lines 64-67 byte-for-byte)
- `/home/dev-server/hudsonfam/.planning/phases/23-owner-triggered-workflows-pattern-setter/23-SUMMARY.md` §"Awaiting Upstream" — original v3.0 SEED-006 antecedent
