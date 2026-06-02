import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { getRecipeBySlug, getAllRecipes, getChapterNeighbors, anchor } from "@/lib/recipes";
import { mdxComponents } from "@/components/public/mdx-components";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
    `${frontmatter.title}, from Grandma Hudson's Recipes.`;

  return {
    title: `${frontmatter.title} | Grandma Hudson's Recipes`,
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
  const [recipe, neighbors] = await Promise.all([
    getRecipeBySlug(slug),
    getChapterNeighbors(slug),
  ]);

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

  const hasMeta = Boolean(servings || prepTime || cookTime);

  return (
    <article className="max-w-3xl mx-auto px-5 sm:px-7 py-10 sm:py-14">
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

      {/* Breadcrumbs: Recipes › Category › Recipe */}
      <Breadcrumb className="mb-8">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/recipes">Recipes</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/recipes#${anchor(category)}`}>
              {category}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{title}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Recipe header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Badge variant="primary">{category}</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-serif text-foreground font-normal mb-3 text-balance">
          {title}
        </h1>
        {contributor && (
          <p className="text-muted-foreground text-pretty">From {contributor}</p>
        )}
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

      {/* Footer: prev/next chapter navigation + back link */}
      <footer className="mt-12 pt-6 border-t border-border space-y-6">
        {/* Chapter prev/next — only rendered when neighbors exist */}
        {(neighbors.prev || neighbors.next) && (
          <nav
            aria-label="Chapter navigation"
            className="flex items-stretch justify-between gap-4"
          >
            {neighbors.prev ? (
              <Link
                href={`/recipes/${neighbors.prev.slug}`}
                className="flex-1 inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors min-h-11"
              >
                <span aria-hidden="true" className="shrink-0">&larr;</span>
                <span className="line-clamp-1">{neighbors.prev.title}</span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
            {neighbors.next ? (
              <Link
                href={`/recipes/${neighbors.next.slug}`}
                className="flex-1 inline-flex items-center justify-end gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground hover:border-primary/40 hover:text-primary transition-colors min-h-11 text-right"
              >
                <span className="line-clamp-1">{neighbors.next.title}</span>
                <span aria-hidden="true" className="shrink-0">&rarr;</span>
              </Link>
            ) : (
              <div className="flex-1" />
            )}
          </nav>
        )}

        <div className="flex items-center justify-between">
          <Link
            href="/recipes"
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            &larr; Back to Grandma Hudson&rsquo;s Recipes
          </Link>
          <p className="text-xs text-text-dim">
            {contributor ? `Preserved from ${contributor}` : "Grandma Hudson's Recipes"}
          </p>
        </div>
      </footer>
    </article>
  );
}
