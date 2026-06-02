"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface MenuItem {
  slug: string;
  title: string;
  category: string;
}

interface MenuContextValue {
  items: MenuItem[];
  add: (item: MenuItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
  has: (slug: string) => boolean;
  count: number;
}

const STORAGE_KEY = "hudson-menu";

function loadFromStorage(): MenuItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate shape: each entry must have string slug, title, category
    const valid = parsed.filter(
      (item): item is MenuItem =>
        item !== null &&
        typeof item === "object" &&
        typeof item.slug === "string" &&
        item.slug.length > 0 &&
        typeof item.title === "string" &&
        typeof item.category === "string"
    );
    return valid;
  } catch {
    return [];
  }
}

const MenuContext = createContext<MenuContextValue | null>(null);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  // Always empty on server; hydrated in useEffect to avoid SSR hydration mismatch.
  const [items, setItems] = useState<MenuItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage after first mount only (SSR-safe).
  useEffect(() => {
    setItems(loadFromStorage());
    setHydrated(true);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Storage write failure (private mode quota exceeded etc.) — silently ignore.
    }
  }, [items, hydrated]);

  const add = useCallback((item: MenuItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.slug === item.slug)) return prev;
      return [...prev, item];
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((i) => i.slug !== slug));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
  }, []);

  const has = useCallback(
    (slug: string) => items.some((i) => i.slug === slug),
    [items]
  );

  return (
    <MenuContext.Provider
      value={{ items, add, remove, clear, has, count: items.length }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return ctx;
}
