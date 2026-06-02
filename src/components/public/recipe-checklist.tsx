"use client";

import { useState, useEffect, useCallback } from "react";

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

  const { ingredients: checkedIngredients, steps: checkedSteps } = checked;

  // Hydrate from localStorage after mount only.
  // This is the canonical SSR-safe external-store sync pattern: state starts empty
  // (server render), then a single setState call after mount hydrates from the
  // external system (localStorage). The eslint-disable below is required because
  // the React Compiler rule flags all setState-in-effect; this use case is explicitly
  // valid per React docs ("Subscribe for updates from some external system").
  useEffect(() => {
    const saved = loadFromStorage(slug);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setChecked({
      ingredients: new Set(saved.ingredients),
      steps: new Set(saved.steps),
    });
  }, [slug]);

  const persist = useCallback(
    (ingredients: Set<number>, steps: Set<number>) => {
      saveToStorage(slug, {
        ingredients: Array.from(ingredients),
        steps: Array.from(steps),
      });
    },
    [slug]
  );

  function toggleIngredient(index: number) {
    // Compute next state outside the updater so the persist side effect stays
    // out of setState (updaters must be pure; StrictMode double-invokes them).
    const nextIngredients = new Set(checked.ingredients);
    if (nextIngredients.has(index)) {
      nextIngredients.delete(index);
    } else {
      nextIngredients.add(index);
    }
    setChecked({ ingredients: nextIngredients, steps: checked.steps });
    persist(nextIngredients, checked.steps);
  }

  function toggleStep(index: number) {
    // Compute next state outside the updater so the persist side effect stays
    // out of setState (updaters must be pure; StrictMode double-invokes them).
    const nextSteps = new Set(checked.steps);
    if (nextSteps.has(index)) {
      nextSteps.delete(index);
    } else {
      nextSteps.add(index);
    }
    setChecked({ ingredients: checked.ingredients, steps: nextSteps });
    persist(checked.ingredients, nextSteps);
  }

  function resetAll() {
    setChecked({ ingredients: new Set(), steps: new Set() });
    saveToStorage(slug, { ingredients: [], steps: [] });
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
                      {checked ? (
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
                      ) : (
                        <span>{i + 1}</span>
                      )}
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
