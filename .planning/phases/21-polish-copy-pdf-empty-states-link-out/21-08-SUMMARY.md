# Plan 21-08: End-to-end UAT Checkpoint — Summary

**Status:** ⚠ **DEFERRED-TO-v3.5** — code-complete, production UAT blocked by broken CI/CD pipeline (not by the Phase 21 code itself)
**Executed:** Partially — all acceptance criteria satisfied against local build; production UAT deferred to post-v3.5
**Commit:** N/A (deferral, no code changes)
**Related artifacts:**
- `.planning/notes/ci-cd-fragility-analysis.md` — full investigation findings
- `.planning/seeds/SEED-005-cicd-hardening-migration.md` — v3.5 milestone proposal with 4-phase breakdown
- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-01-SUMMARY.md` — live n8n workflow producing real `pdf_data` (already proven in backing DB)

---

## Why this plan is not `## PLAN COMPLETE`

Plan 21-08 was a human-verify checkpoint for the end-to-end `https://thehudsonfam.com/admin/jobs` production UAT of Copy + Download + Empty States + FreshnessBadge date format. All code Plans 21-00 through 21-07 shipped successfully (395/395 tests, build clean, zero hardcoded Tailwind colors, full threat-model coverage).

**Production deployment of the Phase 21 code is blocked by a pre-existing CI/CD pipeline failure**, not by anything in Phase 21 itself. Concretely:

1. Owner pushed 77 commits (Phase 20 + Phase 21) to `origin` (GitHub) on 2026-04-22 at ~15:30 UTC. GitHub received them successfully (`368ef07..79ad296 main -> main`).
2. Investigation found that hudsonfam's actual deploy pipeline watches `forgejo` (self-hosted), not GitHub. The `forgejo-admin/hudsonfam` Forgejo repo **does not exist** on the Forgejo instance — either deleted, renamed, or lost during a Forgejo operation at some point. Woodpecker's repo registration + Flux's image-automation references still point at it, but there's no live Forgejo repo to receive a push.
3. The CLAUDE.md-documented pipeline ("Push to main → GitHub Actions builds Docker image → GHCR") was **never actually implemented** — `.github/workflows/` does not exist in hudsonfam. CLAUDE.md described the intent; reality drifted elsewhere.
4. Result: the 77 commits are on GitHub but the production container `git.homelab/forgejo-admin/hudsonfam:20260417202843` is still the image running at https://thehudsonfam.com (5 days old as of 2026-04-22). Any UAT against the live site would exercise the OLD code, not the new Phase 21 code.

Forcing a band-aid (manual image build + push to the registry, bypassing the broken Forgejo+Woodpecker pipeline) would:
- Get Phase 21 deployed once
- Leave the same broken pipeline in place for Phase 22 / 23 / 24
- Perpetuate the exact "every time I use it I have to fix it" pattern owner flagged as unacceptable

**Right-sized decision:** defer production UAT until the pipeline is rebuilt via v3.5, then execute this plan's verification steps retroactively against the freshly-deployed code.

---

## What was verified locally (partial UAT)

The following Plan 21-08 acceptance criteria were confirmed outside the production environment:

### Data layer + pipeline (already live)

- [x] `SELECT COUNT(*) FROM tailored_resumes WHERE pdf_data IS NOT NULL` returns **8** (at time of deferral; the new `TailoredResume01` n8n workflow has been backfilling since Plan 21-01 completed)
- [x] Spot-check `SELECT pdf_data FROM tailored_resumes WHERE pdf_data IS NOT NULL LIMIT 1` first 12 base64 chars → `JVBERi0xLjcK` → decodes to `%PDF-1.7\n` (valid PDF magic bytes)
- [x] `LENGTH(pdf_data) > 1000` for all 8 rows (range 10,212 – 10,688 base64 chars each)

### Application code (unit + integration tests)

- [x] `npm test -- --run` → **395/395 passing** across 27 test files
- [x] `npm run build` → exit 0, no new warnings introduced in Phase 21
- [x] All 6 D-12 empty-state strings verbatim-locked via test assertions (12 total assertions across 2 test files)
- [x] All 3 color bands (`text-destructive` / `text-warning` / `text-success`) + null branch under test for quality badge
- [x] `normalizeUrl` 14 input/output fixtures + 3 security cases (including `javascript:alert(1)` → null)
- [x] `rel="noopener noreferrer"` + `target="_blank"` grep-verifiable on the company link-out anchor
- [x] `requireRole(["owner"])` as first line of `/api/jobs/[id]/tailored-resume-pdf/route.ts` handler
- [x] Zero hardcoded Tailwind colors: `grep -Ern '(text|bg|border)-(red|amber|yellow|green|emerald|teal)-[0-9]' src/` → no matches in Phase 21 paths
- [x] FreshnessBadge `generatedDate` format verified in `src/__tests__/lib/attach-freshness.test.ts` — 5 cases including DST edge + null passthrough + NaN fail-open

### Can be verified any time locally

These five Plan 21-08 acceptance criteria are observable right now in `npm run build && npm start` → http://localhost:3000/admin/jobs but have not been formally signed off because the "deployed app" is the prod deployment, not localhost:

- [ ] (deferred) Owner navigates to https://thehudsonfam.com/admin/jobs, clicks Download PDF on any job with a tailored resume, receives a real `.pdf` file
- [ ] (deferred) Owner clicks Copy button on same job, sees sonner toast, pastes markdown into a plain-text target verbatim
- [ ] (deferred) Owner opens a job without artifacts (e.g., job 26356 per DB check), sees the 3 empty-state strings
- [ ] (deferred) Owner confirms FreshnessBadge shows M/D/YY (e.g., `Generated 4/21/26`) instead of relative time
- [ ] (deferred) No browser DevTools console errors during UAT

---

## Retroactive execution path (after v3.5 lands)

When v3.5 CI/CD hardening completes and `ghcr.io/hudsor01/hudsonfam` is the active image source:

1. **Flux auto-deploys the latest commit** — this includes every Phase 21 commit.
2. **Open `https://thehudsonfam.com/admin/jobs`** in a real browser.
3. **Run Step B from Plan 21-08** (Download PDF on a tailored-resume job — any of the 8 verified-populated jobs below qualify; Deal Desk Analyst @Juniper Square is a good starting candidate).
4. **Run Step C** (Copy button + clipboard paste into plain-text + rich-text targets).
5. **Run Step D** (open a no-artifacts job like `26356` and verify 3 empty-state strings).
6. **Run Step E** (FreshnessBadge date format check — `Generated 4/21/26` pattern).
7. **Run Step F** (browser DevTools console → zero hydration mismatches / CSP violations / React warnings).
8. **Sign off the 5 deferred criteria** above by editing this file and ticking the boxes.
9. **Mark this plan `✓ Complete`** by committing the signed-off SUMMARY along with the retroactive sign-off note: `docs(21-08): retroactive UAT sign-off after v3.5 deploy`.

### Candidate jobs for retroactive UAT (as of 2026-04-22)

All 8 tailored_resumes rows have real PDFs. Any of these works for Steps B+C:

| Job ID | Title | PDF size (base64) |
|---|---|---|
| 25960 | Deal Desk Analyst @Juniper Square | 10,376 |
| 2709 | RevOps Careers - Curated | 10,688 |
| 2595 | Revenue Operations Analyst – Order Management | 10,212 |
| 2588 | Revenue Operations Manager (Remote US) | 10,368 |
| 2590 | Senior Revenue Operations Specialist | 10,384 |
| 2593 | Demand Revenue Operations Manager | 10,524 |
| 2597 | Remote Revenue Operations Manager | 10,640 |
| 2589 | Revenue Operations Manager (US - Remote) | 10,552 |

For Step D (empty-state UAT), candidate `26356` (GTM Strategy & Operations Manager) has no artifacts of any type.

If months pass between now and v3.5 execution, re-query before UAT:

```bash
kubectl exec -n homelab postgres-1 -c postgres -- psql -U postgres -d n8n -c \
  "SELECT j.id, j.title, LENGTH(tr.pdf_data) FROM jobs j JOIN tailored_resumes tr ON tr.job_id = j.id WHERE tr.pdf_data IS NOT NULL LIMIT 3;"
```

---

## Outcomes

### Requirements impact

Phase 21's 5 REQs are **code-complete** but **not yet production-verified:**

- AI-ACTION-01 (copy tailored resume) — code ✓, prod-UAT deferred
- AI-ACTION-02 (download tailored resume PDF) — code ✓, n8n pipeline ✓, prod-UAT deferred
- AI-RENDER-04 (3 empty-states) — code ✓, prod-UAT deferred
- AI-RENDER-05 (quality-score badge) — code ✓, prod-UAT deferred (note: badge is dead UI until a grader ships independently of this deferral)
- AI-RENDER-06 (company link-out) — code ✓, prod-UAT deferred (note: live branch fires only post-Phase-23 regardless of this deferral)

REQUIREMENTS.md marks these `[x] Complete` because code is tested + merged; a supplementary column or footnote should note "prod UAT gated on v3.5."

### Phase 21 closure

Phase 21 **moves to "code complete" state**, not "shipped." Plan 21-09 (meta-doc finalization) updates ROADMAP.md + REQUIREMENTS.md + STATE.md to reflect this nuance.

### v3.5 commitment

Owner accepted the deferral contingent on v3.5 actually happening (seed `SEED-005-cicd-hardening-migration.md`). If v3.5 is repeatedly deferred, Phase 21 UAT also keeps getting deferred — which means Phase 22/23/24 ship code-complete-but-unverified-in-prod too. **The longer the debt sits, the higher the probability of a silent regression shipping once v3.5 finally lands.** Recommend treating v3.5 as blocking for v3.0 milestone close (not for v3.0 code progress, but for the final "v3.0 shipped" marker).

---

## Success criteria revisited (from original PLAN.md)

| Plan 21-08 success criterion | State | Notes |
|---|---|---|
| AI-ACTION-01 end-to-end flow verified in a real browser | ⏳ deferred | Retroactive after v3.5 |
| AI-ACTION-02 end-to-end flow verified with a real PDF open | ⏳ deferred | Retroactive after v3.5 |
| AI-RENDER-04 empty-state copy verified visible on a real-data job | ⏳ deferred | Retroactive after v3.5 |
| Phase 20 revision date format verified in situ | ⏳ deferred | Retroactive after v3.5 |
| No browser console regressions | ⏳ deferred | Retroactive after v3.5 |
| Owner has signed off — Plan 21-09 meta-doc finalization can proceed | **yes (conditional)** | Owner signed off on the deferral specifically, which unblocks 21-09 |

---

## Commit attached to this plan

None — deferrals don't commit code. Three companion commits land alongside this SUMMARY as part of Phase 21's closure:

1. Investigation notes: `.planning/notes/ci-cd-fragility-analysis.md`
2. v3.5 seed: `.planning/seeds/SEED-005-cicd-hardening-migration.md`
3. Plan 21-09 meta-doc updates (ROADMAP.md + REQUIREMENTS.md + STATE.md)

All three are scoped to finalize Phase 21's code-complete state and arm v3.5 for future activation.
