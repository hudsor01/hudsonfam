import Link from "next/link";
import { Badge } from "@/components/ui/badge";

interface PostCardProps {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  author: string;
  tags: string[];
  coverImage?: string | null;
  readingTime: string;
}

export function PostCard({
  slug,
  title,
  excerpt,
  date,
  author,
  tags,
  coverImage,
  readingTime,
}: PostCardProps) {
  return (
    <article className="relative bg-card border border-border rounded-xl overflow-hidden h-full transition-colors duration-200 hover:border-primary/30 group">
      {/* Full-card link using pseudo-element overlay */}
      <Link
        href={`/blog/${slug}`}
        className="absolute inset-0 z-0"
        aria-label={`Read: ${title}`}
      />

      {coverImage && (
        <div className="aspect-[16/9] bg-background overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      )}
      {!coverImage && (
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center">
          <span className="text-4xl font-serif text-primary/15">HF</span>
        </div>
      )}
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs text-text-dim">{date}</span>
          <span className="text-xs text-text-dim">&bull;</span>
          <span className="text-xs text-text-dim">{readingTime}</span>
        </div>
        <h3 className="text-base font-serif text-foreground mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>
        <p className="text-muted-foreground text-sm leading-relaxed mb-3 line-clamp-2">
          {excerpt}
        </p>
        <div className="flex items-center justify-between">
          <div className="relative z-10 flex gap-1.5 flex-wrap">
            {tags.slice(0, 2).map((tag) => (
              <Link
                key={tag}
                href={`/blog?tag=${encodeURIComponent(tag)}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Badge variant="default" className="hover:bg-primary/15 hover:text-primary hover:border-primary/25 transition-colors">
                  {tag}
                </Badge>
              </Link>
            ))}
          </div>
          <span className="text-xs text-text-dim">{author}</span>
        </div>
      </div>
    </article>
  );
}
