# Milestones (Shipped)

Append-only ledger of shipped milestones. Each entry: version, date, scope, accomplishments. Detailed roadmap + requirements snapshots in `.planning/milestones/`.

---

## v3.5 — CI/CD Hardening

**Shipped:** 2026-04-25
**Phases:** 25-28 (4 phases, 5 plans)
**Tag:** `v3.5-complete` (commit `f02440c`)
**Archive:** [v3.5-ROADMAP.md](milestones/v3.5-ROADMAP.md) · [v3.5-REQUIREMENTS.md](milestones/v3.5-REQUIREMENTS.md) · [v3.5-MILESTONE-AUDIT.md](milestones/v3.5-MILESTONE-AUDIT.md) · [v3.5-MILESTONE-SUMMARY.md](milestones/v3.5-cicd-hardening/v3.5-MILESTONE-SUMMARY.md)

### Delivered

Migrated hudsonfam deploy pipeline from broken self-hosted Forgejo+Woodpecker (6 moving parts, 5 self-hosted) to the CLAUDE.md-intended GitHub Actions + GHCR pipeline (2 moving parts, both vendor-managed). End-to-end smoke proved the new pipeline travels in 11m13s vs 15-min budget. v3.0 prod-UAT debt accumulated since 2026-04-22 cleared via Phase 28 retroactive UAT. SEED-005 thesis fully executed.

### Key Accomplishments

1. **Phase 25:** `.github/workflows/build-and-push.yml` shipped + first GHCR build green; warm-cache 2-6 min vs 10-min budget
2. **Phase 26:** Flux ImageRepository + Deployment cutover to `ghcr.io/hudsor01/hudsonfam`; first templated ExternalSecret in homelab (PATTERNS.md Gap 1 closed); pod live on `:20260424023904`
3. **Phase 27:** 6 destructive ops across 4 systems retired the Forgejo+Woodpecker rollback safety net; pod stayed `ready=true restarts=0` throughout
4. **Phase 28:** Empty smoke commit `e1ec19a` traveled end-to-end in 11m13s; CLAUDE.md §Deployment rewrite (commit `dda3af3`); Plan 21-08 + Phase 22/23/24 retroactive UAT closed v3.0 prod-UAT debt
5. **Forward intel:** `crd-vs-docs-mismatch-pattern.md` + `flux-iua-push-branch-separation.md` capture two recurring patterns with documented permanent fixes

### Stats

- **Phases:** 4 (25, 26, 27, 28)
- **Plans:** 5 total (25-01, 26-01, 26-02, 27-01, 28-01)
- **REQs satisfied:** 13/13 (CICD-01..13)
- **Timeline:** 2026-04-23 → 2026-04-25 (~3 days)
- **Code commits:** ~45 across hudsonfam + homelab repos
- **Production runtime security:** 2 active vulns → 0 (next 16.2.3 + postcss 8.5.10 patched in audit fix-pass commit `41c0191`)

### Known Deferred Items

6 dormant seeds at close — all forward-facing parking-lot ideas with explicit `trigger_when` clauses:

| Seed | Status | Activation |
|------|--------|------------|
| SEED-001 | dormant | AI pipeline health dashboard (v3.1+ candidate) |
| SEED-002 | dormant | Qwen photo captions (v3.1+ candidate) |
| SEED-003 | dormant | Qdrant semantic search (v3.1+ candidate) |
| SEED-004 | dormant | Tdarr+Jellyfin family media (v3.1+ candidate) |
| SEED-005 | **closed 2026-04-25** | (this milestone IS the activation) |
| SEED-006 | dormant | n8n hardening followup — HMAC verify Code-node template ready at `.planning/notes/seed-006-hmac-verify-template.md` |
| SEED-007 | dormant | Cloudflare Rocket Loader synthetic — n8n workflow shipped to homelab `47ebaa3`, owner activates after NTFY_N8N_TOKEN check |

See `.planning/STATE.md` §"Deferred Items" for the full list with rationale.

### Owner-Action Truly Remaining

- Rotate WOODPECKER_PAT + FORGEJO_PAT (T-27-02 defense-in-depth; UI access required — agent-blocked)
- (optional) Activate SEED-006 (5 n8n workflows manually via UI) or open new v3.5.1 phase
- (optional) Activate SEED-007 (n8n workflow + ntfy token + workflow-active toggle)

---

_Append future milestones below this line, newest at top._
