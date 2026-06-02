"use client";

import { memo } from "react";
import { useMenu } from "@/components/public/menu-provider";
import { Button } from "@/components/ui/button";

interface AddToMenuButtonProps {
  slug: string;
  title: string;
  category: string;
}

// Memoized: the recipes listing renders ~1000 of these. Props are primitives,
// so React.memo prevents re-render unless slug/title/category actually change.
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
