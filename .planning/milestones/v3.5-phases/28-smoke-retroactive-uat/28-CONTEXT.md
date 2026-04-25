# Phase 28: End-to-End Smoke + Retroactive UAT (v3.5-P4) - Context

**Gathered:** 2026-04-25 (auto mode — 12 decisions locked; final v3.5 phase; owner-driven verification)
**Status:** Ready for planning

<domain>
## Phase Boundary

Final v3.5 phase. Four objectives: (1) end-to-end smoke test of the new pipeline (no-op commit travels GitHub→GHCR→Flux→K3s in <15 min), (2) comprehensive CLAUDE.md §Deployment rewrite, (3) retroactive Plan 21-08 UAT for Phase 21 features deferred during the broken-pipeline window, (4) retroactive smoke for Phases 22/23/24 features deferred for the same reason. 4 REQs: CICD-10, CICD-11, CICD-12, CICD-13.

This phase is largely OWNER-DRIVEN — the bulk of CICD-12/13 verification requires real browser interaction with `https://thehudsonfam.com/admin/jobs`. The agent's job is to script + observe what's automatable (cluster verifications, HMAC signature checks, polling state machine traces), present the owner-driven UAT as a structured checklist, record results, and surface any production gaps as either fix tasks (in-scope) or v3.5.1 followup phases (out-of-scope).

**Pre-Phase-28 state (verified via cluster + repo reads on 2026-04-25):**

- **v3.5 milestone:** Phases 25/26/27 code-complete (3 of 4); Phase 28 closes the milestone
- **Production deployment:** pod `hudsonfam-b6b754b64-vcn5l` Running 1/1 on `ghcr.io/hudsor01/hudsonfam:20260424023904` with `ghcr-pull-credentials`. Pipeline: GitHub Actions (`build-and-push.yml`) → GHCR → Flux ImageRepository (Ready=True, scanning 46 tags) → ImagePolicy (regex `^\d{14}$`) → ImageUpdateAutomation → homelab `apps/hudsonfam/kustomization.yaml` → K3s rolling update. Phase 27 confirmed all hudsonfam-related Flux conditions are clean (no Failed/Stalled).
- **Public URL:** <https://thehudsonfam.com> via Cloudflare Tunnel — should be serving the new GHCR image right now
- **Phase 21 deferred features (CICD-12 scope, 5 items):** copy-to-clipboard on tailored resume; download-PDF on tailored resume; empty-state strings on missing AI artifacts; quality-score badge on cover letters; company-website link-out with ExternalLink icon
- **Phase 22 deferred features (CICD-13 part 1):** SalaryIntelligenceSection renders null branch cleanly without crashing (defensive LEFT JOIN LATERAL with WHERE FALSE skeleton); per-figure provenance tags on every dollar amount
- **Phase 23 deferred features (CICD-13 part 2):** "Research this company" manual trigger; "Regenerate cover letter" button (UPDATE-wait polling); HMAC-SHA256 + idempotency-keyed webhook send. **PREREQ DEPENDENCY:** n8n side must verify HMAC signatures for the test to actually exercise the safety chain — per Phase 23 SUMMARY this is a homelab-repo PR that may NOT have been done. CICD-13 surfaces this gap if found.
- **Phase 24 deferred features (CICD-13 part 3):** Regenerate tailored resume; Regenerate salary intelligence; Silent-success warning state when timestamp doesn't advance. **PREREQ DEPENDENCY:** n8n endpoints `regenerate-tailored-resume` + `regenerate-salary-intelligence` must exist; if not, owner sees the silent-success warning state which is correct UI behavior but doesn't exercise the happy path.
- **Pre-staged Phase 28 artifact:** `.planning/notes/phase-28-claude-md-deployment-rewrite-draft.md` (102 lines) — head-start CICD-11 deliverable. Phase 28 executor reviews + applies after re-validation against live state.

**What ships end-to-end this phase:**

1. **CICD-10 — no-op smoke test:** owner runs `git commit --allow-empty -m "smoke(28): v3.5-P4 end-to-end pipeline verification"` + `git push origin main`. Owner observes GitHub Actions run in browser; agent observes Flux scan + tag promotion + Deployment rollout via kubectl; total cycle measured against the 15-min CICD-10 SC.
2. **CICD-11 — CLAUDE.md §Deployment rewrite:** apply the pre-drafted text from `.planning/notes/phase-28-claude-md-deployment-rewrite-draft.md` (after re-validation against live state); commit + push. Single file edit (CLAUDE.md lines 141-163 currently → ~80 lines new content per draft).
3. **CICD-12 — Plan 21-08 retroactive UAT:** owner does 5 browser checks per Plan 21-08 §"Retroactive execution path"; agent records pass/fail; on completion, edit `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-08-SUMMARY.md` to flip the 5 deferred checkboxes + add retroactive sign-off note + commit `docs(21-08): retroactive UAT sign-off after v3.5 deploy`.
4. **CICD-13 — Phases 22/23/24 retroactive smoke:** owner does spot-checks per ROADMAP §Phase 28 SC #4; agent records pass/fail per phase; edit each phase's SUMMARY.md (`22-SUMMARY.md`, `23-SUMMARY.md`, `24-SUMMARY.md`) to add a "Production UAT executed" section with pass/fail per feature; commit each separately.
5. **Phase 28 SUMMARY:** ties together the 4 outcomes; explicit per-REQ satisfaction record + per-phase retroactive UAT outcomes + n8n-side gap inventory (if any) for v3.5.1 backlog.

**Not in this phase:**

- Owner ops cleanup from Phase 27 (`kubectl delete secret phase-27-pats`, PAT rotations) — owner-runnable, non-blocking, can happen any time
- v3.5.1 followup phase (if surfaced by CICD-12/13 retroactive UAT) — separate milestone planning
- n8n-side workflow modifications (HMAC verify on company-research/regenerate webhooks, regenerate-tailored-resume/regenerate-salary-intelligence endpoints) — homelab-repo PR concern; if missing, document as v3.5.1 candidate but DO NOT implement in Phase 28
- Any v4.0 milestone planning — v3.5 closes with Phase 28; v4.0 is separate
- Forgejo PVC backup hardening (Finding 6 of fragility-analysis) — orthogonal homelab-infra concern
- recyclarr/seerr ImageRepository TLS issues (Finding 5) — separate homelab-infra phase

</domain>

<decisions>
## Implementation Decisions

### CICD-10 — End-to-end no-op smoke test

- **D-01 [--auto]:** No-op commit method: `git commit --allow-empty -m "smoke(28): v3.5-P4 end-to-end pipeline verification"`. Rationale: empty commit avoids any code/file artifact; cleanest signal that the pipeline itself works (no Dockerfile change → cache should be 100% warm → fastest possible build to validate the chain end-to-end). Push directly to GitHub `main` (matches Phase 25/27 push cadence).

- **D-02 [--auto]:** Observation chain (cluster-side; agent runs concurrently with owner browser observation):
  1. T+0: owner pushes the empty commit; record commit SHA + UTC push timestamp
  2. T+1-3 min: GitHub Actions `build-and-push.yml` triggers (owner observes green run in browser)
  3. T+3-9 min: Flux ImageRepository next scan (interval 6h — force via `flux reconcile image repository hudsonfam -n flux-system` to skip the wait); ImagePolicy promotes new tag
  4. T+9-12 min: ImageUpdateAutomation writes new tag to homelab/apps/hudsonfam/kustomization.yaml + deployment.yaml (force via `flux reconcile image update homelab-images -n flux-system`); Flux source-controller reconciles homelab repo (force via `flux reconcile source git flux-system`)
  5. T+12-14 min: Flux Kustomization applies; K3s rolls hudsonfam Deployment (force via `flux reconcile kustomization hudsonfam`); pod restart observable
  6. T+14-15 min: pod Ready=true with new image; verify via `kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].spec.containers[0].image}'` returns `ghcr.io/hudsor01/hudsonfam:<NEW_TAG>` matching the build's emitted tag
  7. Total elapsed time recorded; CICD-10 SC requires <15 min

- **D-03 [--auto]:** Failure-mode handling for CICD-10:
  - If GitHub Actions build fails: same hotfix pattern as Plan 25-01 lockfile detour; document in Phase 28 SUMMARY as "smoke test surfaced X; fixed inline; rerun"
  - If Flux scan/promotion lags >5 min after GHCR push: force reconcile via the flux CLI (per D-02 step list); document the force-reconcile as a known operational lever in CLAUDE.md §Deployment rewrite (already in the pre-drafted text)
  - If pod doesn't roll within 14 min: investigate via `kubectl describe deployment hudsonfam -n homepage` for events; don't auto-rollback (Phase 26's GHCR pipeline IS the new baseline; rollback target is the previously-running tag, not Forgejo)

### CICD-11 — CLAUDE.md §Deployment rewrite

- **D-04 [--auto]:** Apply the pre-drafted text from `.planning/notes/phase-28-claude-md-deployment-rewrite-draft.md` (lines 13-95 of the draft = the proposed replacement text). Required pre-application step: re-validate every claim in the draft against live state at execution time:
  - PAT expiry date (currently `~2027-04-24`)
  - GHCR visibility (currently `public`)
  - NFS server IP (currently `192.168.4.164`)
  - Forgejo SSH endpoint (currently `192.168.4.236:30022`)
  - Top failure modes still relevant
  - Pre-push hook still in `scripts/install-hooks.sh`
  - `kubectl explain` references (3 examples in the draft) still produce expected output
  
  After validation, replace `CLAUDE.md` lines 141-163 with the validated draft text. Single file edit; commit `docs(28-XX): comprehensive §Deployment rewrite (CICD-11)` to GitHub `main`.

- **D-05 [--auto]:** Tone calibration: the draft is verbose vs current terse style; per CLAUDE.md memory `feedback_pr_workflow.md`, keep documentation honest and not marketing-speak. The draft's failure-modes section is the most valuable add (operational know-how that wasn't there before). Trim if owner prefers tighter prose, but the failure-modes section stays. Trim only at owner's explicit direction during Plan 28-XX execution.

- **D-06 [--auto]:** This CLAUDE.md commit happens AFTER CICD-10 smoke test passes — the §Deployment text describes the verified-working pipeline, so we want the smoke green before claiming it works in docs. Sequencing: CICD-10 first → CICD-11 second (within the same Plan or split into two — see D-09 plan structure decision).

### CICD-12 — Plan 21-08 retroactive UAT

- **D-07 [--auto]:** Owner does the 5 browser checks per Plan 21-08 SUMMARY §"Retroactive execution path" lines 67-79:
  1. Open `https://thehudsonfam.com/admin/jobs`; click Download PDF on a tailored-resume job → receive a real `.pdf` file
  2. Click Copy button on same job → see sonner toast → paste markdown into plain-text target verbatim
  3. Open a no-artifacts job (suggested: jobId `26356`) → see the 3 empty-state strings (cover letter, company research, tailored resume)
  4. Confirm FreshnessBadge shows `M/D/YY` format (e.g., `Generated 4/21/26`) instead of relative time
  5. Browser DevTools console shows zero hydration mismatches / CSP violations / React warnings during UAT

  Owner reports outcomes per check; agent edits Plan 21-08 SUMMARY.md to flip the 5 deferred checkboxes (lines 59-63) + adds a retroactive sign-off note at the bottom + commits `docs(21-08): retroactive UAT sign-off after v3.5 deploy` per Plan 21-08's own retroactive-execution-path step 9.

### CICD-13 — Phases 22/23/24 retroactive smoke

- **D-08 [--auto]:** Per-phase smoke scope (mapped from ROADMAP §Phase 28 SC #4):

  **Phase 22 retroactive smoke:**
  - SalaryIntelligenceSection renders null branch cleanly (no crash) on a job without `salary_intelligence` data — verifiable in any job's detail sheet
  - Provenance tags visible on every dollar figure (base salary, salary range, salary-intel headline) — visual check on a job with all 3 figure sources

  **Phase 23 retroactive smoke:**
  - Owner clicks "Research this company" → in-progress spinner → polling completes → Company Intel section populates with new row (visible signal of n8n round-trip success)
  - Owner clicks "Regenerate cover letter" → polling waits for `cover_letters.generated_at` to advance → sheet re-renders with fresh content + timestamp badge
  - Network inspector capture (browser DevTools): POST to n8n endpoint includes `X-Hudsonfam-Signature` HMAC-SHA256 header + `X-Hudsonfam-Timestamp` + `X-Idempotency-Key`. **n8n-side HMAC verification:** if homelab-PR not done, the webhook still POSTs but n8n accepts it without signature check — the SAFETY chain is HALF-VERIFIED. Document as "client-side ✓; n8n-side OBSERVATIONAL-PENDING-N8N" if homelab-PR gap surfaces.

  **Phase 24 retroactive smoke:**
  - Owner clicks "Regenerate tailored resume" / "Regenerate salary intelligence" / (already-tested-in-Phase-23) "Regenerate cover letter" — each produces correct polling state transitions (idle → polling → complete or → silent-success warning)
  - Silent-success warning state: when a regenerate webhook returns 200 but the artifact's `generated_at` doesn't advance within the polling window, owner sees the explicit warning banner (NOT a silent revert). **n8n endpoint dependency:** `regenerate-tailored-resume` + `regenerate-salary-intelligence` n8n endpoints must exist or owner will see silent-success warnings (which IS the correct UI but doesn't exercise the happy path).

- **D-09 [--auto]:** Failure-handling for CICD-13:
  - If a feature actively misbehaves in production (e.g., crashes, wrong data, broken polling): add `[BLOCKING]` fix task INSIDE Phase 28 OR open v3.5.1 followup phase, depending on severity. Rule of thumb: trivial fix (typo, missing import) → in Phase 28; nontrivial (logic bug, n8n workflow change) → v3.5.1.
  - If a feature shows OBSERVATIONAL-PENDING (owner can't fully verify because n8n-side gap blocks the test): document explicitly in Phase 28 SUMMARY + the per-phase SUMMARY edit; mark CICD-13 as "client-side green; n8n-side gap" rather than blocking Phase 28 close.
  - n8n-side gaps that surface: enumerate in `.planning/seeds/SEED-006-n8n-hardening-followup.md` (NEW seed) for v3.5.1 or v4.0 milestone planning.

### Plan structure + sequencing

- **D-10 [--auto]:** SINGLE Plan 28-01 with 5 tasks per the four objectives (recommend; planner can override):
  1. Task 28-01-01 [auto + owner browser observation, autonomous=false]: CICD-10 end-to-end smoke (empty commit + push + observation chain)
  2. Task 28-01-02 [auto]: CICD-11 CLAUDE.md §Deployment rewrite (apply pre-drafted text after live re-validation)
  3. Task 28-01-03 [autonomous=false, owner browser]: CICD-12 Plan 21-08 retroactive UAT (5 checks)
  4. Task 28-01-04 [autonomous=false, owner browser]: CICD-13 Phases 22/23/24 retroactive smoke (per-phase checklist)
  5. Task 28-01-05 [auto]: Phase 28 SUMMARY consolidation + per-phase SUMMARY edits (21-08, 22, 23, 24) + commit chain + final v3.5 milestone close-out summary

  Sequencing rationale: CICD-10 first (smoke proves the pipeline; without it, CICD-12/13 UAT against the deployed site is meaningless because we don't know if our code is what's deployed). CICD-11 second (docs describe the verified-working pipeline). CICD-12 + CICD-13 happen in parallel as owner-driven (or sequentially if owner prefers); planner can structure as 1 task with multiple checkpoints OR split into 2 tasks.

### v3.5 milestone close-out

- **D-11 [--auto]:** After Phase 28 closes, generate a v3.5 milestone summary doc at `.planning/milestones/v3.5-cicd-hardening/v3.5-MILESTONE-SUMMARY.md` (NEW dir + file) capturing:
  - 4 phases, 13 REQs, all CICD-XX → Code complete (with deferred-to-v3.5.1 noted if any)
  - 3 forward-facing intel artifacts (`crd-vs-docs-mismatch-pattern.md`, plus any new ones from Phase 28)
  - 6 Rule 3 deviations across the milestone (Phase 25 lockfile hotfix, Phase 26 4 deviations, Phase 27 2 deviations, Phase 28 N TBD)
  - Closes the SEED-005 loop (CI/CD hardening migration thesis successfully executed)
  - Hands off to v4.0 (or whatever's next) with clean-pipeline starting state

  This is the LAST artifact of v3.5; commit `docs(v3.5): milestone close-out summary` + push to GitHub `main`. Then `gsd-sdk query state.complete-milestone --version "v3.5"` (if SDK supports) OR manual STATE.md / ROADMAP.md flips marking v3.5 closed and v4.0 (TBD) the next milestone.

- **D-12 [--auto]:** Owner-facing post-milestone checklist (surfaced in Phase 28 SUMMARY + v3.5 milestone summary):
  - `kubectl delete secret phase-27-pats -n secrets` (Phase 27 cleanup)
  - Rotate Woodpecker + Forgejo PATs at convenience (or revoke entirely if not needed for future)
  - Triage GitHub Dependabot alerts (3 vulns flagged on Phase 25 push: 1 high, 2 moderate at <https://github.com/hudsor01/hudsonfam/security/dependabot>) — separate concern; v4.0 candidate
  - GHCR storage retention policy decision (older 14-digit tags from old pipeline still accumulating; future GHCR retention phase if costs become a concern) — separate concern; deferred ideas list

### Claude's Discretion

- Exact wording of the no-op commit message (D-01 suggests "smoke(28): v3.5-P4 end-to-end pipeline verification"; cosmetic)
- Whether to bundle CICD-10 + CICD-11 into one task or split (default: separate tasks since they have different success criteria)
- Whether owner does CICD-12 + CICD-13 in one session vs across multiple sessions (executor surfaces a checkpoint per UAT batch; owner replies async if needed)
- Forgejo per-version smoke timing (CICD-10 runs once; subsequent pipeline runs are background and don't need to be measured)
- Whether to include a `kubectl get events -n homepage --since=15m` post-rollout check (recommend YES as part of CICD-10 verification — captures any image-pull errors, OOM, etc.)
- Whether to git-tag the v3.5 milestone close commit (e.g., `v3.5-complete`) — Claude's call; default YES for traceability
- Phase 28 timing budget — recommend 1-2 hours of focused work for owner (15-20 min CICD-10, 30 min CICD-11 review+apply, 30-45 min UAT for CICD-12/13)

### Folded Todos

None — `todo.match-phase 28` query deferred to planner's cross-reference step.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and scope

- `.planning/REQUIREMENTS.md` — 4 Phase 28 REQs: CICD-10, CICD-11, CICD-12, CICD-13 (lines 31-34); v3.5 milestone framing in §`v3.5 Requirements`
- `.planning/ROADMAP.md` — Phase 28 entry (around line 302) with 4 success criteria covering smoke pipeline, CLAUDE.md rewrite, Plan 21-08 retroactive UAT, Phase 22/23/24 retroactive smoke

### Pre-staged Phase 28 artifacts (created during Phase 27 wait time)

- `.planning/notes/phase-28-claude-md-deployment-rewrite-draft.md` (102 lines) — head-start for CICD-11; proposed CLAUDE.md §Deployment replacement text + diff vs current + open items to validate before applying. **Phase 28 executor MUST re-validate every claim against live state at execution time before applying — do NOT apply verbatim without validation.**
- `.planning/intel/crd-vs-docs-mismatch-pattern.md` — operational discipline note; relevant to CICD-13 if any retroactive smoke surfaces a CRD-vs-docs gap

### Phase 27 carry-forward (immediate predecessor)

- `.planning/phases/27-decommission-old-pipeline/27-01-SUMMARY.md` — final state: 6 destructive ops verified; pipeline post-cutover is clean baseline for Phase 28's smoke test
- `.planning/STATE.md` — Phase 27 deviations + intel artifacts cross-references; v3.5 progress 75%

### Per-phase retroactive-UAT targets

- `.planning/phases/21-polish-copy-pdf-empty-states-link-out/21-08-SUMMARY.md` — Plan 21-08 SUMMARY with explicit "Retroactive execution path" (lines 67-79); CICD-12 owns this UAT execution
- `.planning/phases/22-salary-intelligence-defensive-render/22-SUMMARY.md` — Phase 22 phase-level SUMMARY; CICD-13 part 1 sign-off target
- `.planning/phases/23-owner-triggered-workflows-pattern-setter/23-SUMMARY.md` — Phase 23 phase-level SUMMARY; CICD-13 part 2 sign-off target
- `.planning/phases/24-regenerate-expansion-resume-salary-silent-success-state/24-SUMMARY.md` — Phase 24 phase-level SUMMARY; CICD-13 part 3 sign-off target

### Domain-level seeds and notes

- `.planning/seeds/SEED-005-cicd-hardening-migration.md` — full v3.5 milestone rationale; Phase 28 closes the SEED-005 thesis
- `.planning/notes/ci-cd-fragility-analysis.md` — original investigation; reference for v3.5 close-out summary

### v3.0 phase artifacts (CICD-12/13 background)

- Phase 21-24 PLAN + SUMMARY files — referenced by retroactive UAT to know what features to test
- `CLAUDE.md` §Deployment (current text, lines 141-163) — target of CICD-11 rewrite

### External documentation

- GitHub Actions workflow_dispatch: <https://docs.github.com/en/actions/using-workflows/manually-running-a-workflow> (referenced if CICD-10 needs to manually trigger a build)
- Flux force-reconcile docs: <https://fluxcd.io/flux/cmd/flux_reconcile/> (referenced in CLAUDE.md §Deployment rewrite + CICD-10 D-02 observation chain)

### Prior phase context (carry-forward beyond Phase 27)

- All v3.5 phase CONTEXTs (25, 26, 27) — establish the cumulative deployment baseline that CICD-10 smoke validates
- v3.0 phase CONTEXTs (21, 22, 23, 24) — establish the user-visible feature baselines that CICD-12/13 UAT verifies

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- **Pre-drafted CLAUDE.md §Deployment rewrite text** at `.planning/notes/phase-28-claude-md-deployment-rewrite-draft.md` — saves Phase 28 ~30 min of writing; just needs validation + apply
- **Plan 21-08 SUMMARY's "Retroactive execution path" section (lines 67-79)** — already has the 5-step UAT script for CICD-12; agent doesn't need to re-derive
- **CONTEXT D-11 milestone close-out structure** — sketched in this CONTEXT; Phase 28 SUMMARY consolidates per the structure
- **Phase 26 + Phase 27 verification scripts** — kubectl + flux + curl + jq one-liners are reusable for CICD-10's observation chain (just point at new tag values)
- **`scripts/install-hooks.sh` + pre-push schema-drift hook** — referenced in CLAUDE.md rewrite draft; no code changes needed

### Established Patterns

- **Sequential task ordering with owner checkpoints** — Phase 26/27 established the `autonomous: false` checkpoint pattern with owner-runnable fallbacks; Phase 28 reuses for CICD-10 (smoke observation), CICD-12/13 (browser UAT)
- **Per-phase SUMMARY.md sign-off in place** — Plan 21-08's pattern of "edit this file and tick the boxes" for retroactive sign-off; Phase 28 reuses for Phases 22/23/24 retroactive smoke results
- **"Document gap as v3.5.1 candidate"** — for n8n-side gaps that surface during CICD-13 (HMAC verify, regenerate endpoints); seed pattern (`SEED-006-n8n-hardening-followup.md`) follows SEED-005 conventions
- **GitHub `main` direct push for v3.5 work** — established by Phase 25/27; Phase 28 uses for the empty smoke commit + CLAUDE.md rewrite + per-phase sign-off commits

### Integration Points

- **GitHub repo** (`github.com/hudsor01/hudsonfam`) — empty smoke commit + CLAUDE.md rewrite commit; both push to `main`
- **GitHub Actions** — empty commit triggers a 100% warm-cache build (fastest possible) — clean signal for CICD-10 timing
- **GHCR** — receives the new timestamp tag from the CICD-10 smoke build
- **K3s cluster (homepage namespace)** — observable via kubectl during CICD-10; provides the rolled-pod signal
- **Production app at `https://thehudsonfam.com/admin/jobs`** — owner-driven UAT target for CICD-12 + CICD-13
- **n8n at `n8n.cloud.svc.cluster.local`** — receives webhook POSTs during CICD-13; if HMAC verify or regenerate endpoints missing, surfaces gap
- **Per-phase SUMMARY.md files** (21-08, 22, 23, 24) — receive retroactive sign-off edits

</code_context>

<specifics>
## Specific Ideas

- **Empty commit for smoke** — `git commit --allow-empty` is the cleanest signal because it FORCES a Docker layer cache hit on EVERY layer (no source changed → all stages cached → fastest possible build). If we use a whitespace tweak in source, some layers rebuild and we measure rebuild time too. Empty commit measures pure pipeline latency.
- **The pre-staged CLAUDE.md draft is a starting point, not a final** — Phase 28 must re-validate every claim. Things that may have drifted between draft (2026-04-25 morning) and execution: PAT expiry math, GHCR visibility, NFS server IP, Forgejo SSH endpoint, top-3 failure modes still relevant, pre-push hook still installed.
- **CICD-12 Plan 21-08 retroactive sign-off** — Plan 21-08 SUMMARY itself documents the retroactive execution path (lines 67-79); we just follow it. Strict sign-off discipline: 5 checkboxes, 5 outcomes, all recorded inline.
- **CICD-13 n8n-side gap pattern** — Phases 23/24 SUMMARYs explicitly noted "n8n-side HMAC verification is a homelab-repo PR concern". If those PRs were never made, CICD-13 surfaces the gap as OBSERVATIONAL-PENDING-N8N rather than blocking Phase 28. Don't conflate "client-side works" with "full safety chain works" — record both.
- **Failure-mode inversion** — the silent-success warning state in Phase 24 is a CORRECT UI behavior, not a bug. If owner sees it during CICD-13 retroactive smoke, that means n8n returned 200 but didn't actually regenerate — which exercises the warning state correctly. Document as "warning state EXERCISED (correct UX)" not as "regenerate failed".
- **Empty commit + 100% warm cache = ~2-3 min build time** — Phase 25 D-08 said warm-cache is 2-6 min. An empty commit should be at the LOW end of that range (maybe even faster if buildx skips work entirely). CICD-10's 15-min budget is comfortably above expected.
- **Force-reconcile is a critical operational lever** — without `flux reconcile image repository hudsonfam -n flux-system`, CICD-10 would wait up to 6h for the next natural scan. The 15-min CICD-10 SC explicitly assumes force-reconcile is used. Make this explicit in Plan 28-01 task instructions.

</specifics>

<deferred>
## Deferred Ideas

- **v3.5.1 followup milestone** (if surfaced by CICD-12/13 retroactive UAT) — not planned for v3.5 itself; would be a small bug-fix milestone after v3.5 closes
- **n8n-side HMAC verification + regenerate endpoints** — homelab-repo PR concern; surface as v3.5.1 candidate seed (`SEED-006-n8n-hardening-followup.md`) if CICD-13 finds gaps
- **GitHub Dependabot alert triage** — 3 vulns (1 high, 2 moderate) on hudsonfam; v4.0 or sooner depending on severity assessment; not Phase 28 scope
- **GHCR retention policy** — older 14-digit tags from old Forgejo pipeline still in GHCR; future cleanup phase if storage cost matters
- **Forgejo PVC backup hardening** — Finding 6 of fragility-analysis; orthogonal homelab-infra concern; not v3.5 scope
- **`recyclarr` / `seerr` ImageRepository TLS fix** — separate homelab-infra phase (Finding 5)
- **`kubectl explain` validation tooling** — could codify the CRD-vs-docs intel into a CI gate that grep-checks new manifests against installed-CRD field paths; v4.0 candidate
- **Per-commit-SHA tags alongside timestamp** — `CICD-FUTURE-03`; explicit v3.5 deferral
- **PR preview environments** — `CICD-FUTURE-01`; explicit v3.5 deferral
- **Automated rollback on health-check failure** — `CICD-FUTURE-02`; explicit v3.5 deferral
- **Multi-arch builds (arm64)** — explicit v3.5 out-of-scope (cluster is amd64-only)
- **GitHub Actions matrix for node/next.js versions** — explicit v3.5 out-of-scope
- **Renovate / Dependabot full automation** — explicit v3.5 out-of-scope (Dependabot is on but v3.5 is not the milestone to enable auto-merge)
- **Separate staging environment** — explicit v3.5 out-of-scope
- **External monitoring / alerting for CI failures** — explicit v3.5 out-of-scope (GitHub default email + Flux state are sufficient for solo-user app)
- **Node 24 migration (action versions v7/v4)** — explicit Phase 25 D-05 deferral past v3.5-P4; would be a v4.0+ concern (GitHub Actions runner forces Node 24 default 2026-06-02; current pins remain functional inside that window)
- **CLAUDE.md tone overhaul** (broader than §Deployment) — only §Deployment gets rewritten in CICD-11; if owner wants a broader doc revamp, separate task

</deferred>

---

*Phase: 28-smoke-retroactive-uat*
*Context gathered: 2026-04-25 (auto mode — 12 decisions locked using Phase 25/26/27 carry-forward + pre-staged Phase 28 prep artifacts + Plan 21-08 retroactive-execution-path script + Phase 22/23/24 SUMMARY targets)*
</content>
</invoke>