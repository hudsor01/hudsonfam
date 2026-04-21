---
id: SEED-002
status: dormant
planted: 2026-04-21
planted_during: v3.0 AI Integration roadmap scoping
trigger_when: A photos feature milestone is scoped, OR an accessibility-focused milestone introduces alt-text requirements, OR cluster-hosted LLM capacity (Qwen) gets a formal product surface
scope: Medium
---

# SEED-002: Qwen-generated photo captions and alt text

## Why This Matters

The /dashboard/photos flow currently requires manual caption/alt-text entry or leaves images uncaptioned. For a family-site use case this creates real friction: photos get uploaded in batches, captioning is tedious, and missing alt text hurts accessibility and on-site search signal.

The homelab already runs a Qwen model via llama.cpp + MLX (see `apps/ai/llama.cpp`, `apps/ai/qwen-embed`, `apps/ai/mlx-mac`) — marginal cost to generate captions is near zero. The bottleneck is product surface: where does auto-caption fit in the upload flow, can the owner override, does it apply retroactively?

## When to Surface

**Trigger:** A photos feature milestone is scoped. Also resurrect if:
- A dedicated accessibility milestone lands (alt text becomes a formal requirement)
- Homelab MLX/Qwen stack gets a stable product-facing endpoint
- Owner reports photo-caption friction

This seed should be presented during `/gsd-new-milestone` when the milestone scope matches:
- Photos feature work
- Accessibility / a11y work
- LLM product-surface work beyond the jobs pipeline

## Scope Estimate

**Medium** — a phase or two:
- New Server Action that POSTs image bytes to the cluster-hosted Qwen endpoint and persists caption + alt to the `Photo` model
- Edge decision: trigger on upload (latency) or async backfill (eventual consistency)
- Owner-override UI (accept / edit / reject LLM suggestion)
- Cost monitoring: even self-hosted, GPU time on dev-server matters

## Breadcrumbs

- `src/lib/images.ts` — existing photo processing pipeline (sharp resize, WebP, thumbnails) — natural place to hook caption generation
- `apps/ai/llama.cpp` / `apps/ai/mlx-mac` / `apps/ai/qwen-embed` (homelab repo) — hosted LLM stack
- `prisma/schema.prisma` — `Photo` model would need `caption` + `alt_text` columns (probably)

## Notes

Displaced from a pre-v3.0 roadmap stub that parked this alongside Qdrant search, Tdarr, and Jellyfin embeds. Preserved here because the idea is still sound — it was just scoped wrong (too broad for a single milestone) and not urgent (no owner-reported friction today).
