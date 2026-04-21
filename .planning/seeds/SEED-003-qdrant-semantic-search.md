---
id: SEED-003
status: dormant
planted: 2026-04-21
planted_during: v3.0 AI Integration roadmap scoping
trigger_when: A site-wide search milestone is scoped, OR content inventory (blog + photos + memorial + events) grows past ~200 items and owner reports search friction, OR a RAG/semantic-retrieval milestone arrives
scope: Medium
---

# SEED-003: Qdrant + qwen-embed semantic search across site content

## Why This Matters

hudsonfam has no search surface today. Blog posts, family updates, photo albums, memorial content, and events all live in separate Prisma models with no unified retrieval path. As the content library grows, "I saw a photo of Dad at the lake — where was that?" becomes a real problem that keyword search can't solve.

The homelab already runs Qdrant (`apps/ai/qdrant`) and a qwen-embed endpoint (`apps/ai/qwen-embed`) for other purposes. An embedding-based search across titles / descriptions / blog bodies / photo captions is near-free to bolt on infrastructure-wise. The hard parts are: (1) embedding upsert pipeline for CRUD operations, (2) UI for search + results ranking, (3) multi-model result rendering (a blog post and a photo album look different in a unified result list).

## When to Surface

**Trigger:** Site-wide search is scoped as a milestone. Also resurrect if:
- Total content row count exceeds ~200 items (current count: modest; revisit at that threshold)
- Owner asks "how do I find …" about their own content
- A RAG / retrieval-augmented feature is planned (e.g. memorial chatbot that answers "tell me about Grandpa's time at …")

Present during `/gsd-new-milestone` when:
- Search / retrieval / discovery is mentioned
- AI features that need grounding in family content are scoped
- SEED-002 (photo captions) ships — captions become embeddable

## Scope Estimate

**Medium** — one to two phases:
- Embedding-upsert hooks on every content model's create/update/delete (Prisma middleware or explicit)
- Qdrant collection + payload schema (content_type, id, url, title, summary)
- Search route + Server Action calling qwen-embed → Qdrant → payload join-back
- Unified `<SearchResult>` React component rendering blog / photo / memorial / event hits differently
- Re-embedding backfill job for existing content

## Breadcrumbs

- `apps/ai/qdrant` (homelab) — existing Qdrant instance
- `apps/ai/qwen-embed` (homelab) — existing embedding endpoint
- `prisma/schema.prisma` — BlogPost, Photo, Album, Event, MemorialContent, FamilyUpdate all need hooks
- `src/lib/prisma.ts` — Prisma client; middleware would attach here

## Notes

Displaced from a pre-v3.0 roadmap stub. This is a real capability gap (no search today) but the right scope is its own milestone — tacking it onto "AI Integration" blurred the focus. The v3.0 milestone sharply defined AI Integration as "wire the Job Search pipeline output"; search belongs elsewhere.
