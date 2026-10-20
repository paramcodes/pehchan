import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

const dbLayerMessage =
  "The database layer is off limits here. Read it through a server action in src/app/actions or the chat route handler.";

const dbImportPatterns = ["@/db/*", "**/db", "**/db/*", "../db/*", "../../db/*"];

function boundary(files) {
  return {
    files,
    languageOptions: {
      parser: tseslint.parser,
      sourceType: "module",
    },
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@/db", message: dbLayerMessage }],
          patterns: [{ group: dbImportPatterns, message: dbLayerMessage }],
        },
      ],
    },
  };
}

export default defineConfig([
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "drizzle/**", "coverage/**"]),
  boundary(["src/domain/**/*.ts"]),
  boundary(["src/components/**/*.ts", "src/components/**/*.tsx"]),
  boundary(["src/app/**/page.tsx"]),
]);
