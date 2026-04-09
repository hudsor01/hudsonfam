import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UpdateCardProps {
  content: string;
  images: string[];
  postedByName: string;
  createdAt: Date;
}

/**
 * Format a relative timestamp (e.g., "2 hours ago", "3 days ago", "March 15, 2026").
 */
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function UpdateCard({
  content,
  images,
  postedByName,
  createdAt,
}: UpdateCardProps) {
  return (
    <article className="bg-card border border-border rounded-xl p-5">
      {/* Author and timestamp */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="flex-shrink-0">
          <AvatarFallback>{postedByName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <span className="text-foreground text-sm font-medium">
            {postedByName}
          </span>
          <span className="text-text-dim text-xs ml-2">
            {formatRelativeTime(createdAt)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      {/* Images */}
      {images.length > 0 && (
        <div
          className={`mt-4 gap-2 ${
            images.length === 1
              ? "grid grid-cols-1"
              : images.length === 2
                ? "grid grid-cols-2"
                : "grid grid-cols-2 sm:grid-cols-3"
          }`}
        >
          {images.map((imageId, index) => (
            <div
              key={index}
              className={`rounded-lg overflow-hidden bg-background ${
                images.length === 1
                  ? "max-h-96"
                  : "aspect-square"
              }`}
            >
              <Image
                src={`/api/images/${imageId}?size=medium`}
                alt={`Image ${index + 1}`}
                width={400}
                height={300}
                className="w-full h-full object-cover"
                loading="lazy"
                unoptimized
              />
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
