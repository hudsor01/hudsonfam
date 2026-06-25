import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored DiceUI Sortable registry files — upstream copied code that trips
    // the strict react-hooks compiler rules (mount-guard setState, ref-compose
    // memo). We don't hand-maintain these, so exempt them from lint.
    "src/components/ui/sortable.tsx",
    "src/lib/compose-refs.ts",
  ]),
]);

export default eslintConfig;
