import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface RecipeCardProps {
  slug: string;
  title: string;
  category: string;
  thumbnail?: string | null;
  isDraft?: boolean;
}

export function RecipeCard({
  slug,
  title,
  category,
  thumbnail,
  isDraft = false,
}: RecipeCardProps) {
  return (
    <article className="relative bg-card border border-border rounded-xl overflow-hidden h-full transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 group">
      <Link
        href={`/recipes/${slug}`}
        className="absolute inset-0 z-0"
        aria-label={`View recipe: ${title}`}
      />

      {thumbnail ? (
        <div className="aspect-[4/3] bg-background overflow-hidden">
          <Image
            src={thumbnail}
            alt={title}
            width={800}
            height={600}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
            unoptimized
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-linear-to-br/oklch from-primary/5 to-accent/5 flex items-center justify-center">
          <span className="text-4xl font-serif text-primary/15">HF</span>
        </div>
      )}

      <div className="p-4 sm:p-5">
        <h3 className="text-base font-serif text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2 text-balance">
          {title}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <Badge variant="primary">{category}</Badge>
          {isDraft && (
            <span className="text-xs text-warning italic">Needs review</span>
          )}
        </div>
      </div>
    </article>
  );
}
