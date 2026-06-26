import Image from "next/image";
import { cache } from "react";
import prisma from "@/lib/prisma";
import { connection } from "next/server";
import { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://thehudsonfam.com";

// Social/SEO image URLs must be absolute. DB photos may be stored as a
// relative /api/images/... path or as an absolute URL — normalize both.
function toAbsoluteUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

// Serialize JSON-LD for inline <script> injection. JSON.stringify does NOT
// escape "</script>" or the unicode line separators, so DB-sourced strings
// could otherwise break out of the script tag (XSS).
function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

// cache() dedupes the query across generateMetadata() and the page render
// within a single request. The first photo is the hero portrait.
const getMemorialPhotos = cache(async () =>
  prisma.collectionPhoto.findMany({
    where: { collection: { slug: "memorial" } },
    include: { photo: true },
    orderBy: { sortOrder: "asc" },
  })
);

export async function generateMetadata(): Promise<Metadata> {
  const photos = await getMemorialPhotos();
  const firstCp = photos[0];
  const ogImage = firstCp
    ? {
        url: toAbsoluteUrl(`/api/images/${firstCp.photo.id}?size=medium`),
        alt: firstCp.caption ?? firstCp.photo.caption ?? "In loving memory of Richard Hudson Sr.",
      }
    : undefined;

  return {
    title: "Richard Hudson Sr. — In Loving Memory",
    description:
      "Remembering Richard Wayne Hudson Sr. (1964–2025) — a devoted father, grandfather, and family man. A memorial tribute by the Hudson family in Dallas, Texas.",
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
        "A tribute to Richard Wayne Hudson Sr. — devoted father, grandfather, and family man. Celebrating his life and legacy.",
      type: "profile",
      url: "https://thehudsonfam.com/richard-hudson-sr",
      siteName: "The Hudson Family",
      locale: "en_US",
      ...(ogImage && { images: [{ ...ogImage }] }),
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title: "Richard Hudson Sr. — In Loving Memory",
      description: "A tribute to Richard Hudson Sr. — celebrating his life and legacy.",
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

// His children and their families.
const SURVIVORS: { name: string; detail?: string }[] = [
  { name: "Ashley & Fernando Govea", detail: "Alondra, Isabella & Domineek Govea" },
  { name: "Richard Hudson Jr. & Jirah Pigte" },
  { name: "Wendy & Levi Hilton", detail: "Lively & Landry Hilton" },
  { name: "Rick & Carmen Brown", detail: "Samantha & Emily Brown" },
  { name: "Tim & Kelley Brown", detail: "Jacob & Katelyn Brown" },
  { name: "Alicia Douglas", detail: "Shelby & Charleigh Douglas" },
];

// JSON-LD structured data for search engines.
function MemorialJsonLd() {
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
      "Memorial tribute page celebrating the life of Richard Hudson Sr.",
    url: "https://thehudsonfam.com/richard-hudson-sr",
    isPartOf: {
      "@type": "WebSite",
      name: "The Hudson Family",
      url: "https://thehudsonfam.com",
    },
    about: { "@type": "Person", name: "Richard Hudson Sr." },
    mainEntity: { "@type": "Person", name: "Richard Hudson Sr." },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://thehudsonfam.com" },
        { "@type": "ListItem", position: 2, name: "Richard Hudson Sr.", item: "https://thehudsonfam.com/richard-hudson-sr" },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(webPageJsonLd) }} />
    </>
  );
}

export default async function RichardHudsonSrMemorialPage() {
  await connection();
  const photos = await getMemorialPhotos();
  const heroPhoto = photos[0] ?? null;

  return (
    <article itemScope itemType="https://schema.org/WebPage">
      <MemorialJsonLd />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="max-w-5xl mx-auto px-6 sm:px-10 pt-4">
        <ol
          className="flex items-center gap-2 text-xs text-text-dim"
          itemScope
          itemType="https://schema.org/BreadcrumbList"
        >
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <Link href="/" itemProp="item" className="hover:text-muted-foreground transition-colors">
              <span itemProp="name">Home</span>
            </Link>
            <meta itemProp="position" content="1" />
          </li>
          <li className="text-border">/</li>
          <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
            <span itemProp="name" className="text-accent/70">Richard Hudson Sr.</span>
            <meta itemProp="position" content="2" />
          </li>
        </ol>
      </nav>

      {/* Hero — portrait + name, side by side (stacks on mobile). The photo is
          a 3:4 portrait, so it's shown in full (no crop) rather than cropped
          into a banner. */}
      <header className="motion-safe:animate-fade-in-up max-w-5xl mx-auto px-6 sm:px-10 pt-8 sm:pt-12 pb-2">
        {heroPhoto ? (
          <div className="grid grid-cols-1 sm:grid-cols-[300px_1fr] lg:grid-cols-[380px_1fr] gap-8 sm:gap-10 lg:gap-14 items-center">
            {/* Portrait — full photo, no crop */}
            <div className="relative w-full max-w-[320px] sm:max-w-none mx-auto aspect-[3/4] rounded-2xl overflow-hidden shadow-[0_28px_70px_-34px_rgba(67,52,42,0.55)] ring-1 ring-border/60">
              <Image
                src={`/api/images/${heroPhoto.photo.id}?size=medium`}
                alt="Richard Hudson Sr."
                fill
                priority
                unoptimized
                sizes="(min-width: 1024px) 380px, (min-width: 640px) 300px, 320px"
                className="object-cover"
              />
            </div>
            {/* Name */}
            <div className="text-center sm:text-left">
              <p className="text-xs tracking-[5px] uppercase text-accent font-sans mb-4">
                In Loving Memory
              </p>
              <h1
                className="font-serif text-4xl sm:text-5xl lg:text-6xl text-foreground font-normal leading-[1.05] text-balance"
                itemProp="name"
              >
                Richard Hudson Sr.
              </h1>
              <p className="mt-4 text-sm tracking-wide text-muted-foreground">
                May 16, 1964 &ndash; December 28, 2025
              </p>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden">
            <div className="relative max-w-3xl mx-auto text-center px-5 py-16 sm:py-24">
              <div className="size-20 rounded-full bg-linear-to-br/oklch from-accent/20 to-accent/5 border border-accent/20 flex items-center justify-center mx-auto mb-8">
                <span className="text-3xl font-serif text-accent">R</span>
              </div>
              <p className="text-xs tracking-[5px] text-accent/80 uppercase mb-4 font-sans">
                In Loving Memory
              </p>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-serif text-foreground font-normal leading-tight mb-4 text-balance"
                itemProp="name"
              >
                Richard Hudson Sr.
              </h1>
              <p className="text-sm text-text-dim tracking-wide">
                May 16, 1964 &ndash; December 28, 2025
              </p>
            </div>
          </div>
        )}
      </header>

      {/* Body — obituary (left) + survivors card (right) */}
      <section className="max-w-5xl mx-auto px-6 sm:px-10 py-14 sm:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-12 lg:gap-14">
          {/* Obituary */}
          <div>
            <h2 className="text-xs font-sans font-semibold tracking-[4px] text-primary uppercase mb-7">
              About Richard Hudson Sr.
            </h2>
            <div className="space-y-4 text-pretty">
              <p
                className="text-foreground/90 italic text-base sm:text-lg leading-relaxed"
                itemProp="description"
              >
                A devoted father, grandfather, and family man, remembered for his
                strength, his perseverance, and the deep love he gave so freely to
                his family.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Richard Wayne Hudson Sr., age 61, passed away on December 28, 2025,
                surrounded by love. Though our hearts are heavy with grief, we are
                thankful for the life he lived, the love he gave, and the memories
                that will forever remain with those who knew him.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Richard was a devoted father, grandfather, and family man whose life
                was defined by strength, perseverance, and deep love for his family.
                He faced life with resilience and courage, and even in difficult
                seasons, his love for those around him never wavered. He had a way of
                making his presence known—not loudly, but steadily—and his family
                always knew they could count on him.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Above all else, Richard loved his children and grandchildren with his
                whole heart. He was immensely proud of his family and found his
                greatest joy in watching them grow, succeed, and become who they were
                meant to be. His grandchildren were his pride and joy, and the love he
                poured into them will continue to live on through their lives.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                In addition to his children and grandchildren, he is survived by his
                brothers and sisters: Jack and Vonda Hutchings, Greg and Belinda
                Luther, Ernie Hudson, and Carol and Mohammed Rahmani. He is also
                survived by his girlfriend, Sheri Davis, and her daughter, Trinity
                Dutton.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Richard will be remembered for his strength, his heart for family, and
                the love he gave so freely. His legacy is one of devotion, resilience,
                and unconditional love—a legacy that will continue through each of his
                children and grandchildren. While we mourn his passing, we find peace
                and hope in knowing he is now whole, healed, and resting in eternal
                peace.
              </p>
            </div>
          </div>

          {/* Survived by his children */}
          <aside>
            <div className="lg:sticky lg:top-8 bg-card border border-border rounded-2xl p-6 shadow-[0_16px_40px_-28px_rgba(67,52,42,0.4)]">
              <h2 className="text-xs font-sans font-semibold tracking-[4px] text-primary uppercase mb-5">
                Survived by his children
              </h2>
              <ul className="space-y-3.5">
                {SURVIVORS.map((s) => (
                  <li
                    key={s.name}
                    className="border-l-2 border-accent/40 pl-4 text-sm leading-relaxed"
                  >
                    <span className="text-foreground font-medium">{s.name}</span>
                    {s.detail && (
                      <span className="text-muted-foreground"> — {s.detail}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {/* Scripture — full-width band */}
      <section className="bg-accent/10 border-t border-border">
        <div className="max-w-3xl mx-auto px-6 py-14 sm:py-16 text-center">
          <p className="font-serif italic text-foreground text-xl sm:text-2xl leading-relaxed text-balance">
            &ldquo;He will wipe every tear from their eyes. There will be no more
            death or mourning or crying or pain, for the old order of things has
            passed away.&rdquo;
          </p>
          <p className="mt-5 text-xs tracking-[2px] uppercase text-primary font-semibold">
            Revelation 21:4
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border">
        <div className="max-w-xl mx-auto text-center px-5 py-10">
          <Link
            href="/"
            className="text-xs text-text-dim hover:text-accent transition-colors"
          >
            The Hudson Family — Dallas, Texas
          </Link>
        </div>
      </footer>
    </article>
  );
}
