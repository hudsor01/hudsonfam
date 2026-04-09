"use client";

import { MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteButton } from "@/components/ui/delete-button";
import { useRouter } from "next/navigation";

interface PostRowActionsProps {
  postId: string;
  deleteAction: () => Promise<void>;
}

export function PostRowActions({ postId, deleteAction }: PostRowActionsProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="p-1.5 rounded-md text-text-dim hover:text-foreground hover:bg-background/50 transition-colors"
          aria-label="Post actions"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/dashboard/posts/${postId}`)}>
          <Pencil className="size-4 mr-2" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onSelect={(e) => e.preventDefault()}>
          <div>
            <DeleteButton
              action={deleteAction}
              title="Delete post?"
              description="This will permanently delete this blog post. This action cannot be undone."
              successMessage="Post deleted"
              label="Delete"
              className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors w-full"
            />
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
