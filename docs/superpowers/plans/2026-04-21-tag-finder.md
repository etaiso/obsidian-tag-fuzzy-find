# Tag Finder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship v1 of the Tag Finder plugin per spec `docs/superpowers/specs/2026-04-21-tag-finder-design.md` — a two-step modal that lets an Obsidian user fuzzy-find a tag, then drill into the notes carrying that tag.

**Architecture:** Single-plugin TypeScript package following Obsidian's official `obsidian-sample-plugin` scaffold. Two chained `SuggestModal` subclasses (tag picker → note picker) driven by `app.metadataCache` with no custom indexing. A separate DOM-level hook reroutes `#`-prefixed Quick Switcher input into the tag picker. Pure-logic modules (sort/filter/LRU/settings-normalize) are fully unit-tested; Obsidian-runtime code is exercised via a documented manual smoke matrix against a seeded test vault.

**Tech Stack:** TypeScript 5.x, esbuild, vitest, Obsidian 1.5+ API (peer dep). No runtime dependencies.

---

## File Structure

**Project root**
- `manifest.json` — Obsidian plugin manifest (id, name, minAppVersion…)
- `package.json` — npm scripts, devDeps
- `tsconfig.json` — TS compiler config (CommonJS output, strict)
- `esbuild.config.mjs` — bundler: `src/main.ts` → `main.js` with `obsidian` external
- `vitest.config.ts` — test runner config
- `versions.json` — compatibility map required by Obsidian
- `.gitignore` — already present
- `README.md` — plugin description + local dev setup instructions

**Source (`src/`)** — each file has one responsibility
- `types.ts` — `TagEntry`, `PluginSettings`, `EmptyStateMode`
- `settings.ts` — defaults, `normalizeSettings()`, `TagFinderSettingTab` class
- `recentTags.ts` — MRU LRU with injected persistence
- `tagIndex.ts` — split into:
  - **pure logic:** `sortTagsForEmptyState()`, `filterNotesByTag()`, `fuzzyRank()` — fully unit-tested
  - **adapter:** `getAllTags(app)`, `notesForTag(app, tag)` — thin wrappers over `app.metadataCache`
- `tagSuggestModal.ts` — Step 1 modal
- `noteSuggestModal.ts` — Step 2 modal
- `quickSwitcherHook.ts` — `install()` / `uninstall()` for the `#`-prefix DOM hook
- `main.ts` — plugin lifecycle, command registration, hook wiring

**Tests (`tests/`)** — vitest, pure-logic only
- `settings.test.ts`
- `recentTags.test.ts`
- `tagIndex.test.ts`

**Scripts & docs**
- `scripts/seed-vault.ts` — generates a test vault with representative tags
- `docs/test-plan.md` — manual smoke matrix from spec §8.2

---

## Task 1: Project scaffolding

**Files:**
- Create: `manifest.json`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `esbuild.config.mjs`
- Create: `vitest.config.ts`
- Create: `versions.json`
- Create: `src/main.ts` (stub, so build succeeds)

- [ ] **Step 1: Write `manifest.json`**

```json
{
  "id": "tag-finder",
  "name": "Tag Finder",
  "version": "0.1.0",
  "minAppVersion": "1.5.0",
  "description": "Quickly find a tag in your vault, then jump to a note that uses it.",
  "author": "etais",
  "authorUrl": "https://github.com/etais",
  "isDesktopOnly": false
}
```

- [ ] **Step 2: Write `package.json`**

```json
{
  "name": "obsidian-tag-finder",
  "version": "0.1.0",
  "description": "Find tags and tagged notes via a two-step modal.",
  "main": "main.js",
  "scripts": {
    "dev": "node esbuild.config.mjs",
    "build": "tsc --noEmit && node esbuild.config.mjs production",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["obsidian", "plugin", "tags"],
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.11.0",
    "builtin-modules": "^3.3.0",
    "esbuild": "^0.20.0",
    "obsidian": "latest",
    "tslib": "^2.6.2",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  }
}
```

- [ ] **Step 3: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES2022",
    "allowJs": true,
    "noImplicitAny": true,
    "strict": true,
    "moduleResolution": "Bundler",
    "importHelpers": true,
    "isolatedModules": true,
    "esModuleInterop": true,
    "lib": ["DOM", "ES2022"],
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "scripts/**/*.ts"]
}
```

- [ ] **Step 4: Write `esbuild.config.mjs`**

```js
import esbuild from "esbuild";
import process from "process";
import builtins from "builtin-modules";

const prod = process.argv[2] === "production";

const context = await esbuild.context({
  banner: { js: "/* Tag Finder — built by esbuild */" },
  entryPoints: ["src/main.ts"],
  bundle: true,
  external: [
    "obsidian",
    "electron",
    "@codemirror/autocomplete",
    "@codemirror/collab",
    "@codemirror/commands",
    "@codemirror/language",
    "@codemirror/lint",
    "@codemirror/search",
    "@codemirror/state",
    "@codemirror/view",
    "@lezer/common",
    "@lezer/highlight",
    "@lezer/lr",
    ...builtins,
  ],
  format: "cjs",
  target: "es2022",
  logLevel: "info",
  sourcemap: prod ? false : "inline",
  treeShaking: true,
  outfile: "main.js",
  minify: prod,
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

- [ ] **Step 5: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 6: Write `versions.json`**

```json
{
  "0.1.0": "1.5.0"
}
```

- [ ] **Step 7: Write stub `src/main.ts` so build succeeds**

```ts
import { Plugin } from "obsidian";

export default class TagFinderPlugin extends Plugin {
  async onload() {
    console.log("[tag-finder] loaded (stub)");
  }
  async onunload() {
    console.log("[tag-finder] unloaded");
  }
}
```

- [ ] **Step 8: Install deps and verify build**

```bash
npm install
npm run build
```
Expected: `main.js` appears in project root; `tsc --noEmit` passes with no errors.

- [ ] **Step 9: Commit**

```bash
git add manifest.json package.json package-lock.json tsconfig.json esbuild.config.mjs vitest.config.ts versions.json src/main.ts
git commit -m "chore: scaffold Obsidian plugin project"
```

Note: `main.js` is gitignored. `package-lock.json` is committed.

---

## Task 2: Types module

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Write all shared types**

```ts
export type TagEntry = {
  /** Tag string including the leading '#', e.g. '#project/work'. */
  tag: string;
  /** Number of notes carrying this exact tag (not descendants). */
  count: number;
};

export type EmptyStateMode =
  | "recent-then-usage"
  | "usage"
  | "alphabetical"
  | "blank";

export type PluginSettings = {
  emptyStateMode: EmptyStateMode;
  enableQuickSwitcherHook: boolean;
  /** 0..30; 0 disables recent-tags entirely. */
  recentLimit: number;
};

export const DEFAULT_SETTINGS: PluginSettings = {
  emptyStateMode: "recent-then-usage",
  enableQuickSwitcherHook: true,
  recentLimit: 10,
};

/** Shape of the blob stored via plugin.saveData(). */
export type PersistedData = {
  settings: PluginSettings;
  recentTags: string[];
};
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat(types): add TagEntry, PluginSettings, EmptyStateMode"
```

---

## Task 3: Settings normalization (TDD)

**Files:**
- Create: `tests/settings.test.ts`
- Create: `src/settings.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/settings.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { normalizeSettings } from "../src/settings";
import { DEFAULT_SETTINGS } from "../src/types";

describe("normalizeSettings", () => {
  it("returns defaults when input is null or undefined", () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
  });

  it("keeps a valid emptyStateMode", () => {
    expect(normalizeSettings({ emptyStateMode: "usage" }).emptyStateMode).toBe("usage");
    expect(normalizeSettings({ emptyStateMode: "alphabetical" }).emptyStateMode).toBe("alphabetical");
    expect(normalizeSettings({ emptyStateMode: "blank" }).emptyStateMode).toBe("blank");
  });

  it("falls back when emptyStateMode is invalid", () => {
    expect(normalizeSettings({ emptyStateMode: "nonsense" }).emptyStateMode).toBe(DEFAULT_SETTINGS.emptyStateMode);
    expect(normalizeSettings({ emptyStateMode: 42 }).emptyStateMode).toBe(DEFAULT_SETTINGS.emptyStateMode);
  });

  it("coerces enableQuickSwitcherHook to boolean or default", () => {
    expect(normalizeSettings({ enableQuickSwitcherHook: false }).enableQuickSwitcherHook).toBe(false);
    expect(normalizeSettings({ enableQuickSwitcherHook: "yes" }).enableQuickSwitcherHook).toBe(DEFAULT_SETTINGS.enableQuickSwitcherHook);
  });

  it("clamps recentLimit to [0, 30]", () => {
    expect(normalizeSettings({ recentLimit: -5 }).recentLimit).toBe(0);
    expect(normalizeSettings({ recentLimit: 100 }).recentLimit).toBe(30);
    expect(normalizeSettings({ recentLimit: 5 }).recentLimit).toBe(5);
    expect(normalizeSettings({ recentLimit: 3.7 }).recentLimit).toBe(3);
    expect(normalizeSettings({ recentLimit: "ten" }).recentLimit).toBe(DEFAULT_SETTINGS.recentLimit);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/settings'` (or similar).

- [ ] **Step 3: Implement `src/settings.ts`**

```ts
import { DEFAULT_SETTINGS, EmptyStateMode, PluginSettings } from "./types";

const VALID_MODES: EmptyStateMode[] = ["recent-then-usage", "usage", "alphabetical", "blank"];

function isValidMode(v: unknown): v is EmptyStateMode {
  return typeof v === "string" && (VALID_MODES as string[]).includes(v);
}

export function normalizeSettings(raw: unknown): PluginSettings {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const emptyStateMode = isValidMode(source.emptyStateMode)
    ? source.emptyStateMode
    : DEFAULT_SETTINGS.emptyStateMode;

  const enableQuickSwitcherHook = typeof source.enableQuickSwitcherHook === "boolean"
    ? source.enableQuickSwitcherHook
    : DEFAULT_SETTINGS.enableQuickSwitcherHook;

  let recentLimit = DEFAULT_SETTINGS.recentLimit;
  if (typeof source.recentLimit === "number" && Number.isFinite(source.recentLimit)) {
    recentLimit = Math.max(0, Math.min(30, Math.floor(source.recentLimit)));
  }

  return { emptyStateMode, enableQuickSwitcherHook, recentLimit };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: all `normalizeSettings` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/settings.test.ts src/settings.ts
git commit -m "feat(settings): add normalizeSettings with validation and clamping"
```

---

## Task 4: Recent-tags LRU (TDD)

**Files:**
- Create: `tests/recentTags.test.ts`
- Create: `src/recentTags.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/recentTags.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { RecentTags } from "../src/recentTags";

function makeStore(initial: string[] = []) {
  let state = [...initial];
  return {
    load: vi.fn(async () => state),
    save: vi.fn(async (next: string[]) => { state = [...next]; }),
    peek: () => state,
  };
}

describe("RecentTags", () => {
  it("returns [] when no prior state exists", async () => {
    const store = makeStore([]);
    const r = new RecentTags(store, 10);
    await r.init();
    expect(r.get()).toEqual([]);
  });

  it("loads persisted order", async () => {
    const store = makeStore(["#b", "#a", "#c"]);
    const r = new RecentTags(store, 10);
    await r.init();
    expect(r.get()).toEqual(["#b", "#a", "#c"]);
  });

  it("push moves an existing tag to the front", async () => {
    const store = makeStore(["#a", "#b", "#c"]);
    const r = new RecentTags(store, 10);
    await r.init();
    await r.push("#b");
    expect(r.get()).toEqual(["#b", "#a", "#c"]);
  });

  it("push adds a new tag at the front", async () => {
    const store = makeStore(["#a", "#b"]);
    const r = new RecentTags(store, 10);
    await r.init();
    await r.push("#c");
    expect(r.get()).toEqual(["#c", "#a", "#b"]);
  });

  it("push enforces limit by dropping the oldest", async () => {
    const store = makeStore(["#a", "#b", "#c"]);
    const r = new RecentTags(store, 3);
    await r.init();
    await r.push("#d");
    expect(r.get()).toEqual(["#d", "#a", "#b"]);
  });

  it("limit of 0 means get() always returns []", async () => {
    const store = makeStore(["#a", "#b"]);
    const r = new RecentTags(store, 0);
    await r.init();
    await r.push("#c");
    expect(r.get()).toEqual([]);
  });

  it("setLimit updates future gets and trims on next push", async () => {
    const store = makeStore(["#a", "#b", "#c", "#d"]);
    const r = new RecentTags(store, 10);
    await r.init();
    r.setLimit(2);
    expect(r.get()).toEqual(["#a", "#b"]);
    await r.push("#e");
    expect(r.get()).toEqual(["#e", "#a"]);
  });

  it("clear empties the list and persists", async () => {
    const store = makeStore(["#a"]);
    const r = new RecentTags(store, 10);
    await r.init();
    await r.clear();
    expect(r.get()).toEqual([]);
    expect(store.peek()).toEqual([]);
  });

  it("swallows save errors and keeps the in-memory list", async () => {
    const store = makeStore(["#a"]);
    store.save.mockRejectedValueOnce(new Error("disk full"));
    const r = new RecentTags(store, 10);
    await r.init();
    await r.push("#b"); // should not throw
    expect(r.get()).toEqual(["#b", "#a"]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/recentTags.ts`**

```ts
export interface RecentTagsStore {
  load(): Promise<string[]>;
  save(next: string[]): Promise<void>;
}

export class RecentTags {
  private list: string[] = [];
  private limit: number;

  constructor(private readonly store: RecentTagsStore, initialLimit: number) {
    this.limit = Math.max(0, initialLimit);
  }

  async init(): Promise<void> {
    try {
      this.list = await this.store.load();
    } catch {
      this.list = [];
    }
  }

  setLimit(next: number): void {
    this.limit = Math.max(0, next);
  }

  get(): string[] {
    if (this.limit <= 0) return [];
    return this.list.slice(0, this.limit);
  }

  async push(tag: string): Promise<void> {
    const without = this.list.filter(t => t !== tag);
    const next = [tag, ...without].slice(0, this.limit);
    this.list = next;
    await this.persist();
  }

  async clear(): Promise<void> {
    this.list = [];
    await this.persist();
  }

  private async persist(): Promise<void> {
    try {
      await this.store.save(this.list);
    } catch (err) {
      console.warn("[tag-finder] failed to save recent tags", err);
    }
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: all `RecentTags` tests PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/recentTags.test.ts src/recentTags.ts
git commit -m "feat(recent-tags): add LRU with injected persistence"
```

---

## Task 5: Tag index — pure logic (TDD)

**Files:**
- Create: `tests/tagIndex.test.ts`
- Create: `src/tagIndex.ts` (partial — pure-logic functions only; adapter added in Task 6)

- [ ] **Step 1: Write the failing tests**

Create `tests/tagIndex.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { filterFilesByTag, sortTagsForEmptyState } from "../src/tagIndex";
import { TagEntry } from "../src/types";

const mkEntry = (tag: string, count: number): TagEntry => ({ tag, count });

describe("sortTagsForEmptyState", () => {
  const entries: TagEntry[] = [
    mkEntry("#alpha", 3),
    mkEntry("#beta", 10),
    mkEntry("#gamma", 1),
  ];

  it("alphabetical: A→Z case-insensitive", () => {
    const out = sortTagsForEmptyState(entries, [], "alphabetical");
    expect(out.map(e => e.tag)).toEqual(["#alpha", "#beta", "#gamma"]);
  });

  it("usage: most-used first, tie-broken alphabetically", () => {
    const withTie = [...entries, mkEntry("#delta", 10)];
    const out = sortTagsForEmptyState(withTie, [], "usage");
    expect(out.map(e => e.tag)).toEqual(["#beta", "#delta", "#alpha", "#gamma"]);
  });

  it("blank: returns empty array", () => {
    expect(sortTagsForEmptyState(entries, [], "blank")).toEqual([]);
  });

  it("recent-then-usage: recents (in MRU order) first, then the rest by usage", () => {
    const out = sortTagsForEmptyState(entries, ["#gamma", "#alpha"], "recent-then-usage");
    expect(out.map(e => e.tag)).toEqual(["#gamma", "#alpha", "#beta"]);
  });

  it("recent-then-usage: recent tags that no longer exist are skipped", () => {
    const out = sortTagsForEmptyState(entries, ["#zzz", "#alpha"], "recent-then-usage");
    expect(out.map(e => e.tag)).toEqual(["#alpha", "#beta", "#gamma"]);
  });
});

describe("filterFilesByTag", () => {
  const mkFile = (path: string, tags: string[]) => ({ path, tags });
  const files = [
    mkFile("a.md", ["#project"]),
    mkFile("b.md", ["#project/work"]),
    mkFile("c.md", ["#project/work/urgent"]),
    mkFile("d.md", ["#personal"]),
    mkFile("e.md", ["#projection"]),   // must NOT match #project
  ];
  const lookup = (path: string) => files.find(f => f.path === path)!.tags;

  it("matches exact tag", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#personal", lookup);
    expect(out).toEqual(["d.md"]);
  });

  it("includes descendant tags under a parent", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#project", lookup);
    expect(out.sort()).toEqual(["a.md", "b.md", "c.md"]);
  });

  it("does not confuse string-prefix matches (#projection vs #project)", () => {
    const out = filterFilesByTag(["e.md"], "#project", lookup);
    expect(out).toEqual([]);
  });

  it("descendant rule requires a '/' separator", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#project/work", lookup);
    expect(out.sort()).toEqual(["b.md", "c.md"]);
  });

  it("returns [] when no file matches", () => {
    const out = filterFilesByTag(files.map(f => f.path), "#missing", lookup);
    expect(out).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the pure-logic portion of `src/tagIndex.ts`**

```ts
import { EmptyStateMode, TagEntry } from "./types";

/** Sort a list of TagEntry for the modal's empty-query state. Pure. */
export function sortTagsForEmptyState(
  entries: TagEntry[],
  recent: string[],
  mode: EmptyStateMode,
): TagEntry[] {
  if (mode === "blank") return [];

  if (mode === "alphabetical") {
    return [...entries].sort((a, b) =>
      a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" }),
    );
  }

  const byUsage = [...entries].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag, undefined, { sensitivity: "base" });
  });

  if (mode === "usage") return byUsage;

  // recent-then-usage
  const entryByTag = new Map(entries.map(e => [e.tag, e]));
  const recentExisting: TagEntry[] = [];
  const seen = new Set<string>();
  for (const tag of recent) {
    const match = entryByTag.get(tag);
    if (match && !seen.has(tag)) {
      recentExisting.push(match);
      seen.add(tag);
    }
  }
  const remainder = byUsage.filter(e => !seen.has(e.tag));
  return [...recentExisting, ...remainder];
}

/**
 * Filter file paths to those whose tag set contains `tag` or any descendant
 * (Obsidian semantics: #parent includes #parent/child).
 *
 * `lookup(path)` returns the tags for a single file. Pure (does not touch
 * Obsidian runtime).
 */
export function filterFilesByTag(
  paths: string[],
  tag: string,
  lookup: (path: string) => string[],
): string[] {
  const prefix = tag + "/";
  const matched: string[] = [];
  for (const p of paths) {
    const tags = lookup(p);
    if (tags.some(t => t === tag || t.startsWith(prefix))) {
      matched.push(p);
    }
  }
  return matched;
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `npm test`
Expected: all new tests PASS; earlier suites still green.

- [ ] **Step 5: Commit**

```bash
git add tests/tagIndex.test.ts src/tagIndex.ts
git commit -m "feat(tag-index): add pure sort and descendant-filter logic"
```

---

## Task 6: Tag index — Obsidian adapter

**Files:**
- Modify: `src/tagIndex.ts` (append adapter functions)

No unit tests for this task — it's a thin wrapper over Obsidian's runtime API and is exercised only by the manual smoke matrix (Task 13).

- [ ] **Step 1: Append adapter functions to `src/tagIndex.ts`**

```ts
// --- Adapter: reads app.metadataCache. Not unit-tested (Obsidian runtime). ---

import type { App, TFile } from "obsidian";

export function getAllTags(app: App): TagEntry[] {
  // metadataCache.getTags() returns { "#tag": count } including nested paths.
  const raw = app.metadataCache.getTags() as Record<string, number>;
  return Object.entries(raw).map(([tag, count]) => ({ tag, count }));
}

/** Read inline + frontmatter tags for a single file, all normalized to '#…'. */
export function tagsForFile(app: App, file: TFile): string[] {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return [];
  const result: string[] = [];
  if (cache.tags) {
    for (const t of cache.tags) result.push(t.tag);
  }
  const fmTags = cache.frontmatter?.tags;
  if (Array.isArray(fmTags)) {
    for (const raw of fmTags) {
      if (typeof raw !== "string") continue;
      result.push(raw.startsWith("#") ? raw : "#" + raw);
    }
  } else if (typeof fmTags === "string") {
    // YAML scalar form: "foo bar" or "foo, bar"
    for (const raw of fmTags.split(/[,\s]+/).filter(Boolean)) {
      result.push(raw.startsWith("#") ? raw : "#" + raw);
    }
  }
  return result;
}

/** Return all markdown files tagged with `tag` or any descendant tag. */
export function notesForTag(app: App, tag: string): TFile[] {
  const prefix = tag + "/";
  const out: TFile[] = [];
  for (const file of app.vault.getMarkdownFiles()) {
    const tags = tagsForFile(app, file);
    if (tags.some(t => t === tag || t.startsWith(prefix))) {
      out.push(file);
    }
  }
  return out;
}
```

- [ ] **Step 2: Verify the project type-checks**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/tagIndex.ts
git commit -m "feat(tag-index): add app.metadataCache adapter"
```

---

## Task 7: Tag suggest modal (Step 1)

**Files:**
- Create: `src/tagSuggestModal.ts`

- [ ] **Step 1: Write the full modal class**

```ts
import { App, SuggestModal, prepareFuzzySearch, SearchResult } from "obsidian";
import { EmptyStateMode, PluginSettings, TagEntry } from "./types";
import { getAllTags, sortTagsForEmptyState } from "./tagIndex";
import { RecentTags } from "./recentTags";
import { NoteSuggestModal } from "./noteSuggestModal";

type Ranked = { entry: TagEntry; match: SearchResult | null };

export class TagSuggestModal extends SuggestModal<Ranked> {
  private allTags: TagEntry[];
  /** The query text last typed in this modal (for round-tripping via note modal). */
  public lastQuery = "";

  constructor(
    app: App,
    private readonly settings: PluginSettings,
    private readonly recent: RecentTags,
    private readonly onPick: (tag: string, queryAtPickTime: string) => void,
    private readonly initialQuery = "",
  ) {
    super(app);
    this.allTags = getAllTags(app);
    this.setPlaceholder("Find a tag by name…");
  }

  onOpen(): void {
    super.onOpen();
    if (this.initialQuery) {
      this.inputEl.value = this.initialQuery;
      this.inputEl.dispatchEvent(new Event("input"));
    }
  }

  getSuggestions(query: string): Ranked[] {
    this.lastQuery = query;

    if (this.allTags.length === 0) {
      return [];
    }

    if (query.trim() === "") {
      const sorted = sortTagsForEmptyState(
        this.allTags,
        this.recent.get(),
        this.settings.emptyStateMode,
      );
      return sorted.map(entry => ({ entry, match: null }));
    }

    const fuzzy = prepareFuzzySearch(query);
    const ranked: Ranked[] = [];
    for (const entry of this.allTags) {
      const match = fuzzy(entry.tag);
      if (match) ranked.push({ entry, match });
    }
    ranked.sort((a, b) => (b.match?.score ?? 0) - (a.match?.score ?? 0));
    return ranked;
  }

  renderSuggestion(item: Ranked, el: HTMLElement): void {
    const row = el.createDiv({ cls: "tag-finder-row" });
    row.createSpan({ text: item.entry.tag, cls: "tag-finder-tag" });
    row.createSpan({
      text: ` · ${item.entry.count} ${item.entry.count === 1 ? "note" : "notes"}`,
      cls: "tag-finder-count",
    });
  }

  async onChooseSuggestion(item: Ranked): Promise<void> {
    await this.recent.push(item.entry.tag);
    const query = this.lastQuery;
    this.close();
    this.onPick(item.entry.tag, query);
  }

  onNoSuggestion(): void {
    // Leave the empty-state to Obsidian's default "No results" string,
    // except for truly empty vaults where we show a custom message.
    if (this.allTags.length === 0) {
      this.resultContainerEl.empty();
      this.resultContainerEl.createDiv({
        cls: "tag-finder-empty",
        text: "No tags found in this vault.",
      });
    }
  }
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: `NoteSuggestModal` will error — `Cannot find module './noteSuggestModal'`. That's OK; it is added in Task 8. To unblock this step temporarily, write an empty stub:

```ts
// src/noteSuggestModal.ts (temporary stub — replaced in Task 8)
import { App, TFile } from "obsidian";
export class NoteSuggestModal {
  constructor(_app: App, _tag: string, _initial: string, _onBack: (q: string) => void) {}
  open() {}
}
```

Re-run `npm run typecheck` — now it must pass.

- [ ] **Step 3: Commit (with temporary stub)**

```bash
git add src/tagSuggestModal.ts src/noteSuggestModal.ts
git commit -m "feat(modal): add tag suggest modal (Step 1)"
```

---

## Task 8: Note suggest modal (Step 2)

**Files:**
- Modify/Overwrite: `src/noteSuggestModal.ts` (replace the Task 7 stub)

- [ ] **Step 1: Overwrite `src/noteSuggestModal.ts` with the real implementation**

```ts
import {
  App,
  Notice,
  PaneType,
  SearchResult,
  SuggestModal,
  TFile,
  prepareFuzzySearch,
} from "obsidian";
import { notesForTag } from "./tagIndex";

type RankedFile = { file: TFile; match: SearchResult | null; sortKey: number };

export class NoteSuggestModal extends SuggestModal<RankedFile> {
  private candidates: TFile[];

  constructor(
    app: App,
    private readonly tag: string,
    private readonly initialTagQuery: string,
    private readonly onBackToTags: (initialQuery: string) => void,
  ) {
    super(app);
    this.candidates = notesForTag(app, tag);
    this.setPlaceholder(`Find a note tagged ${tag}…`);

    // Backspace on empty query → re-open the tag modal with the prior query.
    this.scope.register([], "Backspace", (evt) => {
      if (this.inputEl.value === "") {
        evt.preventDefault();
        this.close();
        this.onBackToTags(this.initialTagQuery);
        return false;
      }
      return true;
    });
  }

  getSuggestions(query: string): RankedFile[] {
    if (this.candidates.length === 0) return [];

    if (query.trim() === "") {
      return [...this.candidates]
        .sort((a, b) => b.stat.mtime - a.stat.mtime)
        .map(file => ({ file, match: null, sortKey: file.stat.mtime }));
    }

    const fuzzy = prepareFuzzySearch(query);
    const out: RankedFile[] = [];
    for (const file of this.candidates) {
      const haystack = `${file.basename} ${file.parent?.path ?? ""}`;
      const match = fuzzy(haystack);
      if (match) {
        out.push({ file, match, sortKey: match.score });
      }
    }
    out.sort((a, b) => b.sortKey - a.sortKey);
    return out;
  }

  renderSuggestion(item: RankedFile, el: HTMLElement): void {
    const row = el.createDiv({ cls: "tag-finder-note-row" });
    row.createSpan({ text: item.file.basename, cls: "tag-finder-note-title" });
    const parent = item.file.parent?.path;
    if (parent && parent !== "/") {
      row.createSpan({ text: ` — ${parent}`, cls: "tag-finder-note-path" });
    }
  }

  async onChooseSuggestion(item: RankedFile, evt: MouseEvent | KeyboardEvent): Promise<void> {
    if (item.file.deleted) {
      new Notice("File no longer exists.");
      return;
    }
    const paneType = this.pickPaneType(evt);
    const leaf = this.app.workspace.getLeaf(paneType);
    await leaf.openFile(item.file);
  }

  onNoSuggestion(): void {
    if (this.candidates.length === 0) {
      this.resultContainerEl.empty();
      this.resultContainerEl.createDiv({
        cls: "tag-finder-empty",
        text: `No notes tagged ${this.tag}.`,
      });
    }
  }

  private pickPaneType(evt: MouseEvent | KeyboardEvent): PaneType | boolean {
    if (evt.shiftKey) return "split";
    if (evt.metaKey || evt.ctrlKey) return "tab";
    return false; // current leaf
  }
}
```

- [ ] **Step 2: Verify typecheck and tests**

Run: `npm run typecheck && npm test`
Expected: typecheck passes; vitest suites still green.

- [ ] **Step 3: Commit**

```bash
git add src/noteSuggestModal.ts
git commit -m "feat(modal): add note suggest modal with drill-down and back navigation"
```

---

## Task 9: Quick Switcher hook

**Files:**
- Create: `src/quickSwitcherHook.ts`

- [ ] **Step 1: Implement the hook**

```ts
import { App } from "obsidian";

export type QuickSwitcherReroute = (initialQueryAfterHash: string) => void;

/**
 * Install a document-level 'input' capture listener that detects when the
 * user has typed '#' as the first character in the built-in Quick Switcher
 * prompt. When that happens we close the built-in modal and invoke the
 * reroute callback with the text after the '#'.
 *
 * Returns an uninstaller. All listener wiring is wrapped in try/catch so that
 * a single failure disables the hook for the rest of the session.
 */
export function installQuickSwitcherHook(app: App, reroute: QuickSwitcherReroute): () => void {
  let disabled = false;

  const handler = (evt: Event) => {
    if (disabled) return;
    try {
      const target = evt.target as HTMLElement | null;
      if (!(target instanceof HTMLInputElement)) return;

      // The built-in Quick Switcher prompt lives inside a `.prompt` container
      // with a `.prompt-input-container` wrapping the input. This check keeps
      // us from hijacking unrelated inputs.
      if (!target.closest(".prompt .prompt-input-container")) return;

      const value = target.value;
      if (!value.startsWith("#")) return;

      // Close whichever modal is active (the Quick Switcher) and reroute.
      // `activeModal` is not in Obsidian's public typings — safe cast.
      const activeModal = (app.workspace as unknown as { activeModal?: { close(): void } }).activeModal;
      activeModal?.close();

      reroute(value.slice(1));
    } catch (err) {
      disabled = true;
      console.warn("[tag-finder] quick-switcher hook disabled after error", err);
    }
  };

  try {
    document.addEventListener("input", handler, true);
  } catch (err) {
    console.warn("[tag-finder] quick-switcher hook unavailable", err);
    return () => {};
  }

  return () => {
    document.removeEventListener("input", handler, true);
  };
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npm run typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/quickSwitcherHook.ts
git commit -m "feat(hook): reroute '#'-prefixed Quick Switcher input to Tag Finder"
```

---

## Task 10: Settings tab UI

**Files:**
- Modify: `src/settings.ts` (append the `TagFinderSettingTab` class)

- [ ] **Step 1: Append the settings tab to `src/settings.ts`**

```ts
// --- Settings tab UI (uses Obsidian runtime — not unit-tested) ---

import { App, PluginSettingTab, Setting, Notice } from "obsidian";
import type TagFinderPlugin from "./main";

export class TagFinderSettingTab extends PluginSettingTab {
  constructor(app: App, private plugin: TagFinderPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl, plugin } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Initial sort")
      .setDesc("Order of tags before you start typing.")
      .addDropdown(dd =>
        dd
          .addOptions({
            "recent-then-usage": "Recent, then most-used",
            "usage": "Most-used",
            "alphabetical": "Alphabetical",
            "blank": "Empty until typing",
          })
          .setValue(plugin.settings.emptyStateMode)
          .onChange(async value => {
            plugin.settings.emptyStateMode = value as typeof plugin.settings.emptyStateMode;
            await plugin.savePluginData();
          }),
      );

    new Setting(containerEl)
      .setName("Integrate with Quick Switcher")
      .setDesc("Open Tag Finder when the Quick Switcher input starts with '#'.")
      .addToggle(t =>
        t.setValue(plugin.settings.enableQuickSwitcherHook).onChange(async value => {
          plugin.settings.enableQuickSwitcherHook = value;
          await plugin.savePluginData();
          plugin.refreshQuickSwitcherHook();
        }),
      );

    new Setting(containerEl)
      .setName("Recent tags to remember")
      .setDesc("0 disables recent entirely.")
      .addSlider(s =>
        s
          .setLimits(0, 30, 1)
          .setValue(plugin.settings.recentLimit)
          .setDynamicTooltip()
          .onChange(async value => {
            plugin.settings.recentLimit = value;
            plugin.recent.setLimit(value);
            await plugin.savePluginData();
          }),
      );

    new Setting(containerEl)
      .setName("Recent tags")
      .addButton(b =>
        b.setButtonText("Clear recent tags").onClick(async () => {
          await plugin.recent.clear();
          new Notice("Recent tags cleared.");
        }),
      );
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `npm run typecheck`
Expected: some errors about `plugin.settings`, `plugin.savePluginData()`, `plugin.refreshQuickSwitcherHook()`, `plugin.recent` — these are all implemented in Task 11. That's expected for now. **Skip step 3 (commit) until after Task 11.**

---

## Task 11: Plugin entry wiring (`main.ts`)

**Files:**
- Overwrite: `src/main.ts`

After this task, the previously-failing typecheck from Task 10 will pass; commit both together.

- [ ] **Step 1: Overwrite `src/main.ts` with full wiring**

```ts
import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, PersistedData, PluginSettings } from "./types";
import { normalizeSettings, TagFinderSettingTab } from "./settings";
import { RecentTags, RecentTagsStore } from "./recentTags";
import { TagSuggestModal } from "./tagSuggestModal";
import { NoteSuggestModal } from "./noteSuggestModal";
import { installQuickSwitcherHook } from "./quickSwitcherHook";

export default class TagFinderPlugin extends Plugin {
  settings: PluginSettings = { ...DEFAULT_SETTINGS };
  recent!: RecentTags;
  private uninstallHook: (() => void) | null = null;

  async onload() {
    const persisted = (await this.loadData()) as Partial<PersistedData> | null;
    this.settings = normalizeSettings(persisted?.settings);
    const persistedRecent = Array.isArray(persisted?.recentTags)
      ? persisted!.recentTags.filter((v: unknown): v is string => typeof v === "string")
      : [];

    const recentStore: RecentTagsStore = {
      load: async () => persistedRecent,
      save: async next => {
        await this.saveData({ settings: this.settings, recentTags: next });
      },
    };
    this.recent = new RecentTags(recentStore, this.settings.recentLimit);
    await this.recent.init();

    this.addCommand({
      id: "open",
      name: "Open",
      callback: () => this.openTagPicker(""),
    });

    this.addSettingTab(new TagFinderSettingTab(this.app, this));
    this.refreshQuickSwitcherHook();
  }

  async onunload() {
    this.uninstallHook?.();
    this.uninstallHook = null;
  }

  openTagPicker(initialQuery: string) {
    const onPick = (tag: string, queryAtPickTime: string) => {
      const noteModal = new NoteSuggestModal(
        this.app,
        tag,
        queryAtPickTime,
        (lastTagQuery: string) => this.openTagPicker(lastTagQuery),
      );
      noteModal.open();
    };
    const modal = new TagSuggestModal(this.app, this.settings, this.recent, onPick, initialQuery);
    modal.open();
  }

  refreshQuickSwitcherHook() {
    this.uninstallHook?.();
    this.uninstallHook = null;
    if (this.settings.enableQuickSwitcherHook) {
      this.uninstallHook = installQuickSwitcherHook(this.app, (q) => this.openTagPicker(q));
    }
  }

  async savePluginData() {
    await this.saveData({
      settings: this.settings,
      recentTags: this.recent.get(),
    });
  }
}
```

- [ ] **Step 2: Run typecheck and tests**

Run: `npm run typecheck && npm test && npm run build`
Expected: typecheck passes; vitest green; `main.js` produced.

- [ ] **Step 3: Commit Task 10 + Task 11 together**

```bash
git add src/main.ts src/settings.ts
git commit -m "feat(plugin): wire entry, settings tab, and Quick Switcher hook"
```

---

## Task 12: Seed script for a test vault

**Files:**
- Create: `scripts/seed-vault.ts`

- [ ] **Step 1: Write the generator**

```ts
#!/usr/bin/env -S npx tsx
/**
 * Seed a test vault with ~50 markdown notes spanning inline tags,
 * frontmatter tags, and nested hierarchies — matching the scenarios in
 * docs/test-plan.md.
 *
 * Usage:
 *   npx tsx scripts/seed-vault.ts ~/Documents/TagFinderTestVault
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";

const target = process.argv[2];
if (!target) {
  console.error("usage: tsx scripts/seed-vault.ts <vault-path>");
  process.exit(1);
}

mkdirSync(join(target, "Projects"), { recursive: true });
mkdirSync(join(target, "Daily"), { recursive: true });

const notes: Array<{ path: string; content: string }> = [];

// Inline-tag notes
for (let i = 0; i < 10; i++) {
  notes.push({
    path: join(target, `Inline ${i}.md`),
    content: `# Inline ${i}\n\nBody text with tags #work #personal\n`,
  });
}

// Frontmatter-tag notes
for (let i = 0; i < 10; i++) {
  notes.push({
    path: join(target, `Fm ${i}.md`),
    content: `---\ntags: [project/work, project/work/urgent]\n---\n\n# Fm ${i}\n\nBody.\n`,
  });
}

// Nested-tag variety
notes.push({
  path: join(target, "Projects", "Alpha Plan.md"),
  content: "# Alpha Plan\n\n#project/work/urgent\n",
});
notes.push({
  path: join(target, "Projects", "Beta Review.md"),
  content: "# Beta Review\n\n#project/work\n",
});
notes.push({
  path: join(target, "Projects", "Personal Reflection.md"),
  content: "# Personal Reflection\n\n#personal #personal/journal\n",
});

// Similar-prefix note — must NOT match #project
notes.push({
  path: join(target, "Projection Study.md"),
  content: "# Projection Study\n\n#projection\n",
});

// Daily notes with #daily tag
for (let i = 0; i < 5; i++) {
  notes.push({
    path: join(target, "Daily", `2026-04-${20 - i}.md`),
    content: `# Daily ${i}\n\n#daily #daily/review\n`,
  });
}

for (const n of notes) writeFileSync(n.path, n.content);
console.log(`Seeded ${notes.length} notes into ${target}`);
```

- [ ] **Step 2: Add a devDep so the script runs**

Edit `package.json` → under `devDependencies` add:

```json
"tsx": "^4.7.0"
```

Then run:

```bash
npm install
```

- [ ] **Step 3: Commit**

```bash
git add scripts/seed-vault.ts package.json package-lock.json
git commit -m "chore(scripts): add test-vault seed generator"
```

---

## Task 13: Developer README + manual smoke matrix

**Files:**
- Create: `README.md`
- Create: `docs/test-plan.md`

- [ ] **Step 1: Write `README.md`**

```markdown
# Tag Finder

Obsidian plugin: type `#` in a modal to fuzzy-find a tag, then drill into notes that use it.

## Features
- Dedicated "Tag Finder: Open" command (bind your own hotkey).
- `#`-prefix interop with the built-in Quick Switcher.
- Two-step flow: tag picker → note picker, preserving your query on Backspace.
- Nested-tag inclusion (selecting `#project` surfaces notes tagged `#project/work/urgent`).
- Configurable initial sort (recent/usage/alphabetical/blank).

## Local development

### 1. Clone and build
```bash
git clone <this-repo>
cd obsidian-tag-finder
npm install
npm run dev   # esbuild in watch mode → rewrites main.js on every save
```

### 2. Create a dedicated test vault
Open Obsidian → **Create new vault** (not your real one). Example path: `~/Documents/TagFinderTestVault`.

### 3. Symlink the plugin into the test vault
```bash
mkdir -p ~/Documents/TagFinderTestVault/.obsidian/plugins
ln -s "$(pwd)" ~/Documents/TagFinderTestVault/.obsidian/plugins/obsidian-tag-finder
```

### 4. Enable the plugin in Obsidian
Settings → Community plugins → turn off Safe Mode → refresh list → enable "Tag Finder".

### 5. (Recommended) Install Hot Reload
Install the community plugin **Hot Reload** (by pjeby) in the same test vault. It auto-reloads Tag Finder whenever `main.js` changes — no Obsidian restart needed.

### 6. Seed the vault with test data
```bash
npx tsx scripts/seed-vault.ts ~/Documents/TagFinderTestVault
```
Restart Obsidian once to index the seeded files.

### 7. Run tests
```bash
npm test           # pure-logic unit tests
npm run typecheck  # tsc --noEmit
```

Obsidian itself has no headless runtime, so modal behavior and the Quick Switcher hook are verified manually — see `docs/test-plan.md`.
```

- [ ] **Step 2: Write `docs/test-plan.md`**

```markdown
# Manual smoke matrix

Run before each release against a vault seeded by `scripts/seed-vault.ts`. Each row is pass/fail.

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | Empty vault | Open a brand-new vault, install plugin, run `Tag Finder: Open` | Modal shows "No tags found in this vault." |
| 2 | Mixed inline + frontmatter | Seeded vault, `Tag Finder: Open` | Both `#work` (inline) and `#project/work` (frontmatter) appear with correct counts, deduped |
| 3 | Recent ordering | Pick `#daily`, close, reopen | `#daily` is first |
| 4 | emptyStateMode switches | Toggle each of the four settings | Next open reflects the new ordering; setting persists across reopens |
| 5 | Fuzzy matching | Type `wrk` | `#work`, `#project/work`, `#project/work/urgent` all match |
| 6 | Nested inclusion | Pick `#project` | Note list includes files tagged `#project/work`, `#project/work/urgent` |
| 7 | Prefix disambiguation | Pick `#project` | `Projection Study.md` (tagged `#projection`) is NOT in the list |
| 8 | Open: current pane | Highlight note, press Enter | Opens in current pane |
| 9 | Open: new tab | Cmd+Enter (mac) / Ctrl+Enter (win/linux) | Opens in new tab |
| 10 | Open: split | Shift+Enter | Opens in split |
| 11 | Back navigation | In note picker, empty the query, press Backspace | Returns to tag picker; tag-picker query is restored to what it was at pick time |
| 12 | QS hook: on | Cmd+O, type `#wor` | Built-in switcher closes, Tag Finder opens with `wor` pre-filled |
| 13 | QS hook: off | Disable hook in settings, Cmd+O, type `#` | Built-in switcher unchanged |
| 14 | Clear recent | Settings → "Clear recent tags", reopen | Recent list is empty |
| 15 | File deleted mid-flow | In note picker, delete highlighted file via Finder, press Enter | `Notice("File no longer exists.")`, no crash |
| 16 | Disable/enable cycle | Disable plugin, re-enable, open modal | Works; no duplicate DOM listener (verify by running #12 — only one reroute fires) |
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/test-plan.md
git commit -m "docs: add README with dev setup and manual smoke matrix"
```

---

## Task 14: Run the manual smoke matrix

**Files:** none (execution only)

- [ ] **Step 1: Follow `README.md` §1–6 exactly** to set up the test vault, symlink the built plugin, install Hot Reload, and seed test data.

- [ ] **Step 2: Build a production bundle** (the dev watch build is fine, but a clean prod build catches issues)
```bash
npm run build
```
Expected: `main.js` rebuilt with no typecheck errors.

- [ ] **Step 3: Execute every row of `docs/test-plan.md`.** For each failure, open a DevTools console (`Cmd+Opt+I` in Obsidian), capture the error, and open a fix-it task in the implementer's judgment. Do NOT ship with any row failing.

- [ ] **Step 4: Tag the release once all rows pass**

```bash
git tag v0.1.0
```

No commit in this task — it's a verification gate. If any test fails and a fix is needed, make a new task for the fix and re-run the matrix afterward.

---

## Self-review notes

- **Spec coverage:** every section of the spec has a task — §2 user flow (Tasks 7, 8, 11), §3 architecture (Task 1, file structure), §4 data flow (Tasks 5–11), §5 error handling (Tasks 3, 4, 8, 9, 11), §6 performance (no explicit task — emerges from adapter's O(n) iteration documented in spec §6), §7 settings UI (Task 10), §8 testing (Tasks 3, 4, 5 unit tests + Tasks 13, 14 manual matrix).
- **Types consistent** across tasks: `TagEntry`, `PluginSettings`, `EmptyStateMode`, `RecentTagsStore`, `PersistedData`. Function names used in later tasks (`getAllTags`, `notesForTag`, `sortTagsForEmptyState`, `filterFilesByTag`, `installQuickSwitcherHook`, `normalizeSettings`) all match their definitions.
- **Out of scope reminders** from spec §9: no tag page creation, no rename/merge, no full-text search, no tree drill-down UI, no pre-built inverted index, no custom CSS beyond row layout. Keep to this during implementation.
