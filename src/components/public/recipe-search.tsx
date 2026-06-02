"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import type { RecipeIndexEntry } from "@/lib/recipes";

interface RecipeSearchProps {
  index: RecipeIndexEntry[];
}

export function RecipeSearch({ index }: RecipeSearchProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  // Cmd/Ctrl+K toggles the dialog
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleSelect(slug: string) {
    router.push(`/recipes/${slug}`);
    setOpen(false);
  }

  return (
    <>
      {/* Visible trigger button — real <button> element, focusable, labeled */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-colors min-h-11 w-full sm:w-auto sm:max-w-xs"
        aria-label="Search recipes"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
        <span className="flex-1 text-left">Search recipes</span>
        <CommandShortcut>⌘K</CommandShortcut>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search Recipes"
        description="Find a recipe by name or category"
      >
        <CommandInput placeholder="Search by name or category…" />
        <CommandList>
          <CommandEmpty>No recipes found.</CommandEmpty>
          <CommandGroup heading="Recipes">
            {index.map((entry) => (
              <CommandItem
                key={entry.slug}
                value={`${entry.title} ${entry.category} ${entry.slug}`}
                onSelect={() => handleSelect(entry.slug)}
                className="flex items-center justify-between gap-4 py-3 cursor-pointer"
              >
                <span className="text-foreground">{entry.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {entry.category}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
