export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { MemoryForm } from "./memory-form";

export const metadata: Metadata = {
  title: "Remembering Richard Hudson Sr. | The Hudson Family",
  description:
    "A tribute to Richard Hudson Sr. — share your memories, stories, and photos.",
  openGraph: {
    title: "Remembering Richard Hudson Sr.",
    description:
      "A tribute to Richard Hudson Sr. — share your memories and stories.",
    type: "website",
    images: [
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=80&auto=format&fit=crop",
    ],
  },
};

const photos = [
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80&auto=format&fit=crop",
    alt: "Family gathering",
    span: "col-span-2 row-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80&auto=format&fit=crop",
    alt: "Together",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=400&q=80&auto=format&fit=crop",
    alt: "Sunset walk",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80&auto=format&fit=crop",
    alt: "Morning coffee",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&q=80&auto=format&fit=crop",
    alt: "Nature",
    span: "col-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80&auto=format&fit=crop",
    alt: "Hands",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=400&q=80&auto=format&fit=crop",
    alt: "Laughter",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=400&q=80&auto=format&fit=crop",
    alt: "Warmth",
    span: "",
  },
];

export default async function MemorialPage() {
  const memories = await prisma.memory.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-bg via-bg/95 to-bg" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-accent)_0%,_transparent_70%)] opacity-[0.04]" />
        <div className="relative max-w-3xl mx-auto text-center px-5 py-20 sm:py-28">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mx-auto mb-8">
            <span className="text-3xl font-serif text-accent">R</span>
          </div>
          <p className="text-xs tracking-[5px] text-accent/80 uppercase mb-4 font-sans">
            In Loving Memory
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-text font-normal leading-tight mb-6">
            Richard Hudson Sr.
          </h1>
          <div className="w-16 h-px bg-accent/40 mx-auto mb-6" />
          <p className="text-text-muted text-base sm:text-lg max-w-xl mx-auto leading-relaxed italic">
            A father, a mentor, a friend to many. His warmth, wisdom, and
            laughter touched everyone who knew him. This page is a place to
            celebrate his life and share the memories that keep his spirit alive.
          </p>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Photo Gallery */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <h2 className="text-xs font-sans font-semibold tracking-[4px] text-accent uppercase text-center mb-10">
          Moments We Treasure
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-lg group ${photo.span}`}
            >
              <div className="aspect-square">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading={i < 4 ? "eager" : "lazy"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-bg/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-text-dim text-xs mt-6 italic">
          Photos are placeholders — upload real family photos to make this page
          truly special
        </p>
      </section>

      <div className="border-t border-border" />

      {/* Video Section */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-20">
        <h2 className="text-xs font-sans font-semibold tracking-[4px] text-accent uppercase text-center mb-10">
          In His Own Words
        </h2>
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-surface to-bg">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-accent ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-text-muted text-sm">
                Video tributes coming soon
              </p>
              <p className="text-text-dim text-xs mt-1">
                Upload family videos to share here
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="border-t border-border" />

      {/* Memories Section */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-20">
        <h2 className="text-xs font-sans font-semibold tracking-[4px] text-accent uppercase text-center mb-3">
          Shared Memories
        </h2>
        <p className="text-text-muted text-sm text-center mb-12 max-w-md mx-auto">
          Share a memory, a story, or a few words about what Richard meant to
          you. Every memory helps keep his legacy alive.
        </p>

        {/* Memory Submission Form */}
        <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 mb-12">
          <h3 className="text-lg font-serif text-text mb-6">
            Share Your Memory
          </h3>
          <MemoryForm />
        </div>

        {/* Existing Memories */}
        {memories.length > 0 && (
          <div className="space-y-6">
            {memories.map((memory) => (
              <article
                key={memory.id}
                className="bg-surface/50 border border-border/60 rounded-xl p-6 transition-colors hover:border-accent/20"
              >
                <blockquote className="text-text text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-4">
                  &ldquo;{memory.content}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                    <span className="text-accent text-xs font-semibold">
                      {memory.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-text font-medium">
                      {memory.name}
                    </p>
                    {memory.relationship && (
                      <p className="text-xs text-text-dim">
                        {memory.relationship}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-text-dim ml-auto">
                    {new Date(memory.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}

        {memories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-muted text-sm italic">
              Be the first to share a memory.
            </p>
          </div>
        )}
      </section>

      {/* Closing */}
      <section className="border-t border-border">
        <div className="max-w-xl mx-auto text-center px-5 py-16">
          <div className="w-12 h-px bg-accent/40 mx-auto mb-6" />
          <p className="text-text-muted text-sm italic leading-relaxed">
            &ldquo;What we have once enjoyed we can never lose. All that we love
            deeply becomes a part of us.&rdquo;
          </p>
          <p className="text-text-dim text-xs mt-3">— Helen Keller</p>
        </div>
      </section>
    </div>
  );
}
