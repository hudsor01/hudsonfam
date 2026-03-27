"use client";

import { useState, useTransition } from "react";
import UpdateCard from "@/components/public/update-card";

interface Update {
  id: string;
  content: string;
  images: string[];
  postedByName: string;
  createdAt: string;
}

interface LoadMoreUpdatesProps {
  initialCursor: string;
  isAuthenticated: boolean;
}

export default function LoadMoreUpdates({
  initialCursor,
  isAuthenticated,
}: LoadMoreUpdatesProps) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [cursor, setCursor] = useState(initialCursor);
  const [hasMore, setHasMore] = useState(true);
  const [isPending, startTransition] = useTransition();

  async function loadMore() {
    startTransition(async () => {
      const params = new URLSearchParams({
        cursor,
        limit: "10",
      });
      if (!isAuthenticated) {
        params.set("visibility", "PUBLIC");
      }

      const response = await fetch(`/api/updates?${params.toString()}`);
      if (!response.ok) return;

      const data = await response.json();
      setUpdates((prev) => [...prev, ...data.updates]);
      setHasMore(data.hasMore);
      if (data.updates.length > 0) {
        setCursor(data.updates[data.updates.length - 1].id);
      }
    });
  }

  return (
    <>
      {/* Additional loaded updates */}
      {updates.length > 0 && (
        <div className="space-y-6 mt-6">
          {updates.map((update) => (
            <UpdateCard
              key={update.id}
              content={update.content}
              images={update.images}
              postedByName={update.postedByName}
              createdAt={new Date(update.createdAt)}
            />
          ))}
        </div>
      )}

      {/* Load more button */}
      {hasMore && (
        <div className="flex justify-center mt-8">
          <button
            onClick={loadMore}
            disabled={isPending}
            className="bg-surface border border-border rounded-lg px-6 py-2.5 text-sm text-text-muted hover:text-text hover:border-primary/40 transition-colors disabled:opacity-50"
          >
            {isPending ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </>
  );
}
