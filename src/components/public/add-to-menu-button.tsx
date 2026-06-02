"use client";

import { memo } from "react";
import { useMenu } from "@/components/public/menu-provider";
import { Button } from "@/components/ui/button";

interface AddToMenuButtonProps {
  slug: string;
  title: string;
  category: string;
}

// Memoized: the recipes listing renders many of these. React.memo guards
// against parent-driven re-renders — props are primitives, so the component
// skips re-rendering when a parent re-renders without changing slug/title/
// category. It does NOT prevent re-renders triggered by useMenu(): when the
// menu context value changes, every consumer re-renders regardless of memo.
export const AddToMenuButton = memo(function AddToMenuButton({
  slug,
  title,
  category,
}: AddToMenuButtonProps) {
  const { has, add, remove } = useMenu();
  const inMenu = has(slug);

  const handleClick = () => {
    if (inMenu) {
      remove(slug);
    } else {
      add({ slug, title, category });
    }
  };

  return (
    <Button
      variant={inMenu ? "secondary" : "outline"}
      size="sm"
      onClick={handleClick}
      className="min-h-11 text-xs shrink-0"
      aria-label={inMenu ? `Remove ${title} from menu` : `Add ${title} to menu`}
      aria-pressed={inMenu}
    >
      {inMenu ? "In menu ✓" : "+ Add to menu"}
    </Button>
  );
});
