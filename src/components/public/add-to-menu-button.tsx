"use client";

import { useMenu } from "@/components/public/menu-provider";
import { Button } from "@/components/ui/button";

interface AddToMenuButtonProps {
  slug: string;
  title: string;
  category: string;
}

export function AddToMenuButton({ slug, title, category }: AddToMenuButtonProps) {
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
}
