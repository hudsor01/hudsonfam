import Image from "next/image";
import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { Metadata } from "next";
import { MemoryForm } from "./memory-form";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

const SITE_URL = "https://thehudsonfam.com";

// Social/SEO image URLs must be absolute. DB photos may be stored as a
// relative /api/images/... path or as an absolute URL — normalize both.
function toAbsoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Serialize JSON-LD for inline <script> injection. JSON.stringify does NOT
// escape "</script>" or the unicode line separators, so DB-sourced strings
// (photo captions/URLs) could otherwise break out of the script tag (XSS).
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// Masonry span pattern applied by index so a DB-driven gallery keeps the
// same visual rhythm the old hardcoded gallery had.
const GALLERY_SPANS = [
  "col-span-2 row-span-2",
  "",
  "",
  "",
  "col-span-2",
  "",
  "",
  "",
];

async function getMemorialPhotos() {
  return prisma.memorialMedia.findMany({
    where: { type: "photo" },
    orderBy: { sortOrder: "asc" },
  });
}

export async function generateMetadata(): Promise<Metadata> {
  const photos = await getMemorialPhotos();
  const firstPhoto = photos[0];
  const ogImage = firstPhoto
    ? {
        url: toAbsoluteUrl(firstPhoto.url),
        alt: firstPhoto.caption || "In loving memory of Richard Hudson Sr.",
      }
    : undefined;

  return {
    title: "Richard Hudson Sr. — In Loving Memory",
    description:
      "Remembering Richard Wayne Hudson Sr. (1964–2025) — a devoted father, grandfather, and family man. View photos, watch tributes, and share your memories of Richard Hudson. A memorial tribute by the Hudson family in Dallas, Texas.",
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
        "A tribute to Richard Wayne Hudson Sr. — devoted father, grandfather, and family man. Share your memories and celebrate his life.",
      type: "profile",
      url: "https://thehudsonfam.com/richard-hudson-sr",
      siteName: "The Hudson Family",
      locale: "en_US",
      ...(ogImage && { images: [{ ...ogImage }] }),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: "Richard Hudson Sr. — In Loving Memory",
      description:
        "A tribute to Richard Hudson Sr. Share your memories and celebrate his life.",
      ...(ogImage && { images: [ogImage.url] }),
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  };
}

type MemorialPhoto = {
  id: string;
  url: string;
  caption: string | null;
};

// JSON-LD structured data for search engines
function MemorialJsonLd({
  memoryCount,
  photos,
}: {
  memoryCount: number;
  photos: MemorialPhoto[];
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Richard Hudson Sr.",
    alternateName: ["Richard Hudson", "Richard Wayne Hudson Sr.", "Richard Hudson Senior"],
    description:
      "Richard Wayne Hudson Sr. — a devoted father, grandfather, and family man whose life was defined by strength, perseverance, and deep love for his family.",
    url: "https://thehudsonfam.com/richard-hudson-sr",
    sameAs: [],
    familyName: "Hudson",
    givenName: "Richard",
    additionalName: "Wayne",
    honorificSuffix: "Sr.",
    birthDate: "1964-05-16",
    deathDate: "2025-12-28",
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

  // Only emit an ImageGallery once there are real photos — never describe an
  // empty gallery (or one built from stock imagery) to search engines.
  const imageGalleryJsonLd =
    photos.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: "Richard Hudson Sr. — Photos and Memories",
          description:
            "Photo gallery celebrating the life of Richard Hudson Sr.",
          url: "https://thehudsonfam.com/richard-hudson-sr",
          image: photos.map((p) => ({
            "@type": "ImageObject",
            url: toAbsoluteUrl(p.url),
            description: p.caption || "Photo of Richard Hudson Sr.",
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageJsonLd) }}
      />
      {imageGalleryJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd(imageGalleryJsonLd),
          }}
        />
      )}
    </>
  );
}

export default async function RichardHudsonSrMemorialPage() {
  await connection();
  const [memories, photos, videos] = await Promise.all([
    prisma.memory.findMany({
      where: { approved: true },
      orderBy: { createdAt: "desc" },
    }),
    getMemorialPhotos(),
    prisma.memorialMedia.findMany({
      where: { type: "video" },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  return (
    <article itemScope itemType="https://schema.org/WebPage">
      <MemorialJsonLd memoryCount={memories.length} photos={photos} />

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
          <p className="text-sm text-text-dim tracking-wide mb-5">
            May 16, 1964 &ndash; December 28, 2025
          </p>
          <p
            className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed italic text-pretty"
            itemProp="description"
          >
            A devoted father, grandfather, and family man, remembered for his
            strength, his perseverance, and the deep love he gave so freely to
            his family. This page celebrates his life and the lasting legacy he
            leaves through his children and grandchildren.
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
            Richard Wayne Hudson Sr., age 61, passed away on December 28, 2025,
            surrounded by love. Though our hearts are heavy with grief, we are
            thankful for the life he lived, the love he gave, and the memories
            that will forever remain with those who knew him.
          </p>
          <p>
            Richard was a devoted father, grandfather, and family man whose life
            was defined by strength, perseverance, and deep love for his family.
            He faced life with resilience and courage, and even in difficult
            seasons, his love for those around him never wavered. He had a way of
            making his presence known—not loudly, but steadily—and his family
            always knew they could count on him.
          </p>
          <p>
            Above all else, Richard loved his children and grandchildren with his
            whole heart. He was immensely proud of his family and found his
            greatest joy in watching them grow, succeed, and become who they were
            meant to be. His grandchildren were his pride and joy, and the love he
            poured into them will continue to live on through their lives.
          </p>

          <p className="text-foreground font-medium">
            Richard is survived by his children:
          </p>
          <ul className="not-prose space-y-3 my-2">
            {[
              "Ashley and Fernando Govea, and their children, Alondra Govea, Isabella Govea, and Domineek Govea.",
              "Richard Hudson Jr. and his better half Jirah Pigte.",
              "Wendy and Levi Hilton, and their children, Lively Hilton and Landry Hilton.",
              "Rick and Carmen Brown, and their children, Samantha Brown and Emily Brown.",
              "Tim and Kelley Brown, and their children, Jacob Brown and Katelyn Brown.",
              "Alicia Douglas, and her children, Shelby Douglas and Charleigh Douglas.",
            ].map((survivor) => (
              <li
                key={survivor}
                className="border-l-2 border-accent/30 pl-4 text-muted-foreground text-sm sm:text-base leading-relaxed"
              >
                {survivor}
              </li>
            ))}
          </ul>

          <p>
            In addition to his children and grandchildren, he is survived by his
            brothers and sisters: Jack and Vonda Hutchings, Greg and Belinda
            Luther, Ernie Hudson, and Carol and Mohammed Rahmani.
          </p>
          <p>
            He is also survived by his girlfriend, Sheri Davis, and her daughter,
            Trinity Dutton.
          </p>
          <p>
            Richard will be remembered for his strength, his heart for family,
            and the love he gave so freely. His legacy is one of devotion,
            resilience, and unconditional love—a legacy that will continue
            through each of his children and grandchildren.
          </p>
          <p>
            While we mourn his passing, we find peace and hope in knowing he is
            now whole, healed, and resting in eternal peace.
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
        {photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {photos.map((photo, i) => {
              const alt = photo.caption || "Photo of Richard Hudson Sr.";
              const span = GALLERY_SPANS[i % GALLERY_SPANS.length];
              return (
                <figure
                  key={photo.id}
                  className={`relative overflow-hidden rounded-lg group ${span} m-0`}
                >
                  <div className="aspect-square">
                    <Image
                      src={photo.url}
                      alt={alt}
                      className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 hover:brightness-110 hover:saturate-110"
                      loading={i < 4 ? "eager" : "lazy"}
                      width={span.includes("col-span-2") ? 600 : 400}
                      height={span.includes("row-span-2") ? 600 : 400}
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  {photo.caption && (
                    <figcaption className="sr-only">{photo.caption}</figcaption>
                  )}
                </figure>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="aspect-video flex items-center justify-center bg-linear-to-br/oklch from-card to-background">
              <div className="text-center px-6">
                <div className="size-16 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="size-6 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M6 6h.008v.008H6V6z M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z"
                    />
                  </svg>
                </div>
                <p className="text-muted-foreground text-sm">
                  No photos yet
                </p>
                <p className="text-text-dim text-xs mt-1">
                  Add family photos of Richard Hudson Sr. from the dashboard to
                  personalize this tribute
                </p>
              </div>
            </div>
          </div>
        )}
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
        {videos.length > 0 ? (
          <div className="space-y-6">
            {videos.map((video) => {
              const isEmbed = /youtube\.com\/embed|youtu\.be|player\.vimeo\.com|dailymotion\.com\/embed|loom\.com\/embed|wistia\.com\/medias/.test(video.url);
              return (
                <div key={video.id} className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="aspect-video">
                    {isEmbed ? (
                      <iframe
                        src={video.url}
                        title={video.caption || "Video tribute for Richard Hudson Sr."}
                        className="w-full h-full"
                        sandbox="allow-scripts allow-same-origin allow-presentation"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={video.url}
                        controls
                        preload="metadata"
                        className="w-full h-full object-contain bg-background"
                      >
                        <track kind="captions" />
                      </video>
                    )}
                  </div>
                  {video.caption && (
                    <div className="px-4 py-3 border-t border-border">
                      <p className="text-sm text-muted-foreground">{video.caption}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
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
                  No video tributes yet
                </p>
                <p className="text-text-dim text-xs mt-1">
                  Upload family videos from the dashboard to share here
                </p>
              </div>
            </div>
          </div>
        )}
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
            &ldquo;He will wipe every tear from their eyes. There will be no more
            death or mourning or crying or pain, for the old order of things has
            passed away.&rdquo;
          </p>
          <p className="text-text-dim text-xs mt-3">— Revelation 21:4</p>
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
