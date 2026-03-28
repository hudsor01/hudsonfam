export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { Metadata } from "next";
import { MemoryForm } from "./memory-form";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "Richard Hudson Sr. — In Loving Memory | The Hudson Family",
  description:
    "Remembering Richard Hudson Sr. — a devoted father, mentor, and friend. View photos, watch tributes, and share your memories of Richard Hudson. A memorial tribute by the Hudson family in Dallas, Texas.",
  keywords: [
    "Richard Hudson",
    "Richard Hudson Sr",
    "Richard Hudson memorial",
    "Richard Hudson tribute",
    "Richard Hudson Sr memorial",
    "Hudson family",
    "in memory of Richard Hudson",
    "remembering Richard Hudson",
    "Richard Hudson Dallas",
    "Richard Hudson obituary",
    "Richard Hudson Sr tribute",
  ],
  alternates: {
    canonical: "https://thehudsonfam.com/richard-hudson-sr",
  },
  openGraph: {
    title: "Richard Hudson Sr. — In Loving Memory",
    description:
      "A tribute to Richard Hudson Sr. — devoted father, mentor, and friend. Share your memories and celebrate his life.",
    type: "profile",
    url: "https://thehudsonfam.com/richard-hudson-sr",
    siteName: "The Hudson Family",
    locale: "en_US",
    images: [
      {
        url: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80&auto=format&fit=crop",
        width: 1200,
        height: 630,
        alt: "In loving memory of Richard Hudson Sr.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Richard Hudson Sr. — In Loving Memory",
    description:
      "A tribute to Richard Hudson Sr. Share your memories and celebrate his life.",
    images: [
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    "max-image-preview": "large",
    "max-video-preview": -1,
  },
};

const photos = [
  {
    src: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&q=80&auto=format&fit=crop",
    alt: "Richard Hudson Sr. family gathering — cherished moments together",
    span: "col-span-2 row-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&q=80&auto=format&fit=crop",
    alt: "Richard Hudson Sr. with loved ones — a life of connection",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1476234251651-f353703a034d?w=400&q=80&auto=format&fit=crop",
    alt: "Peaceful sunset — remembering Richard Hudson Sr.",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&q=80&auto=format&fit=crop",
    alt: "Morning coffee — a simple pleasure Richard Hudson Sr. enjoyed",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=600&q=80&auto=format&fit=crop",
    alt: "Richard Hudson Sr. in nature — finding peace outdoors",
    span: "col-span-2",
  },
  {
    src: "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80&auto=format&fit=crop",
    alt: "Hands clasped — the strength of Richard Hudson Sr.",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?w=400&q=80&auto=format&fit=crop",
    alt: "Laughter and joy — the spirit of Richard Hudson Sr.",
    span: "",
  },
  {
    src: "https://images.unsplash.com/photo-1464746133101-a2c3f88e0dd9?w=400&q=80&auto=format&fit=crop",
    alt: "Warmth and light — honoring Richard Hudson Sr.'s legacy",
    span: "",
  },
];

// JSON-LD structured data for search engines
function MemorialJsonLd({ memoryCount }: { memoryCount: number }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Richard Hudson Sr.",
    alternateName: ["Richard Hudson", "Richard Hudson Senior"],
    description:
      "Richard Hudson Sr. — a devoted father, mentor, and friend whose warmth, wisdom, and laughter touched everyone who knew him.",
    url: "https://thehudsonfam.com/richard-hudson-sr",
    sameAs: [],
    familyName: "Hudson",
    givenName: "Richard",
    honorificSuffix: "Sr.",
  };

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Richard Hudson Sr. — In Loving Memory",
    description:
      "Memorial tribute page for Richard Hudson Sr. with photos, videos, and shared memories from family and friends.",
    url: "https://thehudsonfam.com/richard-hudson-sr",
    isPartOf: {
      "@type": "WebSite",
      name: "The Hudson Family",
      url: "https://thehudsonfam.com",
    },
    about: {
      "@type": "Person",
      name: "Richard Hudson Sr.",
    },
    mainEntity: {
      "@type": "Person",
      name: "Richard Hudson Sr.",
    },
    interactionStatistic: {
      "@type": "InteractionCounter",
      interactionType: "https://schema.org/CommentAction",
      userInteractionCount: memoryCount,
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://thehudsonfam.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Richard Hudson Sr.",
          item: "https://thehudsonfam.com/richard-hudson-sr",
        },
      ],
    },
  };

  const imageGalleryJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: "Richard Hudson Sr. — Photos and Memories",
    description:
      "Photo gallery celebrating the life of Richard Hudson Sr.",
    url: "https://thehudsonfam.com/richard-hudson-sr",
    image: photos.map((p) => ({
      "@type": "ImageObject",
      url: p.src,
      description: p.alt,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(imageGalleryJsonLd),
        }}
      />
    </>
  );
}

export default async function RichardHudsonSrMemorialPage() {
  const memories = await prisma.memory.findMany({
    where: { approved: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <article itemScope itemType="https://schema.org/WebPage">
      <MemorialJsonLd memoryCount={memories.length} />

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-5xl mx-auto px-5 pt-4"
      >
        <ol
          className="flex items-center gap-2 text-xs text-text-dim"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          <li
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <Link
              href="/"
              itemProp="item"
              className="hover:text-muted-foreground transition-colors"
            >
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li className="text-border">/</li>
          <li
            itemProp="itemListElement"
            itemScope
            itemType="https://schema.org/ListItem"
          >
            <span itemProp="name" className="text-accent/70">
              Richard Hudson Sr.
            </span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <header className="relative overflow-hidden motion-safe:animate-fade-in-up">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/95 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--color-accent)_0%,_transparent_70%)] opacity-[0.04]" />
        <div className="relative max-w-3xl mx-auto text-center px-5 py-16 sm:py-24">
          <div className="size-20 rounded-full bg-linear-to-br/oklch from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mx-auto mb-8">
            <span className="text-3xl font-serif text-accent">R</span>
          </div>
          <p className="text-xs tracking-[5px] text-accent/80 uppercase mb-4 font-sans">
            In Loving Memory
          </p>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-serif text-foreground font-normal leading-tight mb-6 text-balance"
            itemProp="name"
          >
            Richard Hudson Sr.
          </h1>
          <div className="w-16 h-px bg-accent/40 mx-auto mb-6" />
          <p
            className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed italic text-pretty"
            itemProp="description"
          >
            A devoted father, a wise mentor, and a true friend to everyone he
            met. Richard Hudson Sr. filled every room with warmth, wisdom, and
            laughter. This page celebrates his life and the lasting impact he
            made on all who knew him.
          </p>
        </div>
      </header>

      <Separator />

      {/* About Richard Hudson Sr. — SEO content section */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-16">
        <h2 className="text-xs font-sans font-semibold tracking-[4px] text-primary uppercase text-center mb-8">
          About Richard Hudson Sr.
        </h2>
        <div className="prose prose-invert mx-auto text-muted-foreground text-sm sm:text-base leading-relaxed space-y-4 text-pretty">
          <p>
            Richard Hudson Sr. was a man who believed in the power of family,
            hard work, and kindness. Known to those closest to him simply as
            Richard, he spent his life building connections, lifting others up,
            and making sure everyone around him felt valued.
          </p>
          <p>
            Whether it was sharing stories over a cup of coffee, offering quiet
            words of encouragement, or showing up when it mattered most, Richard
            Hudson had a way of making people feel seen. His legacy lives on
            through his family, his friends, and every life he touched.
          </p>
          <p>
            This memorial page is maintained by the Hudson family as a place
            where friends, family, and loved ones can share their favorite
            memories of Richard Hudson Sr. and keep his spirit alive for
            generations to come.
          </p>
        </div>
      </section>

      <Separator />

      {/* Photo Gallery */}
      <section className="max-w-5xl mx-auto px-5 py-14 sm:py-20">
        <h2 className="text-xs font-sans font-semibold tracking-[4px] text-accent uppercase text-center mb-3">
          Photos of Richard Hudson Sr.
        </h2>
        <p className="text-text-dim text-sm text-center mb-10">
          Moments that capture the life and spirit of Richard Hudson Sr.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {photos.map((photo, i) => (
            <figure
              key={i}
              className={`relative overflow-hidden rounded-lg group ${photo.span} m-0`}
            >
              <div className="aspect-square">
                <img
                  src={photo.src}
                  alt={photo.alt}
                  className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 hover:brightness-110 hover:saturate-110"
                  loading={i < 4 ? "eager" : "lazy"}
                  width={i === 0 ? 600 : 400}
                  height={i === 0 ? 600 : 400}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
              <figcaption className="sr-only">{photo.alt}</figcaption>
            </figure>
          ))}
        </div>
        <p className="text-center text-text-dim text-xs mt-6 italic">
          Upload real family photos of Richard Hudson Sr. to personalize this
          tribute
        </p>
      </section>

      <Separator />

      {/* Video Section */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-20">
        <h2 className="text-xs font-sans font-semibold tracking-[4px] text-accent uppercase text-center mb-3">
          Video Tributes for Richard Hudson Sr.
        </h2>
        <p className="text-text-dim text-sm text-center mb-10">
          Watch and share video memories of Richard Hudson Sr.
        </p>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="aspect-video flex items-center justify-center bg-linear-to-br/oklch from-card to-background">
            <div className="text-center">
              <div className="size-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="size-6 text-accent ml-1"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <p className="text-muted-foreground text-sm">
                Video tributes for Richard Hudson Sr. coming soon
              </p>
              <p className="text-text-dim text-xs mt-1">
                Upload family videos to share here
              </p>
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Memories Section */}
      <section className="max-w-3xl mx-auto px-5 py-14 sm:py-20" id="memories">
        <h2 className="text-xs font-sans font-semibold tracking-[4px] text-accent uppercase text-center mb-3">
          Memories of Richard Hudson Sr.
        </h2>
        <p className="text-muted-foreground text-sm text-center mb-12 max-w-md mx-auto text-pretty">
          Share a memory, a story, or a few words about what Richard Hudson Sr.
          meant to you. Every memory helps keep his legacy alive.
        </p>

        {/* Memory Submission Form */}
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 mb-12" id="share">
          <h3 className="text-lg font-serif text-foreground mb-6 text-balance">
            Share a Memory of Richard Hudson Sr.
          </h3>
          <MemoryForm />
        </div>

        {/* Existing Memories */}
        {memories.length > 0 && (
          <div className="space-y-6" role="feed" aria-label="Shared memories of Richard Hudson Sr.">
            <p className="text-text-dim text-xs uppercase tracking-wider">
              {memories.length} {memories.length === 1 ? "memory" : "memories"}{" "}
              shared
            </p>
            {memories.map((memory) => (
              <article
                key={memory.id}
                className="bg-card/50 border border-border/60 rounded-xl p-6 transition-colors hover:border-accent/20"
                itemScope
                itemType="https://schema.org/Comment"
              >
                <blockquote
                  className="text-foreground text-sm sm:text-base leading-relaxed whitespace-pre-wrap mb-4"
                  itemProp="text"
                >
                  &ldquo;{memory.content}&rdquo;
                </blockquote>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-accent/10 text-accent text-xs font-semibold">
                      {memory.firstName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className="text-sm text-foreground font-medium"
                        itemProp="author"
                      >
                        {memory.firstName} {memory.lastName}
                      </p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent/10 text-accent border border-accent/20">
                        {memory.relationship}
                      </span>
                    </div>
                  </div>
                  <time
                    className="text-xs text-text-dim ml-auto"
                    dateTime={new Date(memory.createdAt).toISOString()}
                    itemProp="dateCreated"
                  >
                    {new Date(memory.createdAt).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </time>
                </div>
              </article>
            ))}
          </div>
        )}

        {memories.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm italic">
              Be the first to share a memory of Richard Hudson Sr.
            </p>
          </div>
        )}
      </section>

      {/* Closing */}
      <section className="border-t border-border">
        <div className="max-w-xl mx-auto text-center px-5 py-16">
          <div className="w-12 h-px bg-accent/40 mx-auto mb-6" />
          <p className="text-muted-foreground text-sm italic leading-relaxed">
            &ldquo;What we have once enjoyed we can never lose. All that we love
            deeply becomes a part of us.&rdquo;
          </p>
          <p className="text-text-dim text-xs mt-3">— Helen Keller</p>
          <div className="mt-8">
            <Link
              href="/"
              className="text-xs text-text-dim hover:text-accent transition-colors"
            >
              The Hudson Family — Dallas, Texas
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
