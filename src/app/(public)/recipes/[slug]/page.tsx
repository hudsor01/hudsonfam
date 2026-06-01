import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getRecipeBySlug, getAllRecipes } from "@/lib/recipes";
import { mdxComponents } from "@/components/public/mdx-components";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const recipes = await getAllRecipes();
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);
  if (!recipe) return { title: "Recipe Not Found" };

  const { frontmatter } = recipe;
  const description =
    frontmatter.sourceNote ||
    `${frontmatter.title} — a recipe from ${frontmatter.contributor}, preserved in the Hudson Recipes collection.`;

  return {
    title: `${frontmatter.title} | Hudson Recipes`,
    description,
    openGraph: {
      title: frontmatter.title,
      description,
      type: "article",
    },
    twitter: {
      card: "summary",
      title: frontmatter.title,
      description,
    },
  };
}

export default async function RecipePage({ params }: PageProps) {
  const { slug } = await params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  const { frontmatter, content } = recipe;
  const {
    title,
    category,
    contributor,
    sourceNote,
    servings,
    prepTime,
    cookTime,
    ingredients,
    instructions,
    status,
    reviewNotes,
  } = frontmatter;

  // schema.org Recipe JSON-LD — built from frontmatter for SEO + preservation.
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: title,
    recipeCategory: category,
    author: { "@type": "Person", name: contributor },
    datePublished: frontmatter.dateAdded,
    ...(sourceNote ? { description: sourceNote } : {}),
    ...(servings ? { recipeYield: servings } : {}),
    ...(prepTime ? { prepTime } : {}),
    ...(cookTime ? { cookTime } : {}),
    ...(ingredients.length > 0 ? { recipeIngredient: ingredients } : {}),
    ...(instructions.length > 0
      ? {
          recipeInstructions: instructions.map((step, i) => ({
            "@type": "HowToStep",
            position: i + 1,
            text: step,
          })),
        }
      : {}),
  };

  const hasMeta = Boolean(servings || prepTime || cookTime);

  return (
    <article className="max-w-3xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
      {/* JSON-LD for SEO / preservation */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Draft review banner — only ever rendered in dev (drafts 404 in prod). */}
      {status === "draft" && (
        <div className="mb-8 rounded-xl border border-warning/50 bg-warning/10 p-5">
          <p className="text-sm font-semibold text-warning mb-1">
            Draft — needs review
          </p>
          <p className="text-sm text-muted-foreground text-pretty">
            Verify this transcription against the book, then set{" "}
            <code>status: published</code> in the recipe&rsquo;s frontmatter.
          </p>
          {reviewNotes.length > 0 && (
            <ul className="list-disc list-inside mt-3 space-y-1 text-sm text-foreground">
              {reviewNotes.map((note, i) => (
                <li key={i} className="leading-relaxed">{note}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Back link */}
      <Link
        href="/recipes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Back to Hudson Recipes
      </Link>

      {/* Recipe header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Badge variant="primary">{category}</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-normal mb-3 text-balance">
          {title}
        </h1>
        <p className="text-muted-foreground text-pretty">
          From {contributor}
        </p>
        {sourceNote && (
          <p className="text-muted-foreground text-sm italic mt-1 text-pretty">
            {sourceNote}
          </p>
        )}
        {hasMeta && (
          <dl className="flex flex-wrap gap-x-8 gap-y-2 mt-4 pt-4 border-t border-border text-sm">
            {prepTime && (
              <div>
                <dt className="text-text-dim text-xs uppercase tracking-wide">
                  Prep
                </dt>
                <dd className="text-foreground">{prepTime}</dd>
              </div>
            )}
            {cookTime && (
              <div>
                <dt className="text-text-dim text-xs uppercase tracking-wide">
                  Cook
                </dt>
                <dd className="text-foreground">{cookTime}</dd>
              </div>
            )}
            {servings && (
              <div>
                <dt className="text-text-dim text-xs uppercase tracking-wide">
                  Servings
                </dt>
                <dd className="text-foreground">{servings}</dd>
              </div>
            )}
          </dl>
        )}
      </header>

      {/* The recipe itself — large, clear, easy to read first */}
      <div className="flex flex-col gap-10">
        {ingredients.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif text-foreground font-normal mb-4">
              Ingredients
            </h2>
            <ul className="list-disc marker:text-primary pl-6 text-foreground text-lg sm:text-xl leading-relaxed space-y-2.5">
              {ingredients.map((item, i) => (
                <li key={i} className="pl-1">{item}</li>
              ))}
            </ul>
          </section>
        )}

        {instructions.length > 0 && (
          <section>
            <h2 className="text-2xl font-serif text-foreground font-normal mb-4">
              Instructions
            </h2>
            <ol className="list-decimal marker:text-primary marker:font-serif pl-6 text-foreground text-lg sm:text-xl leading-relaxed space-y-5">
              {instructions.map((step, i) => (
                <li key={i} className="pl-2">{step}</li>
              ))}
            </ol>
          </section>
        )}

        {ingredients.length === 0 && instructions.length === 0 && (
          <p className="text-lg text-muted-foreground italic">
            This recipe hasn&rsquo;t been typed up yet — the original page is
            shown below.
          </p>
        )}
      </div>

      {/* Story / notes */}
      {content.trim().length > 0 && (
        <div className="prose-navy mt-12 pt-8 border-t border-border">
          <MDXRemote
            source={content}
            components={mdxComponents}
            options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
          />
        </div>
      )}

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t border-border">
        <div className="flex items-center justify-between">
          <Link
            href="/recipes"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            &larr; Back to Hudson Recipes
          </Link>
          <p className="text-xs text-text-dim">
            Preserved from {contributor}
          </p>
        </div>
      </footer>
    </article>
  );
}
