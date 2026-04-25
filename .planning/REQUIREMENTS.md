# Requirements: v3.5 — CI/CD Hardening

**Defined:** 2026-04-23
**Reference:** `.planning/notes/ci-cd-fragility-analysis.md`, `.planning/seeds/SEED-005-cicd-hardening-migration.md`, CLAUDE.md §Deployment
**Core Value:** Eliminate the "CI breaks every time" DX pattern. Migrate hudsonfam deploy from broken self-hosted Forgejo+Woodpecker to GitHub Actions + GHCR. Unlock retroactive production UAT for the deferred v3.0 backlog.

## v3.5 Requirements (active)

Each requirement maps to a roadmap phase and is observationally verifiable after v3.5 ships.

### Pipeline Build (v3.5-P1)

- [x] **CICD-01**: `.github/workflows/build-and-push.yml` exists and runs on push-to-main; builds the Dockerfile to a multi-arch (linux/amd64) image — Code complete 2026-04-23 (Phase 25 Plan 25-01, commit c7d8f33; workflow file shipped, first build observational verification pending owner browser check)
- [x] **CICD-02**: Built image is pushed to `ghcr.io/hudsor01/hudsonfam` tagged `YYYYMMDDHHmmss` (UTC timestamp, matches existing Flux imagepolicy pattern) AND `latest` — Code complete 2026-04-23 (Phase 25 Plan 25-01; tags emission wired in build-push-action@v5 `tags:` input per D-04; observational GHCR verification pending owner browser check)
- [x] **CICD-03**: GitHub Actions workflow completes in under 10 minutes for a clean build (cached Docker layers); logs are readable in the Actions UI — Code complete 2026-04-23 (Phase 25 Plan 25-01; `type=gha,scope=build-and-push,mode=max` cache wired per D-05; warm-cache 2-6 min target well under 10-min SC; observational timing verification on second build pending owner browser check)

### Flux Reconfiguration (v3.5-P2)

- [x] **CICD-04**: `imagerepository/hudsonfam` (in the correct Flux namespace, not `default`) watches `ghcr.io/hudsor01/hudsonfam` and reconciles successfully — Code complete 2026-04-24 (Phase 26 Plan 26-02; ImageRepository in `flux-system` ns shows Ready=True, scanned 46 GHCR tags; homelab commit `7f3302c`; pod live on ghcr.io image)
- [x] **CICD-05**: GHCR pull secret is provisioned via the ExternalSecret + ClusterSecretStore pattern (same pattern as other homelab services); no PAT committed to git — Code complete 2026-04-24 (Phase 26 Plan 26-01; both `ghcr-pull-credentials` Secrets materialized as `kubernetes.io/dockerconfigjson` in homepage + flux-system ns; T-26-01 PAT-leakage gate ZERO matches across homelab repo; homelab commits `91d9cd9` + `943c2c4` ESO CRD deviation hotfix)
- [x] **CICD-06**: `imagepolicy/hudsonfam` filters the `YYYYMMDDHHmmss` tag stream and picks the newest timestamp; `imageupdateautomation` updates the Deployment manifest in `homelab` manifests repo on new images — Code complete 2026-04-24 (Phase 26 Plan 26-02; ImagePolicy `latestRef = ghcr.io/hudsor01/hudsonfam:20260424023904`; setter comments preserved byte-for-byte; IUA commit on GHCR path is OBSERVATIONAL-PENDING until next Phase 25 build produces a newer tag — does NOT block code-complete declaration)

### Decommission Old Pipeline (v3.5-P3)

- [x] **CICD-07**: Broken `default/imagerepository/hudsonfam` is deleted (the one that references the missing `forgejo-registry-creds` secret); `kubectl get imagerepository -A | grep hudsonfam` shows only the new entry — Code complete 2026-04-25 (Phase 27 Plan 27-01 Task 27-01-03; Check 1 of verification suite returned `1` for the count, only flux-system/hudsonfam GHCR watcher remains)
- [x] **CICD-08**: `.woodpecker.yaml` at the repo root is deleted; Woodpecker repo deregistration for `forgejo-admin/hudsonfam` confirmed via Woodpecker UI/API — Code complete 2026-04-25 (Phase 27 Plan 27-01 Tasks 27-01-01 + 27-01-02; commit `0eaacc6` pushed to GitHub main; Woodpecker REST DELETE on `/api/repos/2` returned HTTP 200; Check 4 verification returns HTTP 401 from `ci.thehudsonfam.com/api/repos/lookup/forgejo-admin/hudsonfam` confirming repo gone)
- [x] **CICD-09**: Orphaned `git.homelab/forgejo-admin/hudsonfam` container registry entries are cleaned up OR documented as intentionally kept (with reason) — no dangling refs remain in Flux or Forgejo — Code complete 2026-04-25 (Phase 27 Plan 27-01 Tasks 27-01-04 + 27-01-05; chose DELETE over retention per CONTEXT D-05; both `forgejo-registry-creds` Secrets deleted from flux-system + homepage namespaces; all 6 Forgejo container versions returned HTTP 204 on per-version DELETE — 4 timestamp tags + 2 sha256 manifest digests; verification Check 5 returns empty for hudsonfam packages)

### End-to-End Smoke + Retroactive UAT (v3.5-P4)

- [x] **CICD-10**: A no-op commit to `main` triggers the full pipeline end-to-end (GitHub Actions build → GHCR push → Flux detects new tag → Flux updates manifest → K3s rolls the deployment → `https://thehudsonfam.com` serves the new image); entire cycle completes in under 15 minutes — Code complete 2026-04-25 (Phase 28 / Plan 28-01 Task 28-01-01: empty commit `e1ec19a` traveled end-to-end in 11m13s; pod rolled to `ghcr.io/hudsor01/hudsonfam:20260425042539`)
- [x] **CICD-11**: CLAUDE.md §Deployment section is rewritten to reflect the live pipeline (GitHub Actions + GHCR + Flux) — documented commands + ExternalSecret reference + troubleshooting notes; matches reality — Code complete 2026-04-25 (Phase 28 / Plan 28-01 Task 28-01-02: commit `dda3af3`; 6/6 D-04 live-revalidation items PASS)
- [x] **CICD-12**: Plan 21-08 retroactive UAT executes successfully against the deployed Phase 21 code (empty-state copy, link-out external-link icon, quality badge render-paths); all 5 Phase 21 features confirmed live — Code complete 2026-04-25 (Phase 28 / Plan 28-01 Task 28-01-03: 5/5 PASS, Plan 21-08 SUMMARY status flipped DEFERRED→COMPLETE; commit `f1be1d0`; 2 trivial inline fixes per CONTEXT D-09 — Radix a11y `12ce076` + metadata duplicate-suffix `91a1705`)
- [x] **CICD-13**: Retroactive UAT smoke-tests each deferred v3.0 phase's prod verification: Phase 22 salary intelligence defensive render (renders null branch cleanly; schema-drift guard holds); Phase 23 owner-triggered workflows (HMAC sign → n8n accepts signed calls; sentinel errors on failure); Phase 24 regenerate expansion (all 3 regenerate buttons produce polling state transitions end-to-end) — Code complete 2026-04-25 (Phase 28 / Plan 28-01 Task 28-01-04: 8 checks = 2 PASS + 4 OBSERVATIONAL-PENDING-N8N + 2 N/A → 100% hudsonfam-side green; per-phase SUMMARY commits `33d9781`/`fbea63e`/`bae9a00`; n8n-side gaps inherited from v3.0 ship state, seeded as SEED-006-n8n-hardening-followup.md per D-09)

## Future Requirements

Deferred past v3.5 (not planned for current milestone).

- **CICD-FUTURE-01**: Preview environments for PRs (GitHub Actions builds PR images; Flux namespace-per-PR) — complexity exceeds owner-visible benefit for solo-user app
- **CICD-FUTURE-02**: Automated rollback on health-check failure (Flux HelmRelease rollback policies) — Phase 21 precedent (`disableWait: true`) handles the current-state HPA/DS rollout hang; reconsider if rollback becomes a recurring need
- **CICD-FUTURE-03**: Per-commit-SHA image tags alongside timestamp tags — useful for bisecting but overkill for single-developer app

## Out of Scope

Explicitly excluded — do not add to v3.5 scope.

| Feature | Reason |
|---------|--------|
| Migration of homelab-manifests-repo deploy path | Separate concern; homelab manifests repo is Forgejo-hosted by design for self-hosting |
| Retention of any Forgejo+Woodpecker hudsonfam-specific config | Full decommission, not coexistence; owner decision 2026-04-22 |
| New feature work in hudsonfam | v3.5 is infra-only; all feature backlog lives in v3.0 (code-complete, deferred UAT) or v3.1 (planned post-shipping) |
| Multi-arch builds (arm64) | Cluster is all-amd64; adding arm would slow builds with no runtime benefit |
| GitHub Actions matrix for node/next.js versions | Single target version per commit; matrix adds CI minutes without catching real bugs |
| Automated dependency updates (Renovate, Dependabot) | Future concern; requires CI pipeline stability first (Catch-22 — v3.5 IS that stability) |
| Separate staging environment | Owner reviews main directly; staging adds complexity without separation-of-concerns benefit at this scale |
| External monitoring / alerting for CI failures | GitHub's default email notifications + Flux's reconciliation state are sufficient for solo-user app |

## Traceability (v3.5)

Mapped to roadmap phases 2026-04-23 by owner-authored plan.

| REQ-ID | Phase | Status |
|--------|-------|--------|
| CICD-01 | Phase 25 (v3.5-P1) / Plan 25-01 | Code complete (2026-04-23, build green 2026-04-24 c099b66 after lockfile hotfix; tag 20260424023904 verified) |
| CICD-02 | Phase 25 (v3.5-P1) / Plan 25-01 | Code complete (2026-04-23, build green 2026-04-24; both tags `20260424023904` + `latest` verified at GHCR) |
| CICD-03 | Phase 25 (v3.5-P1) / Plan 25-01 | Code complete (2026-04-23, build c099b66 completed inside 10-min target; future builds will reuse warm cache) |
| CICD-04 | Phase 26 (v3.5-P2) / Plan 26-02 | Code complete (2026-04-24) — ImageRepository hudsonfam in flux-system ns Ready=True scanning ghcr.io/hudsor01/hudsonfam (46 tags) |
| CICD-05 | Phase 26 (v3.5-P2) / Plan 26-01 | Code complete (2026-04-24) — both `ghcr-pull-credentials` Secrets materialized as `kubernetes.io/dockerconfigjson`; T-26-01 PAT-leakage gate ZERO matches across homelab repo |
| CICD-06 | Phase 26 (v3.5-P2) / Plan 26-02 | Code complete (2026-04-24) — ImagePolicy `latestRef = ghcr.io/hudsor01/hudsonfam:20260424023904`; setter comments preserved; IUA commit on GHCR path is OBSERVATIONAL-PENDING until next Phase 25 build produces a newer tag |
| CICD-07 | Phase 27 (v3.5-P3) / Plan 27-01 | Code complete (2026-04-25) — broken default IR deleted; only flux-system/hudsonfam GHCR watcher remains |
| CICD-08 | Phase 27 (v3.5-P3) / Plan 27-01 | Code complete (2026-04-25) — `.woodpecker.yaml` deleted (commit `0eaacc6` to GitHub main); Woodpecker repo dereg via REST DELETE HTTP 200 (host corrected from `woodpecker.homelab` → `ci.thehudsonfam.com` at runtime) |
| CICD-09 | Phase 27 (v3.5-P3) / Plan 27-01 | Code complete (2026-04-25) — both `forgejo-registry-creds` Secrets deleted; 6/6 Forgejo container versions HTTP 204; chose DELETE over retention per CONTEXT D-05 |
| CICD-10 | Phase 28 (v3.5-P4) / Plan 28-01 | Code complete (2026-04-25) — empty smoke commit `e1ec19a` traveled GitHub→GHCR→Flux→K3s in 11m13s vs 15-min budget; pod on `ghcr.io/hudsor01/hudsonfam:20260425042539` |
| CICD-11 | Phase 28 (v3.5-P4) / Plan 28-01 | Code complete (2026-04-25) — CLAUDE.md §Deployment rewrite commit `dda3af3` (lines 141-163 → ~50 lines new); 6/6 D-04 live-revalidation items PASS |
| CICD-12 | Phase 28 (v3.5-P4) / Plan 28-01 | Code complete (2026-04-25) — Plan 21-08 5/5 retroactive UAT signed off (commit `f1be1d0`); status DEFERRED→COMPLETE; 2 trivial inline fixes per D-09 (Radix a11y `12ce076` + metadata duplicate-suffix `91a1705`) |
| CICD-13 | Phase 28 (v3.5-P4) / Plan 28-01 | Code complete (2026-04-25) — Phase 22/23/24 8-check retroactive smoke = 2 PASS + 4 OBSERVATIONAL-PENDING-N8N + 2 N/A; 100% hudsonfam-side green; n8n-side gaps documented as SEED-006-n8n-hardening-followup.md per D-09 (inherited v3.0 ship state, no new regression) |

**Coverage:**
- v3.5 requirements: 13 total
- Mapped to phases: 13 ✅
- Unmapped: 0

**Per-phase counts:**
- Phase 25 (v3.5-P1 Pipeline Build): 3 REQs — CICD-01, CICD-02, CICD-03
- Phase 26 (v3.5-P2 Flux Reconfig): 3 REQs — CICD-04, CICD-05, CICD-06
- Phase 27 (v3.5-P3 Decommission): 3 REQs — CICD-07, CICD-08, CICD-09
- Phase 28 (v3.5-P4 Smoke + Retroactive UAT): 4 REQs — CICD-10, CICD-11, CICD-12, CICD-13

---

## Validated (v3.0 — AI Integration, shipped code-complete 2026-04-23)

### v3.0 Requirements — all complete (prod UAT deferred to v3.5-P4 via CICD-12 + CICD-13)

**AI Artifact Rendering:**
- [x] **AI-RENDER-01**: Tailored resume content rendered as formatted markdown — Phase 20 (20-01, 20-05, 20-06)
- [x] **AI-RENDER-02**: `generated_at` + `model_used` on every AI artifact section — Phase 20 (20-04, 20-06)
- [x] **AI-RENDER-03**: Salary intelligence section (prose + structured headline figures) — Phase 22 (22-06, 22-07)
- [x] **AI-RENDER-04**: Distinct empty-state messaging for each AI artifact section — Phase 21 (21-06)
- [x] **AI-RENDER-05**: Quality-score badge on cover letters — Phase 21 (21-05)
- [x] **AI-RENDER-06**: Company-website link-out with external-link icon — Phase 21 (21-07)
- [x] **AI-RENDER-07**: Provenance tags on every salary figure — Phase 22 (22-05 primitive, 22-07 call-site adjacency)

**Owner-Triggered Actions:**
- [x] **AI-ACTION-01**: Copy tailored resume to clipboard — Phase 21 (21-04)
- [x] **AI-ACTION-02**: Download tailored resume as PDF — Phase 21 (21-01..21-04 pipeline + schema + server + UI)
- [x] **AI-ACTION-03**: Trigger "Research this company" — Phase 23 (23-02 Server Action + 23-05 button + 23-07 mount)
- [x] **AI-ACTION-04**: Regenerate cover letter — Phase 23 (23-02 Server Action + 23-06 button + 23-07 mount)
- [x] **AI-ACTION-05**: Regenerate tailored resume — Phase 24 (24-01 generalized button + 24-02 Server Action + 24-03 mount)
- [x] **AI-ACTION-06**: Regenerate salary intelligence — Phase 24 (24-01 date-granular predicate + 24-02 Server Action + 24-03 mount; same-day regenerate triggers silent-success by D-04 design)
- [x] **AI-ACTION-07**: Silent-success warning state — Phase 24 (24-01 4th state variant + G-8 verbatim-copy grep gate)

**Safety & Hardening:**
- [x] **AI-SAFETY-01**: Markdown XSS prevented (no script execution) — Phase 20 (20-05)
- [x] **AI-SAFETY-02**: HMAC-SHA256 webhook signing — Phase 23 (23-01 `sendSignedWebhook` primitive)
- [x] **AI-SAFETY-03**: `X-Idempotency-Key` header on every call — Phase 23 (23-01 primitive + callers)
- [x] **AI-SAFETY-04**: 4-sentinel bounded error union, no raw `e.message` — Phase 23 (23-01 `ErrorSentinel` + D-08 no-raw-leak)
- [x] **AI-SAFETY-05**: CSP header blocks inline scripts / object embeds / framing — Phase 20 (20-07)
- [x] **AI-SAFETY-06**: Zod `safeParse` on every LLM artifact row read — Phase 20 (20-03)

**Data Layer:**
- [x] **AI-DATA-01**: `getJobDetail()` LEFT JOIN LATERAL on salary_intelligence — Phase 22 (22-02; `WHERE FALSE` skeleton pending n8n task #11)
- [x] **AI-DATA-02**: `SalaryIntelligence` TS type + Zod schema + nullable currency cascade — Phase 22 (22-01, 22-02, 22-03)
- [x] **AI-DATA-03**: `isStale(timestamp, thresholdDays)` pure util in `job-freshness.ts` — Phase 20 (20-02)
- [x] **AI-DATA-04**: Schema-drift guard — Vitest asserts every referenced column exists in live `n8n` DB — Phase 20 (20-08)

**Total v3.0:** 24 requirements, all code-complete. Prod UAT deferred to v3.5-P4 (CICD-12 + CICD-13 executes retroactive smoke tests).

### v3.1 (deferred past v3.5 — inline editing)

- **EDIT-01**: Inline-edit tailored resume content with `edited_at` + `original_content` preservation
- **EDIT-02**: Inline-edit cover letter with same pattern as EDIT-01
- **EDIT-03**: Revert edited artifact back to `original_content`

### v3.1 (deferred past v3.5 — cross-cutting visibility)

- **DASH-01** (SEED-001): Aggregate pipeline-health view on `/admin/jobs/pipeline`

---

*Requirements defined: 2026-04-21 (v3.0), extended: 2026-04-23 (v3.5)*
*Last updated: 2026-04-23 — v3.5 milestone activated. 13 new CICD-XX requirements mapped to Phases 25-28. v3.0 section preserved as Validated history with full per-phase traceability. Active scope: migrate deploy pipeline from broken Forgejo+Woodpecker to GitHub Actions + GHCR; execute retroactive UAT for all deferred v3.0 prod verifications in v3.5-P4.*
