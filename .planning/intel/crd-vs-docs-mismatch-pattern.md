# Intel: CRD-vs-docs field-path mismatch pattern

**Captured:** 2026-04-25 (during v3.5 milestone, after Phases 26 + 26 hit the same pattern in different libraries)
**Triggered by:** Two same-shape failures within 48h of each other in Phase 26

---

## Summary

**Official library docs sometimes reference field paths that the installed-cluster CRD schema does NOT accept.** Both the upstream library project and the installed cluster operator may be at slightly different versions, with field-rename / field-relocation evolutions that hit production via cluster updates before the docs catch up (or the other way: docs ahead of installed version).

**Failure mode:** YAML validates against an old or hypothetical schema, gets rejected by the live cluster CRD validator at `kubectl apply` time. Symptoms range from `unknown field` errors (best case — surfaces immediately) to silently-ignored fields (worst case — manifest applies cleanly but the spec value is dropped, behavior diverges).

**Two confirmed instances of this pattern in v3.5:**

### Instance 1 — Phase 26 Plan 26-01 (ExternalSecrets v1)

- **Library:** ExternalSecrets Operator (ESO) `external-secrets.io/v1`
- **Installed:** ESO 2.1.0 (per `homelab/CLAUDE.md:55`)
- **Field path that broke:** `spec.target.type`
- **Docs say:** ExternalSecrets v1 docs include `spec.target.type` as a supported field for hinting the target Secret type
- **Cluster reality:** `kubectl apply` rejects it with a CRD validation error
- **Fix shipped:** `homelab` commit `943c2c4` removed `spec.target.type`; canonical `type` declaration stays in `spec.target.template.type`
- **Recovery cost:** 1 hotfix commit + 1 wasted reconcile cycle

### Instance 2 — Phase 26 Plan 26-02 (Flux ImagePolicy)

- **Library:** Flux `image.toolkit.fluxcd.io/v1beta2`
- **Installed:** Flux v2 (current homelab version per `clusters/homelab/...` manifests)
- **Field path that broke:** `status.latestImage` (in verification scripting, not in spec)
- **Docs say:** Flux ImagePolicy docs reference `status.latestImage` for the resolved image
- **Cluster reality:** Installed CRD uses `status.latestRef.{name,tag}` (renamed/relocated)
- **Fix shipped:** Plan 26-02 verification scripts switched to `status.latestRef.name + ":" + status.latestRef.tag`; semantic equivalent.
- **Recovery cost:** in-flight planner + executor both adapted at runtime (no committed deviation; Plan 26-02 SUMMARY captures it)

### Instance 3 (related, different library) — Phase 27 Plan 27-01 (Forgejo packages API)

- **Library:** Forgejo container packages API
- **Installed:** Forgejo 14.0.3+gitea-1.22.0 (per `git.homelab/swagger.v1.json` live inspection)
- **Endpoint that didn't exist:** `DELETE /api/v1/packages/{owner}/container/{name}` (package-level)
- **Docs implied:** Forgejo container package docs have package-level operations; a package-level DELETE would be the ergonomic path
- **Reality:** Only `DELETE /api/v1/packages/{owner}/{type}/{name}/{version}` (per-version) is implemented
- **Fix:** RESEARCH.md flagged this pre-execution; plan used per-version loop from the start (no recovery needed)

---

## Why this happens

1. **Library evolution moves faster than docs** — operator implementations rename / restructure CRD fields between minor versions; documentation is usually written against the latest stable but installed clusters lag
2. **Multiple sources of "official" docs** — upstream GitHub README, dedicated docs site, Helm chart values, `kubectl explain` output. They drift from each other.
3. **Cluster operators may be running pinned older versions** — homelab clusters typically pin operator versions for stability; docs may have moved on
4. **`kubectl apply` validation is permissive in some shapes** — some operators silently drop unknown fields rather than rejecting the manifest, which converts a loud failure into a subtle bug

---

## Operational discipline (use for any new manifest writing)

**Rule 1: `kubectl explain` is authoritative for the installed cluster.**

Before writing any manifest field path, validate it exists in the LIVE cluster CRD schema:

```bash
# General form
kubectl explain <resource>.<deep.field.path>

# Examples that would have caught the v3.5 instances
kubectl explain externalsecret.spec.target              # would show whether 'type' is a valid sub-field
kubectl explain imagepolicy.status                       # would show 'latestRef' not 'latestImage'
```

If `kubectl explain` says "field not found" or doesn't list the path, the field doesn't exist in your cluster — regardless of what upstream docs say.

**Rule 2: For REST APIs (Forgejo, Woodpecker, GitHub, etc.), inspect live OpenAPI/swagger before writing client code.**

```bash
curl -sk "https://git.homelab/swagger.v1.json" | jq '.paths | keys[] | select(test("packages"))' | head -20
curl -sk "https://ci.thehudsonfam.com/swagger.json" 2>/dev/null
```

The swagger endpoint is the source of truth for what the live server actually accepts.

**Rule 3: Code reviews and plan checkers should grep new manifests for cluster-installed-CRD-validated field paths.**

A simple grep for known-broken paths like `spec.target.type` or `status.latestImage` in any newly-introduced manifest can catch the pattern early.

**Rule 4: When upstream docs and `kubectl explain` disagree, `kubectl explain` wins. Document the disagreement (so future-you knows which source to trust for that specific operator).**

---

## When to consult this note

- Writing any new ExternalSecret manifest in this homelab cluster
- Writing any new Flux manifest (ImageRepository, ImagePolicy, ImageUpdateAutomation, GitRepository, Kustomization, HelmRelease)
- Scripting verification commands against any K8s CRD's `status` block
- Writing client code against any homelab self-hosted REST API (Forgejo, Woodpecker, n8n, etc.)
- ANY time you copy YAML/curl from an upstream library README and apply it to the homelab cluster — validate the field paths against `kubectl explain` first

---

## Updates to this note

When a new instance of this pattern is encountered, append it to the Instances list above with:
- Library + installed version
- Specific field path that broke
- What the docs said vs what the cluster accepted
- Recovery path

This builds an evolving operational lesson library specific to the homelab cluster's installed-version state.

---

*Pattern recognized and intel captured during v3.5 milestone retrospective on Phase 26 + Phase 27. Future reference for any phase touching K8s CRDs or homelab REST APIs.*
</content>
</invoke>