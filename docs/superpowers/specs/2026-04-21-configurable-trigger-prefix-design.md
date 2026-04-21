# Configurable Quick Switcher Trigger Prefix — Design Spec

**Date:** 2026-04-21
**Status:** Approved — ready for implementation planning
**Extends:** `2026-04-21-tag-finder-design.md`

## 1. Problem & Goal

The Quick Switcher hook currently hard-codes `#` as the trigger: typing `#foo` in the built-in Quick Switcher reroutes to Tag Finder. This conflicts with a user's ability to fuzzy-search filenames that naturally start with `#`. A user who has files like `# Meeting Notes.md` or who simply wants to reserve `#` for literal typing in the QS needs a way to pick a different, less-collision-prone trigger character.

**Goal:** let users choose the trigger character via a small dropdown in settings. Default remains `#`. The change affects **only** the hook's detection; Tag Finder's modal continues to display tags with Obsidian's canonical `#` prefix (because that's how Obsidian stores them).

## 2. User-facing behavior

1. **Settings → Community plugins → Tag Finder → new setting "Quick Switcher trigger"** between "Initial sort" and "Integrate with Quick Switcher".
2. **Dropdown** with 6 preset options:
   - `#` — Hash (default)
   - `:` — Colon
   - `@` — At sign
   - `!` — Exclamation mark
   - `>` — Greater than
   - `?` — Question mark
3. **On change**: the setting is persisted, and the Quick Switcher hook is re-installed with the new prefix so the change takes effect immediately (no plugin reload).
4. **If the hook is disabled** (the "Integrate with Quick Switcher" toggle is off), the trigger setting is still persisted and visible but has no live effect until the hook is re-enabled.
5. **Tag Finder modal display is unchanged**: tags are shown as `#project/work · 12 notes` regardless of the trigger setting. The trigger is purely the keyboard shortcut character.

## 3. Data model

Add one field to `PluginSettings`:
```ts
export type TriggerPrefix = "#" | ":" | "@" | "!" | ">" | "?";

export type PluginSettings = {
  emptyStateMode: EmptyStateMode;
  enableQuickSwitcherHook: boolean;
  recentLimit: number;
  triggerPrefix: TriggerPrefix;  // new, default "#"
};

export const DEFAULT_SETTINGS: PluginSettings = {
  // ...existing...
  triggerPrefix: "#",
};
```

And a shared constant for the allowlist:
```ts
export const VALID_PREFIXES: TriggerPrefix[] = ["#", ":", "@", "!", ">", "?"];
```

## 4. Per-file changes

### 4.1 `src/types.ts`
- Add `TriggerPrefix` union type.
- Add `triggerPrefix` field to `PluginSettings`.
- Add `triggerPrefix: "#"` to `DEFAULT_SETTINGS`.
- Export `VALID_PREFIXES` array.

### 4.2 `src/settings.ts`
- Add an `isValidPrefix(v: unknown): v is TriggerPrefix` guard, shape mirrors the existing `isValidMode`.
- In `normalizeSettings()`, read `source.triggerPrefix` and fall back to `DEFAULT_SETTINGS.triggerPrefix` if invalid.

### 4.3 `src/settingsTab.ts`
- Add a new `new Setting(containerEl).setName("Quick Switcher trigger")` block.
- Placed between the existing "Initial sort" and "Integrate with Quick Switcher" settings.
- Uses `addDropdown` with 6 entries. Labels match the list in §2.
- `onChange`: writes to `plugin.settings.triggerPrefix`, awaits `plugin.savePluginData()`, calls `plugin.refreshQuickSwitcherHook()`.

### 4.4 `src/quickSwitcherHook.ts`
- Signature change:
  ```ts
  export function installQuickSwitcherHook(
    app: App,
    reroute: QuickSwitcherReroute,
    triggerPrefix: string,
  ): () => void
  ```
- Replace `value.startsWith("#")` with `value.startsWith(triggerPrefix)`.
- Replace `value.slice(1)` with `value.slice(triggerPrefix.length)` — future-proof even though current prefixes are single-char.

### 4.5 `src/main.ts`
- In `refreshQuickSwitcherHook()`, pass `this.settings.triggerPrefix` as the third arg to `installQuickSwitcherHook`.

## 5. Testing

### 5.1 Unit tests (`tests/settings.test.ts`) — additions
- Valid `triggerPrefix` (each of the 6) is kept.
- Invalid values fall back to `"#"`: empty string `""`, multi-char `"##"`, disallowed char `"a"`, whitespace `" "`, non-string types `42`, `null`.
- Missing `triggerPrefix` key defaults to `"#"`.

### 5.2 Manual smoke additions (add rows to `docs/test-plan.md`)
- Change trigger to `:`, Cmd+O, type `:foo` → Tag Finder opens with `foo` seeded.
- With trigger `:`, typing `#foo` in QS does NOT trigger Tag Finder.
- Toggle hook off; change trigger; toggle hook back on → new trigger is active.

## 6. Error handling

- Malformed persisted prefix (hand-edited `data.json` with gibberish) → caught by `normalizeSettings()` fallback to `"#"`. Already consistent with how other settings fields are handled.

## 7. Out of scope

- **Free-text / custom-char input.** Explicit dropdown only; no validation loop for arbitrary user input.
- **Multi-character prefixes.** The signature supports it (`slice(triggerPrefix.length)`) but there's no UI path to set one.
- **Per-vault override.** One prefix per vault only, via the plugin's own data.json.
- **Display-prefix cosmetic change in Tag Finder modal.** Tags always display with `#` to match Obsidian's storage format.
