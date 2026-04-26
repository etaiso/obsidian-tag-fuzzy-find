# Tag Fuzzy Find

A Quick Switcher for tags. Fuzzy-find any tag in your vault, then jump straight to a note that uses it — without leaving the keyboard.

> Status: pre-release. Not yet listed in the Obsidian Community Plugins marketplace; install manually via [Releases](https://github.com/etaiso/obsidian-tag-fuzzy-find/releases) until it is approved.

## What it does

Obsidian's built-in Quick Switcher finds files and headings, but there's no first-class way to find a *tag*. Tag Fuzzy Find fills that gap:

1. Open the modal — fuzzy-search every tag in your vault, with usage counts.
2. Pick one — drill straight into the notes that carry it.
3. Pick a note — open it in the current pane, a new tab, or a split.

It honors Obsidian's nested-tag semantics: choosing `#project` surfaces notes tagged `#project/work/urgent` too.

## Features

- **Two-step flow.** Tag picker → note picker. `Backspace` on an empty query takes you back to the tag picker, with your previous query preserved.
- **Quick Switcher hook.** Typing a configurable prefix character (default `#`) as the first character in the built-in `Cmd+O` switcher reroutes you straight into Tag Fuzzy Find. Works with `:`, `@`, `!`, `>`, `?` if `#` collides with your file names.
- **Smart initial ordering.** Default: recently-picked tags first, then the rest by usage. Switch to alphabetical or usage-only in settings.
- **Nested tag inclusion.** `#project` includes `#project/work`, `#project/work/urgent`, etc.
- **Standard keyboard shortcuts.** `Enter` opens in current pane, `Cmd/Ctrl+Enter` opens in a new tab, `Shift+Enter` opens in a split, `Esc` closes.
- **Zero ceremony.** No background indexing, no extra settings panes — runs entirely on Obsidian's existing metadata cache.

## Installation

### Manual (until merged into the Community Plugins marketplace)

1. Download `main.js` and `manifest.json` from the [latest release](https://github.com/etaiso/obsidian-tag-fuzzy-find/releases).
2. Create the folder `<your-vault>/.obsidian/plugins/obsidian-tag-fuzzy-find/`.
3. Copy `main.js` and `manifest.json` into it.
4. In Obsidian: Settings → Community plugins → turn off Restricted Mode → enable **Tag Fuzzy Find**.

### Via [BRAT](https://github.com/TfTHacker/obsidian42-brat)

Add the repo URL `etaiso/obsidian-tag-fuzzy-find` in BRAT and it will install the latest release.

### Via Community Plugins

Once approved, search for **Tag Fuzzy Find** in Settings → Community plugins → Browse.

## Usage

### Open the plugin

Either way works:

- Run the command **Tag Fuzzy Find: Open** from the command palette (`Cmd/Ctrl+P`). Bind a hotkey in Settings → Hotkeys for fastest access.
- Press `Cmd/Ctrl+O` to open the built-in Quick Switcher, then type the configured trigger character (default `#`). The switcher reroutes to Tag Fuzzy Find with the remaining text pre-filled.

### Navigate

| Key | Action |
|-----|--------|
| `Enter` | Open the highlighted note in the current pane |
| `Cmd/Ctrl+Enter` | Open in a new tab |
| `Shift+Enter` | Open in a split |
| `Backspace` (when query is empty) | Return to the tag picker |
| `Esc` | Close |

### Settings

| Setting | What it does | Default |
|---|---|---|
| **Initial sort** | Order of tags before you type. Recent-then-usage / Most-used / Alphabetical / Empty until typing. | Recent-then-usage |
| **Quick Switcher trigger** | First character to type in the Quick Switcher to open Tag Fuzzy Find. | `#` |
| **Integrate with Quick Switcher** | Toggle the `Cmd+O` interop. | On |
| **Recent tags to remember** | Size of the recent-tags list (0 disables it). | 10 |
| **Clear recent tags** | One-shot button to wipe the recent list. | — |

## Development

Built with TypeScript + esbuild + vitest. No runtime dependencies beyond Obsidian itself.

### Setup

```bash
git clone https://github.com/etaiso/obsidian-tag-fuzzy-find.git
cd obsidian-tag-fuzzy-find
npm install
npm run dev   # esbuild watch — rewrites main.js on save
```

### Testing locally against a real vault

1. Create a dedicated test vault in Obsidian (don't use your real one). Example: `~/Documents/TagFuzzyFindTestVault`.
2. Symlink the project into the test vault's plugins directory:
   ```bash
   mkdir -p ~/Documents/TagFuzzyFindTestVault/.obsidian/plugins
   ln -s "$(pwd)" ~/Documents/TagFuzzyFindTestVault/.obsidian/plugins/obsidian-tag-fuzzy-find
   ```
3. In Obsidian: Settings → Community plugins → turn off Restricted Mode → enable **Tag Fuzzy Find**.
4. Recommended: install the [Hot Reload](https://github.com/pjeby/hot-reload) plugin in the same vault — it auto-reloads Tag Fuzzy Find on every `main.js` rewrite.
5. Seed the vault with test data:
   ```bash
   npx tsx scripts/seed-vault.ts ~/Documents/TagFuzzyFindTestVault
   ```

### Tests

```bash
npm test           # vitest — pure-logic suites for settings, recent tags, tag index
npm run typecheck  # tsc --noEmit
```

Obsidian has no headless runtime, so modal behavior and the Quick Switcher hook are verified manually against the matrix in [`docs/test-plan.md`](docs/test-plan.md).

### Releasing

1. Bump `version` in `manifest.json` and `package.json` (keep them in sync).
2. Add an entry to `CHANGELOG.md`.
3. Commit and push.
4. Tag with the unprefixed semver version (e.g. `0.2.0`, **not** `v0.2.0`) and push the tag — the GitHub Actions release workflow will produce a draft release with `main.js` and `manifest.json` attached.
5. Review the draft release and publish it.

## License

[MIT](LICENSE) © Etai Solomon
