# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.3] - 2026-04-28

### Added
- `npm run lint` script using `eslint-plugin-obsidianmd` — same checks the Obsidian community-plugin reviewer bot runs.

### Fixed
- Reword two settings descriptions to avoid mid-sentence "Tag Fuzzy Find" (the `obsidianmd/ui/sentence-case` rule treats it as title case). They now refer to "this plugin" instead — no loss of clarity since the setting name still establishes context.
- Type `cache.frontmatter?.tags` as `unknown` instead of letting it fall through as `any` (silences `@typescript-eslint/no-unsafe-assignment`).

## [0.1.2] - 2026-04-27

### Fixed
- Mid-sentence "Quick" lowercased in settings descriptions (sentence case applies to mid-sentence words too, not just sub-headings). Cleared the remaining ObsidianReviewBot findings.

## [0.1.1] - 2026-04-27

### Fixed
- Address findings from the Obsidian community-plugin reviewer bot:
  - Drop unnecessary `async` modifiers on `Plugin.onunload`, `SuggestModal.onChooseSuggestion`, and the `RecentTagsStore.load` factory (each had no `await` and the parent type expects `void`).
  - Fire-and-forget `recent.push` and `leaf.openFile` with `void` so they don't bubble unhandled-promise warnings out of the `void`-typed handlers.
  - Replace a spurious non-null assertion in `onload` with a typed guard.
  - Adopt sentence case for "Quick switcher" UI strings in the settings tab (matches Obsidian's own UI).
- Removed unused `EmptyStateMode` and `NoteSuggestModal` imports from `tagSuggestModal.ts`.

## [0.1.0] - 2026-04-26

### Added
- Two-step modal: pick a tag (fuzzy-search), then pick a note tagged with it.
- Quick Switcher hook: typing a configurable trigger character (default `#`) as the first character in the built-in switcher (`Cmd+O` / `Ctrl+O`) reroutes to Tag Fuzzy Find with the rest of the input pre-filled.
- Configurable initial sort: recent-then-usage, usage, alphabetical, or blank.
- Configurable Quick Switcher trigger character: choose from `#`, `:`, `@`, `!`, `>`, `?`.
- Nested-tag inclusion (Obsidian semantics): picking `#project` includes notes tagged `#project/work` and `#project/work/urgent`.
- Drill-down keyboard shortcuts: `Enter` (current pane), `Cmd/Ctrl+Enter` (new tab), `Shift+Enter` (split), `Backspace` on empty query (back to tag picker), `Esc` (close).
- "Clear recent tags" button in settings.

[Unreleased]: https://github.com/etaiso/obsidian-tag-fuzzy-find/compare/0.1.3...HEAD
[0.1.3]: https://github.com/etaiso/obsidian-tag-fuzzy-find/releases/tag/0.1.3
[0.1.2]: https://github.com/etaiso/obsidian-tag-fuzzy-find/releases/tag/0.1.2
[0.1.1]: https://github.com/etaiso/obsidian-tag-fuzzy-find/releases/tag/0.1.1
[0.1.0]: https://github.com/etaiso/obsidian-tag-fuzzy-find/releases/tag/0.1.0
