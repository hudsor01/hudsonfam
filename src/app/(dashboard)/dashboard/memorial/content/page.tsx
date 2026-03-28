export const dynamic = "force-dynamic";

import prisma from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { SectionHeader } from "@/components/ui/section-header";
import { DashboardBreadcrumbs } from "@/components/dashboard/breadcrumbs";
import { ContentSectionForm } from "./content-form";

const DEFAULTS: Record<string, string> = {
  hero_subtitle:
    "A devoted father, a wise mentor, and a true friend to everyone he met. Richard Hudson Sr. filled every room with warmth, wisdom, and laughter. This page celebrates his life and the lasting impact he made on all who knew him.",
  about_text:
    "Richard Hudson Sr. was a man who believed in the power of family, hard work, and kindness. Known to those closest to him simply as Richard, he spent his life building connections, lifting others up, and making sure everyone around him felt valued.\n\nWhether it was sharing stories over a cup of coffee, offering quiet words of encouragement, or showing up when it mattered most, Richard Hudson had a way of making people feel seen. His legacy lives on through his family, his friends, and every life he touched.\n\nThis memorial page is maintained by the Hudson family as a place where friends, family, and loved ones can share their favorite memories of Richard Hudson Sr. and keep his spirit alive for generations to come.",
  closing_quote:
    '"What we have once enjoyed we can never lose. All that we love deeply becomes a part of us." — Helen Keller',
};

const SECTIONS = [
  {
    section: "hero_subtitle",
    label: "Hero Subtitle",
    description:
      "The italic description text that appears below the memorial title on the hero section.",
    rows: 4,
  },
  {
    section: "about_text",
    label: "About Section",
    description:
      'The main body text in the "About Richard Hudson Sr." section. Use line breaks to separate paragraphs.',
    rows: 8,
  },
  {
    section: "closing_quote",
    label: "Closing Quote",
    description:
      "The quote displayed at the bottom of the memorial page. Include the attribution.",
    rows: 3,
  },
];

export default async function MemorialContentPage() {
  await requireRole(["owner"]);

  const contentRecords = await prisma.memorialContent.findMany();
  const contentMap = new Map(contentRecords.map((c) => [c.section, c.content]));

  return (
    <div>
      <DashboardBreadcrumbs items={[{ label: "Memorial", href: "/dashboard/memorial" }, { label: "Content" }]} />
      <SectionHeader
        title="Page Content"
        subtitle="Edit the text sections of the memorial page"
        action={{ text: "Back to Memorial", href: "/dashboard/memorial" }}
      />

      <div className="mt-6 space-y-6">
        {SECTIONS.map((s) => (
          <ContentSectionForm
            key={s.section}
            section={s.section}
            label={s.label}
            description={s.description}
            currentContent={contentMap.get(s.section) || DEFAULTS[s.section] || ""}
            rows={s.rows}
          />
        ))}
      </div>

      <div className="mt-6 bg-card/50 border border-border rounded-xl px-5 py-4">
        <p className="text-xs text-text-dim">
          Changes are saved individually per section. The memorial page will update automatically
          after saving. If a section has no saved content, the default text will be used.
        </p>
      </div>
    </div>
  );
}
