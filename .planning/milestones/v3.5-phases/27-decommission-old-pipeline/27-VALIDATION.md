---
phase: 27
slug: decommission-old-pipeline
status: approved-post-execution
nyquist_compliant: true   # flipped 2026-04-25 per v3.5-MILESTONE-AUDIT — operational verification completed exhaustively (7-check verification suite + 6 destructive-op confirmations, all PASS); 2 Rule 3 deviations auto-fixed (Woodpecker host correction; sandbox PAT extraction → owner-local-shell pivot per T-27-02)
wave_0_complete: true     # owner Wave 0 prerequisites (FORGEJO_PAT + WOODPECKER_PAT generation, K8s Secret store) all completed pre-Plan-27-01
created: 2026-04-24
approved_at: 2026-04-25   # retroactive approval — phase code-complete 2026-04-25 per 27-01-SUMMARY
---

# Phase 27 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | bash + kubectl + curl + jq + Woodpecker MCP (no app test framework — pure cleanup phase ships zero source code) |
| **Config file** | none — verification commands derived from CONTEXT D-10 (corrected post-research) + per-task acceptance |
| **Quick run command** | `kubectl get imagerepository -A 2>&1 \| grep hudsonfam \| wc -l` (must equal 1 post-cleanup) |
| **Full suite command** | 7-command verification suite below |
| **Estimated runtime** | ~30 seconds (read-only kubectl/curl) |

**Full validation script (executor runs after all 6 deletion tasks complete):**

```bash
# CICD-07: Only ONE hudsonfam ImageRepository remains (the flux-system GHCR watcher)
kubectl get imagerepository -A 2>&1 | grep hudsonfam | wc -l  # → 1

# CICD-09 secret cleanup: zero hudsonfam-relevant forgejo-registry-creds rows
# (woodpecker-pipelines/forgejo-registry stays — different name, different consumers, NOT hudsonfam)
kubectl get secret -A 2>&1 | grep "forgejo-registry-creds" | wc -l  # → 0

# CICD-08 part 1: .woodpecker.yaml gone from hudsonfam repo (locally + remote)
test ! -f /home/dev-server/hudsonfam/.woodpecker.yaml && echo "OK: .woodpecker.yaml deleted" || echo "FAIL"

# CICD-08 part 2: Woodpecker repo dereg (verified via MCP, NOT REST — MCP is read-only per RESEARCH §finding 2)
# mcp__woodpecker__search_repository "hudsonfam" → expect zero matches

# CICD-09 part 3: Forgejo container packages empty (CORRECTED endpoint per RESEARCH §finding 3)
curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" | jq -r '.[] | select(.name=="hudsonfam") | .name + ":" + .version'
# → expect EMPTY (no hudsonfam packages)

# Overall Flux health: zero hudsonfam-related Failed conditions
kubectl get gitrepository,imagerepository,imagepolicy,imageupdateautomation,kustomization -A 2>&1 \
  | grep -iE "hudsonfam|homepage" | grep -i "false\|failed\|stalled"
# → expect EMPTY

# Pod still healthy on the new pipeline (sanity: nothing this phase did broke Phase 26)
kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].status.containerStatuses[0].ready} restarts={.items[0].status.containerStatuses[0].restartCount}'
# → expect "true restarts=0"
```

**Pre-flight cluster sanity check (run BEFORE forgejo-registry-creds Secret deletion to verify Phase 26 cutover propagated):**

```bash
# Pod's imagePullSecrets must be ghcr-pull-credentials (NOT forgejo-registry-creds).
# If this returns "forgejo-registry-creds", Phase 26 cutover didn't fully propagate — HALT and re-investigate.
kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].spec.imagePullSecrets[0].name}'
# → expect: ghcr-pull-credentials
```

---

## Sampling Rate

- **After every task commit:** Run the matching task's automated verify command (per task table below)
- **After all deletion tasks complete:** Run the full validation script above
- **Before `/gsd-verify-work`:** Full validation script must pass all 7 commands
- **Max feedback latency:** ~30 seconds for full validation script (read-only kubectl/curl, no Flux reconcile waits since this phase only DELETES resources — no creation latency)

---

## Per-Task Verification Map

> Plan 27-01 has 7 tasks (1 plan, 7 tasks per CONTEXT D-07 sequencing + the post-deletion verification checkpoint). Both API DELETE tasks (Forgejo + Woodpecker) are `autonomous: false` per RESEARCH §finding 5 — owner supplies PAT inline.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 27-01-01 | 01 | 1 | CICD-08 | T-27-01 (.woodpecker.yaml resurfaces) | .woodpecker.yaml deleted from hudsonfam main; remote in sync | unit | `test ! -f /home/dev-server/hudsonfam/.woodpecker.yaml && git -C /home/dev-server/hudsonfam log -1 --diff-filter=D -- .woodpecker.yaml` returns the deletion commit | N/A | ⬜ pending |
| 27-01-02 | 01 | 1 | CICD-08 | T-27-02 (PAT leak) | Woodpecker repo dereg via REST DELETE; PAT supplied inline | manual | Owner supplies WOODPECKER_PAT inline; verify via `mcp__woodpecker__search_repository "hudsonfam"` returns zero matches | N/A — manual gate by design (owner ops surface, not exposed to executor) | ⬜ pending |
| 27-01-03 | 01 | 1 | CICD-07 | — | Broken default/imagerepository/hudsonfam deleted | integration | `kubectl get imagerepository -A 2>&1 \| grep hudsonfam \| wc -l` returns `1` | N/A | ⬜ pending |
| 27-01-04 | 01 | 1 | CICD-09 | T-27-03 (pod loses pull credentials) | forgejo-registry-creds Secrets deleted from both ns | integration | Pre-check: `kubectl get pod -n homepage -l app=hudsonfam -o jsonpath='{.items[0].spec.imagePullSecrets[0].name}'` → `ghcr-pull-credentials`. Post-delete: `kubectl get secret -A 2>&1 \| grep "forgejo-registry-creds" \| wc -l` → `0` | N/A | ⬜ pending |
| 27-01-05 | 01 | 1 | CICD-09 | T-27-02 (PAT leak) | All 6 Forgejo container versions deleted; PAT supplied inline | manual | Owner supplies FORGEJO_PAT inline (scope `write:package`); verify via corrected endpoint `curl -sk "https://git.homelab/api/v1/packages/forgejo-admin?type=container" \| jq -r '.[] \| select(.name=="hudsonfam")'` returns empty | N/A — manual gate by design | ⬜ pending |
| 27-01-06 | 01 | 1 | — | — | Full Flux health verification suite | integration | Full 7-command script above; all expected outputs match | N/A | ⬜ pending |
| 27-01-07 | 01 | 1 | — | — | Owner approves Phase 27 code-complete declaration | manual | Final checkpoint after all 6 cleanup steps verified | N/A — manual gate by design | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] No code-test framework needed — this phase ships zero source code; verification is operational (kubectl + curl + Woodpecker MCP)
- [ ] Wave 0 covers manual prerequisites only:
  - Owner has Forgejo PAT with scope `write:package` for the `forgejo-admin` user (or admin-equivalent) — needed for Task 27-01-05
  - Owner has Woodpecker PAT (Bearer-token auth from `https://woodpecker.homelab/-/profile` → "Personal Access Tokens") — needed for Task 27-01-02
  - Owner is OK with destroying the Forgejo registry artifacts permanently (D-08 says no rollback design needed; Phase 26's GHCR cutover is the rollback target — confirms there's nothing to roll back TO that requires Forgejo)
  - Owner has confirmed Phase 26 has been observably green for ≥10 min (D-10 gating rule) — already verified pre-discuss-phase via pod health spot-check (Running 1/1, 0 restarts, on `ghcr.io/hudsor01/hudsonfam:20260424023904`)

*Existing infrastructure covers all phase requirements — no test files to author.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Forgejo PAT generation | CICD-09 | Owner-only ops surface; PAT cannot be created by executor | Owner: visit `https://git.homelab/-/user/settings/applications` → generate token with scope `write:package` (admin-equivalent) → supply inline at Task 27-01-05 prompt |
| Woodpecker PAT generation | CICD-08 | Owner-only ops surface | Owner: visit `https://woodpecker.homelab/-/profile` → "Personal Access Tokens" → generate Bearer token → supply inline at Task 27-01-02 prompt |
| Forgejo registry-deletion confirmation | CICD-09 | Destructive operation — owner approval required even with PAT in hand | Per Task 27-01-05 acceptance criteria: 6 versions × HTTP 204 success; surface each DELETE response code in plan output |
| Woodpecker repo-dereg confirmation | CICD-08 | Same — destructive REST DELETE | Per Task 27-01-02 acceptance criteria: REST DELETE returns HTTP 200; pre/post MCP search confirms removal |
| Phase 26 still green at end of Phase 27 | sanity | Operational rollback safety | After all 6 deletes, pod must still be Running 1/1 with 0 new restarts; if pod has restarted during Phase 27 execution, HALT and investigate |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify command (kubectl/curl/MCP) or fall under Wave 0 manual prerequisites
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify (Phase 27 has 7 tasks; even the manual gates have observable post-conditions)
- [ ] Wave 0 covers all MISSING references (owner ops surface only — no source-code Wave 0 needed)
- [ ] No watch-mode flags (verification commands are one-shot kubectl/curl invocations)
- [ ] Feedback latency < 30s (no Flux reconcile waits — DELETE-only phase has no creation latency)
- [ ] `nyquist_compliant: true` set in frontmatter (flip on plan-checker pass)

**Approval:** pending
</content>
</invoke>