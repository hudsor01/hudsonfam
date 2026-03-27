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
    <Link href={`/blog/${slug}`} className="block group">
      <article className="bg-surface border border-border rounded-xl overflow-hidden transition-colors duration-200 hover:border-primary/30">
        {coverImage && (
          <div className="aspect-[21/9] bg-bg overflow-hidden">
            <img
              src={coverImage}
              alt={title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
        )}
        {!coverImage && (
          <div className="aspect-[21/9] bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
            <span className="text-6xl font-serif text-primary/20">HF</span>
          </div>
        )}
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xs text-text-dim font-sans">{date}</span>
            <span className="text-xs text-text-dim">&bull;</span>
            <span className="text-xs text-text-dim font-sans">{readingTime}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif text-text mb-2 group-hover:text-primary transition-colors">
            {title}
          </h2>
          <p className="text-text-muted text-sm leading-relaxed mb-4 line-clamp-2">
            {excerpt}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="primary">
                  {tag}
                </Badge>
              ))}
            </div>
            <span className="text-xs text-text-dim font-sans">{author}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
