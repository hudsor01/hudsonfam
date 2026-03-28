import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface FeaturedPostProps {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  tags: string[];
  coverImage?: string | null;
  readingTime: string;
}

export function FeaturedPost({
  slug,
  title,
  excerpt,
  date,
  author,
  tags,
  coverImage,
  readingTime,
}: FeaturedPostProps) {
  return (
    <article className="relative bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/10 group">
      {/* Full-card link using pseudo-element overlay */}
      <Link
        href={`/blog/${slug}`}
        className="absolute inset-0 z-0"
        aria-label={`Read: ${title}`}
      />

      {coverImage && (
        <div className="aspect-[21/9] bg-background overflow-hidden perspective-midrange">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105 group-hover:rotate-y-1"
          />
        </div>
      )}
      {!coverImage && (
        <div className="aspect-[21/9] bg-linear-to-br/oklch from-primary/10 to-accent/10 flex items-center justify-center">
          <span className="text-6xl font-serif text-primary/20">HF</span>
        </div>
      )}
      <div className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-xs text-text-dim font-sans">{date}</span>
          <span className="text-xs text-text-dim">&bull;</span>
          <span className="text-xs text-text-dim font-sans">{readingTime}</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-serif text-foreground mb-2 group-hover:text-primary transition-colors text-balance">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed mb-4 line-clamp-2 text-pretty">
          {excerpt}
        </p>
        <div className="flex items-center justify-between">
          <div className="relative z-10 flex gap-2 flex-wrap">
            {tags.slice(0, 3).map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge variant="primary" className="hover:bg-primary/25 transition-colors">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
          <span className="text-xs text-text-dim font-sans">{author}</span>
        </div>
      </div>
    </article>
  );
}
