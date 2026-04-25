---
id: SEED-006
status: dormant
planted: 2026-04-25
planted_during: Phase 28 CICD-13 retroactive smoke (v3.5-P4)
trigger_when: owner decides to close the n8n-side safety chain (homelab-repo PR), OR a future regenerate UX refresh creates pressure to validate the full client→n8n round-trip, OR the v3.5.1 / v4.0 milestone scopes "complete the AI artifact regenerate path"
scope: Small-to-Medium (homelab-repo PR; ~2-4 hours; touches 3-5 n8n workflows + adds 2 new workflows)
---

# SEED-006: n8n-side hardening followup (HMAC verify + regenerate endpoints)

## Why This Matters

Phase 28 CICD-13 retroactive smoke (2026-04-25) surfaced 2 categories of n8n-side gaps that hudsonfam's client-side hardening (Phase 23/24) cannot close on its own. Both were explicitly flagged at v3.0 ship time as "Awaiting Upstream homelab-repo PR" deferrals; that PR was never made. Phase 28's retroactive UAT confirms the gaps are still open — same as v3.0 ship state, no new regression, but the SAFETY chain is HALF-VERIFIED.

### Gap 1: n8n does not verify `X-Hudsonfam-Signature` (AI-SAFETY-02 client-side ✓; full chain ✗)

hudsonfam ships HMAC-SHA256 webhook signing on every owner-triggered POST per Phase 23 Plan 23-01 (`sendSignedWebhook` at `src/lib/webhooks.ts:67-76`). Headers verified client-side via source inspection in CICD-13 Check 23.C: `X-Hudsonfam-Signature: sha256=...`, `X-Hudsonfam-Timestamp: <unix epoch>`, `X-Idempotency-Key: <UUID v4>` are all wired and tested (Plan 23-01 + 23-04 + G-7 sentinel).

n8n-side homelab-repo PR (per Phase 23 SUMMARY §Awaiting Upstream) was never made — n8n accepts requests without verification. Current SAFETY chain state:

- **Sign side (hudsonfam):** ✓ complete + tested
- **Verify side (n8n):** ✗ not implemented
- **Net:** webhooks COULD theoretically be replayed/forged with knowledge of the endpoint URL by anyone who can route to `n8n.cloud.svc.cluster.local`. In practice the n8n hostname is cluster-internal-only (no external ingress), so the practical risk is "compromised cluster pod" not "internet-facing replay" — same threat profile as v3.0 ship state.

**Fix scope:** add HMAC reconstruction Code node at top of each n8n workflow that hudsonfam fires. Canonical Code-node template documented in `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-SUMMARY.md` §Awaiting Upstream (verbatim ~10-line snippet). 5 workflows to update:

- `job-feedback-sync` (invoked from `updateJobStatus` reject + `undismissJob`)
- `job-company-intel` (invoked from `updateJobStatus` interested-status auto-trigger + `triggerCompanyResearch`)
- `regenerate-cover-letter` (Phase 23)
- `regenerate-tailored-resume` (Phase 24; **may not exist yet** — see Gap 2)
- `regenerate-salary-intelligence` (Phase 24; **may not exist yet** — see Gap 2)

### Gap 2: regenerate endpoints may not exist or are non-mutating (AI-ACTION-05/06)

Phase 24 added 2 new Server Actions + their corresponding webhook paths:
- `regenerateTailoredResume` POSTs to path `regenerate-tailored-resume`
- `regenerateSalaryIntelligence` POSTs to path `regenerate-salary-intelligence`

CICD-13 Check 24.A fired `regenerateTailoredResume` against JWX (jobId 2593, populated cover_letter + tailored_resume): the Server Action returned `{ ok: false, sentinel: "unavailable" }`, surfaced verbatim as `Error: unavailable` in the UI. This is the canonical signal that the n8n endpoint either does not exist or is not responding 2xx. The hudsonfam-side state machine handled the sentinel cleanly per Plan 24-01 G-3 contract.

CICD-13 Check 24.B (`regenerateSalaryIntelligence`) was N/A because the entire production database has 0 `salary_intelligence` rows (Phase 22 §Awaiting Upstream WHERE FALSE skeleton remains until n8n task #11 lands). The button is structurally not mounted on any sheet today.

**Fix scope (homelab-repo n8n manifests):**
- Verify n8n workflow `Job Search: Regenerate Tailored Resume` exists. If not, create it as a clone of the `Job Search: Regenerate Cover Letter` workflow (Phase 23). Swap payload consumption to write `tailored_resumes.generated_at` + `tailored_resumes.content` (markdown) when the LLM-tailored resume completes.
- Same for `Job Search: Regenerate Salary Intelligence` — clone, swap to `salary_intelligence` table write. **NOTE per Phase 24 D-04:** `salary_intelligence.search_date` is date-granular YYYY-MM-DD, so same-day regenerate ALWAYS triggers silent-success (correct per design). Adding a `generated_at` timestamp column to the `salary_intelligence` table is a separate v3.2+ change (Phase 24 SUMMARY §Known Rough Edge D-04 documents the future fix as a 1-line predicate edit in `salaryIntelligenceIsDone`).

Both new workflows must include the HMAC verification Code node from Gap 1.

### Gap 3: n8n task #11 (referenced in Phase 22) — INDIRECT DEPENDENCY

Phase 22's `salary_intelligence` populated branch is defensive-only today (LEFT JOIN LATERAL with `WHERE FALSE` predicate per Plan 22-02). When n8n task #11 (batch-INSERT `$N` parameter-collision bug fix in workflow `Job Search: Salary Intelligence`) lands, the predicate tightens to a real match condition (candidates documented in `22-SUMMARY.md` §Awaiting Upstream).

This isn't strictly blocked by SEED-006 — it's a separate n8n workflow (the *salary intelligence* gather workflow, not the *regenerate-salary-intelligence* webhook). Listed here for completeness because closing the regenerate-salary-intelligence happy path practically requires real `salary_intelligence` rows existing, which requires task #11.

## What Surfaced This (CICD-13 results)

Phase 28 Task 28-01-04 retroactive UAT executed 2026-04-25 against `ghcr.io/hudsor01/hudsonfam:20260425072351`. Per-check vocabulary per CONTEXT D-08:

| Check | Feature | REQ | Result |
|-------|---------|-----|--------|
| 22.A | SalaryIntelligenceSection null branch renders cleanly | AI-RENDER-03 | PASS |
| 22.B | Provenance tags on every $ figure | AI-RENDER-07 | PASS |
| 23.A | "Research this company" trigger → polling → row populated | AI-ACTION-03 | n8n-PENDING (Error: unavailable sentinel) |
| 23.B | "Regenerate cover letter" → polling → timestamp advance | AI-ACTION-04 | n8n-PENDING (Error: unavailable sentinel) |
| 23.C | HMAC + timestamp + idempotency headers on POST | AI-SAFETY-02/03 | client-PASS (source `webhooks.ts:67-76`); n8n-side: PENDING |
| 24.A | "Regenerate tailored resume" state machine | AI-ACTION-05 | n8n-PENDING (Error: unavailable sentinel) |
| 24.B | "Regenerate salary intelligence" state machine | AI-ACTION-06 | N/A (0 live `salary_intelligence` rows; button not rendered) |
| 24.C | Silent-success warning verbatim copy | AI-ACTION-07 | N/A (silent-success path requires n8n 200-without-advance; sentinel path fires first) |

CICD-13 client-side conclusion: **5/5 hudsonfam-side checks PASS** (22.A, 22.B render correctly; 23.A/23.B/24.A all dispatched the Server Action successfully and rendered the documented sentinel cascade verbatim per the contract; 23.C HMAC headers verified at source level). The remaining 4 checks (23.A/23.B/24.A action-completion, 24.B regenerate-SI, 24.C silent-success) require n8n-side movement.

## Out of Scope for This Seed

- Any hudsonfam app changes — this is a homelab-repo (n8n workflows) PR
- HMAC verification on Phase 21's PDF Application Packager workflow — that's idempotent + unsigned by design (D-12 from Phase 21)
- v3.5 milestone close — Phase 28 closes v3.5 with these gaps documented as inherited from v3.0 (no new regression introduced by the v3.5 CI/CD migration)
- Adding `generated_at` column to `salary_intelligence` table — that's a separate v3.2+ schema change tracked in Phase 24 SUMMARY §Known Rough Edge D-04

## Companion artifacts

- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-SUMMARY.md` §Awaiting Upstream — original v3.0 documentation of Gap 1 + canonical HMAC verification Code-node template
- `.planning/phases/24-regenerate-expansion-resume-salary-silent-success-state/24-SUMMARY.md` §Awaiting Upstream — original v3.0 documentation of Gap 2
- `.planning/phases/22-salary-intelligence-defensive-render/22-SUMMARY.md` §Awaiting Upstream — Gap 3 (indirect; n8n task #11)
- `src/lib/webhooks.ts:67-76` — canonical hudsonfam-side HMAC + headers wiring (line 67 createHmac; lines 74-76 the 3 headers)
- `homelab` repo (`dev-projects/homelab` on Forgejo SSH `192.168.4.236:30022`) — fix target

## Trigger handoff

When the owner decides to plant this seed:

1. Open the `homelab` repo (n8n workflow definitions live in their respective manifest paths — exact paths to be discovered at planting time; check `clusters/homelab/n8n/` or wherever the n8n workflows are mounted)
2. Add HMAC verify Code node + idempotency dedup to the 3 existing workflows (`job-feedback-sync`, `job-company-intel`, `regenerate-cover-letter`)
3. Create the 2 new regenerate workflows (`regenerate-tailored-resume`, `regenerate-salary-intelligence`) cloning the `regenerate-cover-letter` template
4. Apply via Flux Kustomization reconcile
5. Re-run Phase 28 CICD-13 checks against the same JWX/Claritev/Experian sheet to confirm:
   - 23.A: row appears within ~60 polls (n8n-PASS) instead of `Error: unavailable` (n8n-PENDING)
   - 23.B: cover_letters.generated_at advances + sheet re-renders
   - 24.A: tailored_resumes.generated_at advances + sheet re-renders
   - 24.B (gated on n8n task #11 + a populated `salary_intelligence` row): salary_intelligence.search_date advances
6. Close this seed with a commit `docs(seed-006): n8n hardening followup CLOSED` and a brief retrospective note in this file's body

Estimated total effort: ~2-4 hours (3 existing workflows × ~15 min HMAC retrofit + 2 new workflows × ~30 min creation + ~30 min UAT verification). The SAFETY chain becomes fully verified end-to-end when this lands.
