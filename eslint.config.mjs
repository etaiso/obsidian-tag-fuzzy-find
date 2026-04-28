import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";

export default defineConfig([
  ...obsidianmd.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { project: "./tsconfig.json" },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // Tests and scripts aren't part of the published plugin bundle, so the
    // Obsidian-specific rules don't apply.
    ignores: ["tests/**", "scripts/**", "main.js", "node_modules/**"],
  },
]);
