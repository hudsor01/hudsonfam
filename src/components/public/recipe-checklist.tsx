"use client";

import { useState, useEffect } from "react";

interface CheckState {
  ingredients: number[];
  steps: number[];
}

interface RecipeChecklistProps {
  slug: string;
  ingredients: string[];
  instructions: string[];
}

const STORAGE_KEY_PREFIX = "recipe-checks:";

function loadFromStorage(slug: string): CheckState {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${slug}`);
    if (!raw) return { ingredients: [], steps: [] };
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as CheckState).ingredients) ||
      !Array.isArray((parsed as CheckState).steps)
    ) {
      return { ingredients: [], steps: [] };
    }
    const state = parsed as CheckState;
    // Validate all entries are numbers
    const isNumbers = (arr: unknown[]): arr is number[] =>
      arr.every((v) => typeof v === "number");
    if (!isNumbers(state.ingredients) || !isNumbers(state.steps)) {
      return { ingredients: [], steps: [] };
    }
    return state;
  } catch {
    return { ingredients: [], steps: [] };
  }
}

function saveToStorage(slug: string, state: CheckState): void {
  try {
    if (state.ingredients.length === 0 && state.steps.length === 0) {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${slug}`);
    } else {
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${slug}`, JSON.stringify(state));
    }
  } catch {
    // Ignore storage errors (private browsing, quota exceeded)
  }
}

export function RecipeChecklist({ slug, ingredients, instructions }: RecipeChecklistProps) {
  interface Checked {
    ingredients: Set<number>;
    steps: Set<number>;
  }

  // Initialize empty — hydrated from localStorage in useEffect to avoid SSR mismatch
  // Both sets are in a single state object to prevent cascading renders in the effect.
  const [checked, setChecked] = useState<Checked>(() => ({
    ingredients: new Set<number>(),
    steps: new Set<number>(),
  }));
  const [hydrated, setHydrated] = useState(false);

  const { ingredients: checkedIngredients, steps: checkedSteps } = checked;

  // Hydrate from localStorage after mount only (SSR-safe).
  // Canonical pattern (mirrors menu-provider.tsx): state starts empty on the
  // server render, then a single setState call after mount hydrates from the
  // external system (localStorage). The `hydrated` flag gates the persist
  // effect below so this initial load doesn't immediately rewrite storage.
  // The react-hooks/set-state-in-effect rule is overly broad here — this is the
  // only valid approach for SSR-safe localStorage hydration.
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    const saved = loadFromStorage(slug);
    setChecked({
      ingredients: new Set(saved.ingredients),
      steps: new Set(saved.steps),
    });
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [slug]);

  // Persist on every change after hydration. Guarded by `hydrated` so the
  // post-mount load above doesn't trigger an immediate rewrite of storage.
  useEffect(() => {
    if (!hydrated) return;
    saveToStorage(slug, {
      ingredients: Array.from(checked.ingredients),
      steps: Array.from(checked.steps),
    });
  }, [checked, slug, hydrated]);

  function toggleIngredient(index: number) {
    setChecked((prev) => {
      const nextIngredients = new Set(prev.ingredients);
      if (nextIngredients.has(index)) {
        nextIngredients.delete(index);
      } else {
        nextIngredients.add(index);
      }
      return { ingredients: nextIngredients, steps: prev.steps };
    });
  }

  function toggleStep(index: number) {
    setChecked((prev) => {
      const nextSteps = new Set(prev.steps);
      if (nextSteps.has(index)) {
        nextSteps.delete(index);
      } else {
        nextSteps.add(index);
      }
      return { ingredients: prev.ingredients, steps: nextSteps };
    });
  }

  function resetAll() {
    // Persist effect (keyed on `checked`) writes the cleared state — which,
    // being empty, removes the storage key via saveToStorage's empty-state path.
    setChecked({ ingredients: new Set(), steps: new Set() });
  }

  const hasAnyChecked = checkedIngredients.size > 0 || checkedSteps.size > 0;

  return (
    <div className="flex flex-col gap-10">
      {ingredients.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif text-foreground font-normal mb-4">
            Ingredients
          </h2>
          <ul className="space-y-1" role="list">
            {ingredients.map((item, i) => {
              const checked = checkedIngredients.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleIngredient(i)}
                    className={[
                      "w-full text-left flex items-start gap-3 px-2 py-3 rounded-lg min-h-11",
                      "transition-colors cursor-pointer select-none",
                      "hover:bg-muted/40 active:bg-muted/60",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      checked ? "text-success" : "text-foreground",
                    ].join(" ")}
                  >
                    {/* Custom checkbox indicator */}
                    <span
                      aria-hidden="true"
                      className={[
                        "mt-0.5 shrink-0 flex items-center justify-center",
                        "w-6 h-6 rounded border-2 transition-colors",
                        checked
                          ? "border-success bg-success/20"
                          : "border-border bg-transparent",
                      ].join(" ")}
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 12 12"
                          className="w-3.5 h-3.5 text-success"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1.5,6 4.5,9 10.5,3" />
                        </svg>
                      )}
                    </span>
                    <span
                      className={[
                        "text-lg sm:text-xl leading-relaxed flex-1",
                        checked ? "line-through text-success/70" : "",
                      ].join(" ")}
                    >
                      {item}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {instructions.length > 0 && (
        <section>
          <h2 className="text-2xl font-serif text-foreground font-normal mb-4">
            Instructions
          </h2>
          <ol className="space-y-2" role="list">
            {instructions.map((step, i) => {
              const checked = checkedSteps.has(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={checked}
                    onClick={() => toggleStep(i)}
                    className={[
                      "w-full text-left flex items-start gap-3 px-2 py-3 rounded-lg min-h-11",
                      "transition-colors cursor-pointer select-none",
                      "hover:bg-muted/40 active:bg-muted/60",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      checked ? "text-success" : "text-foreground",
                    ].join(" ")}
                  >
                    {/* Step number indicator */}
                    <span
                      aria-hidden="true"
                      className={[
                        "shrink-0 flex items-center justify-center",
                        "w-7 h-7 rounded-full text-sm font-serif font-normal leading-none mt-0.5",
                        "border-2 transition-colors",
                        checked
                          ? "border-success bg-success/20 text-success"
                          : "border-border bg-transparent text-muted-foreground",
                      ].join(" ")}
                    >
                      {checked && (
                        <svg
                          viewBox="0 0 12 12"
                          className="w-3.5 h-3.5 text-success"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="1.5,6 4.5,9 10.5,3" />
                        </svg>
                      )}
                      {/* Step number — hidden on screen when checked (checkmark
                          shows instead), but always rendered so the print
                          stylesheet can re-show it as a plain numbered list. */}
                      <span
                        className={[
                          "print-step-number",
                          checked ? "hidden print:inline" : "",
                        ].join(" ")}
                      >
                        {i + 1}
                      </span>
                    </span>
                    <span
                      className={[
                        "text-lg sm:text-xl leading-relaxed flex-1",
                        checked ? "line-through text-success/70" : "",
                      ].join(" ")}
                    >
                      {step}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {ingredients.length === 0 && instructions.length === 0 && (
        <p className="text-lg text-muted-foreground italic">
          This recipe hasn&rsquo;t been typed up yet — the original page is
          shown below.
        </p>
      )}

      {/* Reset affordance — only shown when something is checked */}
      {hasAnyChecked && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={resetAll}
            className={[
              "min-h-11 px-4 py-2 rounded-lg text-sm font-medium",
              "border border-border text-muted-foreground",
              "hover:text-foreground hover:border-foreground/30",
              "transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            ].join(" ")}
          >
            Reset checks
          </button>
        </div>
      )}
    </div>
  );
}
