# Tag Finder — Design Spec

**Date:** 2026-04-21
**Status:** Approved — ready for implementation planning
**Package:** `obsidian-tag-finder`
**Display name:** Tag Finder
**Command ID:** `tag-finder:open`

## 1. Problem & Goal

Obsidian's built-in Quick Switcher can find files and headings, but there is no first-class way to quickly find and navigate to a tag. Users who rely on tags as primary organization have to open the Tag pane, scroll, click, and then navigate again — or fall back to typing `tag:#foo` into full search.

Existing community plugins come close but none deliver the exact UX:
- **Quick Switcher++** (`darlal/switcher-plus`) — its `@` symbol mode lists in-file hashtags; requires opening a file first.
- **Another Quick Switcher** (`tadashi-aikawa`) — filters notes by tag but never returns tag names themselves as results.
- **Tag Wrangler** — tag-pane context menu (rename/merge), not a modal switcher.
- **Omnisearch** — full-text search, not tag-focused.

**Goal:** a modal that lets the user type `#…` and fuzzy-find any tag in the vault, then drill into the matching notes — all without leaving the keyboard and without leaving the modal surface.

## 2. User-facing behavior

### 2.1 Invocation
Two ways to open:
1. **Dedicated command** `Tag Finder: Open` (command ID `tag-finder:open`). User can bind any hotkey in Obsidian's Hotkeys settings.
2. **Quick Switcher hook**: when the built-in Quick Switcher (`Cmd+O` / `Ctrl+O`) is open and the user's first character is `#`, the built-in modal closes and Tag Finder opens, seeded with the remaining typed text as its initial query. Disableable via plugin settings.

### 2.2 Step 1 — Tag picker (`TagSuggestModal`)
- Shows tags as `#tag-name · N notes` rows.
- Initial ordering controlled by `emptyStateMode` setting; default: recently-picked tags first (MRU), then remaining tags by usage count descending.
- Typing filters the list by fuzzy match against the tag string (including nested path, e.g. `#project/work/urgent`).
- Enter selects the highlighted tag and transitions to Step 2.
- Esc closes.

### 2.3 Step 2 — Note picker (`NoteSuggestModal`)
- Lists notes whose tags match the picked tag **or any descendant** — e.g. picking `#project` includes notes tagged `#project`, `#project/work`, `#project/work/urgent`. Matches Obsidian's own tag-search semantics.
- Empty-query ordering: most-recently-modified first.
- Typing fuzzy-filters over `basename` and parent-folder path.
- Keyboard:
  - `Enter` — open in current pane
  - `Cmd/Ctrl+Enter` — open in a new tab
  - `Shift+Enter` — open in a split
  - `Backspace` on empty query — close and re-open the tag picker with its prior query preserved
  - `Esc` — close

### 2.4 Edge-case messaging
- Vault has zero tags → tag modal shows `"No tags found in this vault."`
- Stale cache: tag exists but no notes match at drill-down time → note modal shows `"No notes tagged #foo."` (Backspace returns.)
- Selected file deleted/renamed between pick and open → `Notice("File no longer exists.")`, no crash.

## 3. Architecture

### 3.1 Module layout
```
src/
  main.ts                  // Plugin lifecycle: load/unload, command registration, hook registration, settings loader
  tagSuggestModal.ts       // Step 1: SuggestModal<TagEntry>
  noteSuggestModal.ts      // Step 2: SuggestModal<TFile>
  tagIndex.ts              // Adapter (reads metadataCache) + pure logic (sort/filter)
  recentTags.ts            // LRU history (load/save/push/get)
  quickSwitcherHook.ts     // DOM listener that detects '#' in the built-in switcher and reroutes
  settings.ts              // PluginSettingTab + defaults + normalizeSettings()
  types.ts                 // TagEntry, PluginSettings, EmptyStateMode
```

Each module has a single responsibility and a narrow interface. Modal classes depend on `tagIndex`, `recentTags`, and the plugin's `settings` — nothing else. `tagIndex`'s pure-logic layer is fully testable without an Obsidian runtime.

### 3.2 Key types
```ts
type TagEntry = { tag: string; count: number };

type EmptyStateMode =
  | "recent-then-usage"   // default
  | "usage"
  | "alphabetical"
  | "blank";

type PluginSettings = {
  emptyStateMode: EmptyStateMode;
  enableQuickSwitcherHook: boolean;
  recentLimit: number;  // 0–30, default 10, 0 disables recent
};
```

### 3.3 Data sources
Entirely built on Obsidian's public API — no custom index:
- `app.metadataCache.getTags()` → `Record<"#tag", count>` for the full tag list.
- `app.metadataCache.getFileCache(file)` → inline tags (`.tags[*].tag`) and frontmatter tags (`.frontmatter.tags`, normalized to `#`-prefixed strings by `tagIndex`).
- `app.vault.getMarkdownFiles()` → enumeration for the note-picker step.

No background indexing. No invalidation logic. Obsidian keeps `metadataCache` live.

### 3.4 Dependencies
- `obsidian` as peer dependency only.
- No runtime packages.
- Dev: TypeScript, esbuild, vitest (per the standard `obsidian-sample-plugin` toolchain).

## 4. Data flow

**Startup** — `main.ts` `onload()`:
1. `loadSettings()` via `plugin.loadData()` merged with defaults through `normalizeSettings()`.
2. `recentTags.init(plugin)` — loads LRU list from the same data blob.
3. Register command `tag-finder:open` → opens `TagSuggestModal`.
4. If `settings.enableQuickSwitcherHook`, install the DOM listener described under **Quick Switcher hook** below.
5. Register `TagFinderSettingTab`.

**Tag picker flow**:
1. Modal `onOpen()` reads `settings` + calls `tagIndex.getAllTags()` → `TagEntry[]`.
2. `sortTagsForEmptyState(entries, recentTags.get(), settings.emptyStateMode)` produces the initial list.
3. User types → Obsidian's `prepareFuzzySearch(query)` scores and filters; rows render `#tag · N notes` with fuzzy highlights.
4. User picks a tag → `recentTags.push(tag)` (and `plugin.saveData()`) → `this.close()` → instantiate and open `NoteSuggestModal(pickedTag, lastTagQuery)`.

**Note picker flow**:
1. `notesForTag(tag)` iterates `getMarkdownFiles()`, reads each `getFileCache()`, collects inline + frontmatter tags, includes the file if any collected tag equals `tag` or starts with `tag + "/"`.
2. Empty query → sort by `file.stat.mtime` descending.
3. Query present → fuzzy-rank over `basename + " " + parentPath`.
4. User picks → `workspace.getLeaf(newLeafMode).openFile(file)`, where `newLeafMode` is derived from the event's modifier keys.
5. Backspace on empty query → `this.close()`, reopen `TagSuggestModal` with the preserved `lastTagQuery`.

**Quick Switcher hook** (`quickSwitcherHook.ts`):
- Listens (via a single document-level `input` event delegated listener) for input events inside the built-in Quick Switcher's prompt element.
- If the input's `value` starts with `#`, close the built-in modal (`app.workspace.activeModal?.close()`) and open `TagSuggestModal` with the substring after the `#` as its initial query.
- All listener attachment is wrapped in try/catch; a single failure disables the hook for the session and logs `console.warn("[tag-finder] quick-switcher hook unavailable, disabling.")`. Dedicated command continues to work.

**Unload** — `onunload()`:
- Remove DOM listener. No other teardown needed (modals close themselves; settings/data already persisted).

## 5. Error handling

The plugin runs in-process with Obsidian; there is no network. Errors fall into a few narrow buckets:

- **`metadataCache` not ready on `onload`** — avoided by never touching the cache at load time. `tagIndex` is called lazily on first modal open.
- **Quick Switcher hook breakage** (Obsidian internals change) — try/catch wrapper, log once, disable for session. Dedicated command unaffected.
- **Malformed persisted settings** (hand-edited `data.json`) — `normalizeSettings()` validates every key with `typeof`/`Array.isArray`/range checks and falls back to the default for each invalid field.
- **File deleted mid-flow** — check `file.deleted` at open time; if true, `new Notice("File no longer exists.")` and no-op.
- **`saveData()` failure** — swallow, log once. Recent list stays in memory for the session.

No global error boundary, no user-facing error UI beyond the targeted `Notice` messages above.

## 6. Performance

- `getTags()` is an indexed hash — O(unique tags), typically 10–1000 entries.
- `notesForTag()` iterates all markdown files (`getMarkdownFiles()`), one `getFileCache()` lookup per file. For a 10k-note vault this is <10ms in practice; no pre-built tag→file inverted index in v1 (YAGNI).
- Fuzzy filtering uses `prepareFuzzySearch`, the same function powering the built-in Quick Switcher — same performance envelope.
- No background timers, intervals, or persistent listeners other than the single Quick Switcher hook.
- Persisted state is one tiny JSON blob (settings + LRU, ≤1 KB).

## 7. Settings UI

| Setting | Control | Default | Notes |
|---|---|---|---|
| Initial sort | Dropdown | `recent-then-usage` | Options: *Recent, then most-used* / *Most-used* / *Alphabetical* / *Empty until typing* |
| Integrate with Quick Switcher | Toggle | `true` | Description: "Open Tag Finder when the Quick Switcher input starts with `#`" |
| Recent tags to remember | Slider (0–30) | `10` | `0` disables recent entirely; sort falls through to the next mode |
| — | Button: **Clear recent tags** | — | Wipes the LRU; confirms with a `Notice` |

All settings save immediately on change via `plugin.saveData()`. Modals re-read settings on each open, so changes take effect without a plugin reload.

## 8. Testing strategy

### 8.1 Unit tests (vitest, pure logic only)
- `recentTags.ts` — LRU push/get/limit; persistence abstracted behind injected `{ load, save }` interface, tests use an in-memory stub.
- `settings.ts` — `normalizeSettings()` with partial, malformed, out-of-range inputs.
- `tagIndex.ts` pure-logic layer:
  - `sortTagsForEmptyState(tags, recent, mode)` — all four modes.
  - `filterNotesByTag(files, tag)` — including the descendant rule (`startsWith(tag + "/")`).
  - `fuzzyRank(query, items)` — basic ordering sanity.

### 8.2 Manual smoke matrix
Documented in `docs/test-plan.md`. Executed against a seeded test vault before each release:
1. Fresh vault, no tags → command → "No tags found in this vault."
2. Mixed inline + frontmatter tags → both appear, deduped, correct counts.
3. Recent ordering: pick `#foo`, reopen → `#foo` first.
4. Each `emptyStateMode` persists across reopens.
5. Fuzzy: `wrk` matches `#work` and `#weekly-review`.
6. Nested: `#project` list includes notes tagged `#project/work/urgent`.
7. Drill-down keys: `Enter` / `Cmd+Enter` / `Shift+Enter` each open in the expected leaf.
8. Backspace on empty note-query returns to tag picker with previous query intact.
9. Quick Switcher hook: `#foo` in `Cmd+O` → Tag Finder seeded with `foo`. Toggle off → no interception.
10. "Clear recent tags" empties the LRU.
11. File deleted between pick and open → `Notice`, no crash.
12. Plugin disable/enable cycle → no leaked listeners.

### 8.3 CI
GitHub Actions: `npm ci` → `tsc --noEmit` → `vitest run`. Obsidian has no headless runtime, so modal behavior and the Quick Switcher hook are verified manually only — explicitly out of CI scope.

### 8.4 Build
Standard Obsidian plugin toolchain (`obsidian-sample-plugin` scaffold): esbuild → `main.js` + `manifest.json` + `versions.json`. No custom bundler work.

## 9. Out of scope (for v1)

- Tag page creation/opening (Tag Wrangler covers this).
- Tag rename/merge operations.
- Full-text search inside tagged notes (Omnisearch covers this).
- Tree-style hierarchical drill-down through nested tags (we use flat full-path list; hierarchy is honored in *inclusion*, not *navigation*).
- Pre-built tag→file inverted index (add if performance complaints appear).
- Custom CSS / theming beyond Obsidian's defaults.
