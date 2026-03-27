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
    <Link href={`/blog/${slug}`} className="block group">
      <article className="bg-surface border border-border rounded-xl overflow-hidden h-full transition-colors duration-200 hover:border-primary/30">
        {coverImage && (
          <div className="aspect-[16/9] bg-bg overflow-hidden">
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
          <h3 className="text-base font-serif text-text mb-1.5 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
          <p className="text-text-muted text-sm leading-relaxed mb-3 line-clamp-2">
            {excerpt}
          </p>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 flex-wrap">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="default">
                  {tag}
                </Badge>
              ))}
            </div>
            <span className="text-xs text-text-dim">{author}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
