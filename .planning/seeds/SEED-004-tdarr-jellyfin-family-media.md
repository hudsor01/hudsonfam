---
id: SEED-004
status: dormant
planted: 2026-04-21
planted_during: v3.0 AI Integration roadmap scoping
trigger_when: A family media milestone is scoped (photos/videos/movies surfaced to the family dashboard), OR Jellyfin becomes family-facing (not just owner admin), OR Tdarr auto-transcode of family uploads becomes a real owner-reported need
scope: Small-to-Medium
---

# SEED-004: Tdarr video transcoding + Jellyfin family-facing media embeds

## Why This Matters

Two loosely related ideas that were parked together in the old v3.0 stub:

1. **Tdarr auto-transcoding** — family video uploads (phone clips, home movies) arrive in mixed codecs/bitrates. Transcoding to a web-friendly format lets them render inline on the family dashboard without a separate download step.
2. **Jellyfin media embeds** — the homelab runs Jellyfin for family movies. Right now family members go to `jellyfin.*` directly. Embedding a "recently added" shelf or a watch-history widget inside `/dashboard/services` would make hudsonfam a true front door instead of a link aggregator.

Both are hosted-infra-first features (Tdarr and Jellyfin already run in the homelab); the app work is embedding/integration, not building new backends.

## When to Surface

**Trigger:** A family media milestone is scoped. Also resurrect if:
- Owner starts uploading family videos regularly and complains about codecs
- Jellyfin usage patterns shift toward family-wide (rather than owner-only)
- A "family dashboard" overhaul arrives that consolidates media surfaces

Present during `/gsd-new-milestone` when:
- Family media / video is in scope
- Jellyfin or Tdarr appears in milestone goals
- `/dashboard/services` is being extended

## Scope Estimate

**Small-to-Medium** — one phase each, could combine:

Tdarr side:
- Upload endpoint → drop file in Tdarr watch folder → poll for completion → persist transcoded URL
- Straightforward; Tdarr already handles the heavy lifting

Jellyfin side:
- OAuth or API-key credentials path (Jellyfin has its own auth)
- Embed shelf: recently-added library fetch, item poster + play-in-jellyfin link
- Optional: watch-history if Jellyfin exposes it per-user

## Breadcrumbs

- `apps/media/tdarr` (homelab) — existing Tdarr instance
- `apps/media/jellyfin` (homelab) — existing Jellyfin instance
- `src/components/dashboard/` — existing dashboard widget pattern
- `src/app/(dashboard)/dashboard/services/` — natural home for Jellyfin embed
- `reference_tdarr_internals.md` in auto-memory — Tdarr DB schema, replaceOriginalFile flow

## Notes

Displaced from the pre-v3.0 roadmap stub. Combined into one seed because the trigger conditions are similar (family media milestone) and the features would likely ship in adjacent phases. If they diverge in priority later, split into SEED-004a and SEED-004b. Also originally listed alongside "N8N upload automation" and "Resend email notifications" — those were already solved by existing n8n workflows and are not preserved as seeds.
