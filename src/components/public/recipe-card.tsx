import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface RecipeCardProps {
  slug: string;
  title: string;
  category: string;
  isDraft?: boolean;
}

export function RecipeCard({
  slug,
  title,
  category,
  isDraft = false,
}: RecipeCardProps) {
  return (
    <article className="relative bg-card border border-border rounded-xl h-full p-5 sm:p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 group">
      <Link
        href={`/recipes/${slug}`}
        className="absolute inset-0 z-0"
        aria-label={`View recipe: ${title}`}
      />
      <h3 className="text-lg sm:text-xl font-serif text-foreground mb-3 group-hover:text-primary transition-colors text-balance">
        {title}
      </h3>
      <div className="flex items-center justify-between gap-2">
        <Badge variant="primary">{category}</Badge>
        {isDraft ? (
          <span className="text-xs text-warning italic">Needs review</span>
        ) : (
          <span className="text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
            View recipe &rarr;
          </span>
        )}
      </div>
    </article>
  );
}
