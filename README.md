# Tag Fuzzy Find

Obsidian plugin: type `#` in a modal to fuzzy-find a tag, then drill into notes that use it.

## Features
- Dedicated "Tag Fuzzy Find: Open" command (bind your own hotkey).
- `#`-prefix interop with the built-in Quick Switcher.
- Two-step flow: tag picker → note picker, preserving your query on Backspace.
- Nested-tag inclusion (selecting `#project` surfaces notes tagged `#project/work/urgent`).
- Configurable initial sort (recent/usage/alphabetical/blank).

## Local development

### 1. Clone and build
```bash
git clone <this-repo>
cd obsidian-tag-fuzzy-find
npm install
npm run dev   # esbuild in watch mode → rewrites main.js on every save
```

### 2. Create a dedicated test vault
Open Obsidian → **Create new vault** (not your real one). Example path: `~/Documents/TagFuzzyFindTestVault`.

### 3. Symlink the plugin into the test vault
```bash
mkdir -p ~/Documents/TagFuzzyFindTestVault/.obsidian/plugins
ln -s "$(pwd)" ~/Documents/TagFuzzyFindTestVault/.obsidian/plugins/obsidian-tag-fuzzy-find
```

### 4. Enable the plugin in Obsidian
Settings → Community plugins → turn off Safe Mode → refresh list → enable "Tag Fuzzy Find".

### 5. (Recommended) Install Hot Reload
Install the community plugin **Hot Reload** (by pjeby) in the same test vault. It auto-reloads Tag Fuzzy Find whenever `main.js` changes — no Obsidian restart needed.

### 6. Seed the vault with test data
```bash
npx tsx scripts/seed-vault.ts ~/Documents/TagFuzzyFindTestVault
```
Restart Obsidian once to index the seeded files.

### 7. Run tests
```bash
npm test           # pure-logic unit tests
npm run typecheck  # tsc --noEmit
```

Obsidian itself has no headless runtime, so modal behavior and the Quick Switcher hook are verified manually — see `docs/test-plan.md`.
