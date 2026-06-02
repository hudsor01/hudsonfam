"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

// Stable no-op subscribe — `mounted` never changes after the first client
// render, so there is nothing to subscribe to.
const subscribe = () => () => {};

/**
 * Detect client mount without calling setState inside an effect.
 * Server + first client render return `false`; subsequent client renders
 * return `true`. This avoids next-themes' hydration mismatch while staying
 * clean under React Compiler's set-state-in-effect lint rule.
 */
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true, // client snapshot
    () => false, // server snapshot
  );
}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();

  // Until mounted, render a stable, same-sized placeholder to avoid a
  // hydration mismatch (next-themes resolves the active theme client-side).
  if (!mounted) {
    return (
      <span
        className="inline-flex size-11 items-center justify-center"
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="inline-flex size-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {isDark ? (
        <Sun className="size-5" aria-hidden="true" />
      ) : (
        <Moon className="size-5" aria-hidden="true" />
      )}
    </button>
  );
}
