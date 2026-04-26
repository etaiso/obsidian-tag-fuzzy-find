# Configurable Trigger Prefix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users pick the Quick Switcher trigger character (one of 6 presets, default `#`) via a settings dropdown, replacing the hardcoded `#` in `quickSwitcherHook.ts`.

**Architecture:** Add `triggerPrefix` to `PluginSettings` with a 6-option allowlist. `normalizeSettings()` validates it. The settings UI exposes a dropdown that re-installs the hook on change. `installQuickSwitcherHook()` accepts the prefix as a third parameter, replacing both the `startsWith("#")` check and the `slice(1)` operation.

**Tech Stack:** TypeScript, Obsidian SDK, vitest. No new dependencies.

---

## File Structure

**Modify** (5 files):
- `src/types.ts` — add `TriggerPrefix` union, `VALID_PREFIXES` constant, extend `PluginSettings` and `DEFAULT_SETTINGS`.
- `src/settings.ts` — add `isValidPrefix` guard, validate `triggerPrefix` in `normalizeSettings()`.
- `tests/settings.test.ts` — add validation cases for the new field.
- `src/quickSwitcherHook.ts` — accept `triggerPrefix` parameter, use it in detection and slicing.
- `src/main.ts` — pass `this.settings.triggerPrefix` to `installQuickSwitcherHook`.
- `src/settingsTab.ts` — add the "Quick Switcher trigger" dropdown setting.
- `docs/test-plan.md` — add 3 new manual smoke matrix rows.

No new files. No new dependencies.

---

## Task 1: Extend `types.ts`

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Replace the file contents**

Open `/Users/etais/Projects/obsidian-tag-finder/src/types.ts` and replace its entire content with:

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

export type TriggerPrefix = "#" | ":" | "@" | "!" | ">" | "?";

export const VALID_PREFIXES: TriggerPrefix[] = ["#", ":", "@", "!", ">", "?"];

export type PluginSettings = {
  emptyStateMode: EmptyStateMode;
  enableQuickSwitcherHook: boolean;
  /** 0..30; 0 disables recent-tags entirely. */
  recentLimit: number;
  /** Single-character prefix that activates the Quick Switcher hook. */
  triggerPrefix: TriggerPrefix;
};

export const DEFAULT_SETTINGS: PluginSettings = {
  emptyStateMode: "recent-then-usage",
  enableQuickSwitcherHook: true,
  recentLimit: 10,
  triggerPrefix: "#",
};

/** Shape of the blob stored via plugin.saveData(). */
export type PersistedData = {
  settings: PluginSettings;
  recentTags: string[];
};
```

- [ ] **Step 2: Verify typecheck**

Run from `/Users/etais/Projects/obsidian-tag-finder`:
```bash
npm run typecheck
```
Expected: errors will appear in `src/settings.ts` and `src/main.ts` because the new required field isn't yet handled. That's expected — Tasks 2 and 4 fix them.

The errors should look something like:
```
src/settings.ts:25:10 - error TS2741: Property 'triggerPrefix' is missing in type ...
```

- [ ] **Step 3: Don't commit yet**

This task's changes will be committed at the end of Task 2 together with the matching test/normalization changes, because committing types alone leaves the build broken.

---

## Task 2: Update `normalizeSettings` (TDD)

**Files:**
- Modify: `tests/settings.test.ts`
- Modify: `src/settings.ts`

- [ ] **Step 1: Add failing tests**

Open `/Users/etais/Projects/obsidian-tag-finder/tests/settings.test.ts`. Inside the existing `describe("normalizeSettings", ...)` block, append the following `it(...)` cases just before the closing `});`:

```ts
  it("keeps each valid triggerPrefix", () => {
    for (const prefix of ["#", ":", "@", "!", ">", "?"] as const) {
      expect(normalizeSettings({ triggerPrefix: prefix }).triggerPrefix).toBe(prefix);
    }
  });

  it("falls back to '#' when triggerPrefix is missing", () => {
    expect(normalizeSettings({}).triggerPrefix).toBe("#");
  });

  it("falls back to '#' when triggerPrefix is invalid", () => {
    const cases = ["", "##", "a", "Z", "1", " ", "/", null, 42, ["#"], { v: "#" }];
    for (const bad of cases) {
      expect(normalizeSettings({ triggerPrefix: bad }).triggerPrefix).toBe("#");
    }
  });
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test
```
Expected: the three new tests fail because `normalizeSettings` does not yet read `triggerPrefix` (the field will be `undefined` on the result, not `"#"`).

- [ ] **Step 3: Implement `triggerPrefix` validation in `src/settings.ts`**

Replace the entire file `/Users/etais/Projects/obsidian-tag-finder/src/settings.ts` with:

```ts
import {
  DEFAULT_SETTINGS,
  EmptyStateMode,
  PluginSettings,
  TriggerPrefix,
  VALID_PREFIXES,
} from "./types";

const VALID_MODES: EmptyStateMode[] = ["recent-then-usage", "usage", "alphabetical", "blank"];

function isValidMode(v: unknown): v is EmptyStateMode {
  return typeof v === "string" && (VALID_MODES as string[]).includes(v);
}

function isValidPrefix(v: unknown): v is TriggerPrefix {
  return typeof v === "string" && (VALID_PREFIXES as string[]).includes(v);
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

  const triggerPrefix = isValidPrefix(source.triggerPrefix)
    ? source.triggerPrefix
    : DEFAULT_SETTINGS.triggerPrefix;

  return { emptyStateMode, enableQuickSwitcherHook, recentLimit, triggerPrefix };
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test
```
Expected: all settings tests pass (8 original + 3 new = 11 in `tests/settings.test.ts`). `tests/recentTags.test.ts` and `tests/tagIndex.test.ts` still pass. Total: 32 across 3 files.

- [ ] **Step 5: Run typecheck**

```bash
npm run typecheck
```
Expected: still failing in `src/main.ts` because `installQuickSwitcherHook` doesn't yet accept the new arg. That's fixed in Task 3.

- [ ] **Step 6: Don't commit yet**

The build is still broken at `src/main.ts`. We commit Tasks 1+2+3+4 together at the end of Task 4 (single atomic feature commit), because the type extension, validation, hook signature, and main.ts wiring are mutually dependent and committing them separately would each leave a broken build.

---

## Task 3: Extend `installQuickSwitcherHook` signature

**Files:**
- Modify: `src/quickSwitcherHook.ts`

- [ ] **Step 1: Update the file**

Replace the entire content of `/Users/etais/Projects/obsidian-tag-finder/src/quickSwitcherHook.ts` with:

```ts
import { App } from "obsidian";

export type QuickSwitcherReroute = (initialQueryAfterPrefix: string) => void;

/**
 * Install a document-level 'input' capture listener that detects when the
 * user has typed `triggerPrefix` as the first character in the built-in
 * Quick Switcher prompt. When that happens we close the built-in modal and
 * invoke the reroute callback with the text after the prefix.
 *
 * Returns an uninstaller. DOM-inspection errors (e.g. Obsidian changes the
 * switcher internals) permanently disable the hook for the session; errors
 * thrown by the `reroute` callback are logged but do NOT disable the hook.
 */
export function installQuickSwitcherHook(
  app: App,
  reroute: QuickSwitcherReroute,
  triggerPrefix: string,
): () => void {
  let disabled = false;

  const handler = (evt: Event) => {
    if (disabled) return;

    let queryAfterPrefix: string;
    try {
      const target = evt.target as HTMLElement | null;
      if (!(target instanceof HTMLInputElement)) return;

      // The built-in Quick Switcher prompt lives inside a `.prompt` container
      // with a `.prompt-input-container` wrapping the input. This check keeps
      // us from hijacking unrelated inputs.
      if (!target.closest(".prompt .prompt-input-container")) return;

      const value = target.value;
      if (!value.startsWith(triggerPrefix)) return;

      // Stop the event from reaching the Quick Switcher's own input handler.
      evt.stopPropagation();
      evt.stopImmediatePropagation();

      // Close the Quick Switcher by dispatching Escape to its input.
      // `app.workspace.activeModal` is not reliably exposed across Obsidian
      // builds; Escape-dispatch uses the modal's own keymap and always works.
      target.dispatchEvent(new KeyboardEvent("keydown", {
        key: "Escape",
        code: "Escape",
        keyCode: 27,
        which: 27,
        bubbles: true,
        cancelable: true,
      }));

      queryAfterPrefix = value.slice(triggerPrefix.length);
    } catch (err) {
      disabled = true;
      console.warn("[tag-finder] quick-switcher hook disabled after error", err);
      return;
    }

    // Call reroute outside the DOM-inspection try/catch so that downstream
    // errors don't disable the hook. They'll surface in the console but the
    // next prefix keypress will still be intercepted.
    try {
      reroute(queryAfterPrefix);
    } catch (err) {
      console.warn("[tag-finder] reroute callback threw", err);
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

Key changes vs. the previous version:
- New third parameter: `triggerPrefix: string`
- `value.startsWith("#")` → `value.startsWith(triggerPrefix)`
- `value.slice(1)` → `value.slice(triggerPrefix.length)`
- Renamed local `queryAfterHash` → `queryAfterPrefix` and matching JSDoc / type `QuickSwitcherReroute` parameter name.

The unused `app` parameter is left in place: it's part of the documented signature for future flexibility (e.g. closing the active modal via Obsidian APIs if Escape ever stops working).

- [ ] **Step 2: Verify typecheck**

```bash
npm run typecheck
```
Expected: still one error remaining in `src/main.ts:installQuickSwitcherHook` call (only 2 args provided). Task 4 fixes it.

- [ ] **Step 3: Don't commit yet** — see Task 4 step 4.

---

## Task 4: Wire `triggerPrefix` through `main.ts`

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Locate the `refreshQuickSwitcherHook` method**

Open `/Users/etais/Projects/obsidian-tag-finder/src/main.ts` and find the existing `refreshQuickSwitcherHook` method. It currently looks like this:

```ts
  refreshQuickSwitcherHook() {
    this.uninstallHook?.();
    this.uninstallHook = null;
    if (this.settings.enableQuickSwitcherHook) {
      this.uninstallHook = installQuickSwitcherHook(this.app, (q) => this.openTagPicker(q));
    }
  }
```

- [ ] **Step 2: Pass `triggerPrefix` as the third argument**

Replace the body of `refreshQuickSwitcherHook` with:

```ts
  refreshQuickSwitcherHook() {
    this.uninstallHook?.();
    this.uninstallHook = null;
    if (this.settings.enableQuickSwitcherHook) {
      this.uninstallHook = installQuickSwitcherHook(
        this.app,
        (q) => this.openTagPicker(q),
        this.settings.triggerPrefix,
      );
    }
  }
```

No other changes to `main.ts` are needed for this feature — the settings tab change is in a separate file, and `savePluginData` already serializes the entire `this.settings` object, so the new field is persisted automatically.

- [ ] **Step 3: Full verification pass**

```bash
npm run typecheck
npm test
npm run build
```
Expected: clean typecheck, 32 tests pass, `main.js` produced.

- [ ] **Step 4: Commit Tasks 1–4 together**

```bash
git add src/types.ts src/settings.ts src/quickSwitcherHook.ts src/main.ts tests/settings.test.ts
git commit -m "feat(settings): add triggerPrefix with 6-option allowlist"
```

This is the first commit of the feature: the type, validation, hook, and main.ts wiring are mutually dependent and ship together. The settings UI in Task 5 is a separate concern (UI for an already-functional setting).

---

## Task 5: Settings UI dropdown

**Files:**
- Modify: `src/settingsTab.ts`

- [ ] **Step 1: Read the current settings tab**

Open `/Users/etais/Projects/obsidian-tag-finder/src/settingsTab.ts` and locate the existing `display()` method. The settings are added in this order today:
1. "Initial sort" dropdown (emptyStateMode)
2. "Integrate with Quick Switcher" toggle (enableQuickSwitcherHook)
3. "Recent tags to remember" slider (recentLimit)
4. "Recent tags" / "Clear recent tags" button

We will insert the new "Quick Switcher trigger" setting between #1 and #2.

- [ ] **Step 2: Add the new setting block**

Find the existing block:

```ts
    new Setting(containerEl)
      .setName("Integrate with Quick Switcher")
```

Immediately ABOVE that block, insert:

```ts
    new Setting(containerEl)
      .setName("Quick Switcher trigger")
      .setDesc("First character to type in the Quick Switcher to open Tag Finder.")
      .addDropdown(dd =>
        dd
          .addOptions({
            "#": "# (Hash)",
            ":": ": (Colon)",
            "@": "@ (At sign)",
            "!": "! (Exclamation mark)",
            ">": "> (Greater than)",
            "?": "? (Question mark)",
          })
          .setValue(plugin.settings.triggerPrefix)
          .onChange(async value => {
            plugin.settings.triggerPrefix = value as typeof plugin.settings.triggerPrefix;
            await plugin.savePluginData();
            plugin.refreshQuickSwitcherHook();
          }),
      );

```

(The trailing blank line keeps consistent spacing with the other Setting blocks.)

- [ ] **Step 3: Verify build**

```bash
npm run typecheck
npm test
npm run build
```
Expected: clean typecheck, 32 tests pass, `main.js` produced.

- [ ] **Step 4: Commit**

```bash
git add src/settingsTab.ts
git commit -m "feat(settings-ui): add Quick Switcher trigger dropdown"
```

---

## Task 6: Update the manual smoke matrix

**Files:**
- Modify: `docs/test-plan.md`

- [ ] **Step 1: Append three rows**

Open `/Users/etais/Projects/obsidian-tag-finder/docs/test-plan.md` and append the following rows to the end of the Markdown table (renumber starting from 17 to follow row 16):

```markdown
| 17 | Trigger prefix `:` works | Settings → Quick Switcher trigger → `:`; Cmd+O; type `:foo` | Built-in switcher closes, Tag Finder opens with `foo` pre-filled |
| 18 | Old prefix no longer triggers | With trigger set to `:`; Cmd+O; type `#foo` | Built-in switcher behaves normally — Tag Finder is NOT opened |
| 19 | Hook re-arms on toggle cycle | Hook OFF → change trigger to `@` → Hook ON; Cmd+O; type `@x` | Tag Finder opens with `x`. Toggle off and `@x` should NOT trigger anymore |
```

- [ ] **Step 2: Commit**

```bash
git add docs/test-plan.md
git commit -m "docs(test-plan): add manual rows for triggerPrefix"
```

---

## Self-review notes

- **Spec coverage (§1–7 of `2026-04-21-configurable-trigger-prefix-design.md`):**
  - §2 user-facing behavior — Tasks 1, 4, 5 (data + wiring + UI). The "no live effect when hook disabled" guarantee comes for free because `refreshQuickSwitcherHook()` exits early when `enableQuickSwitcherHook` is false.
  - §3 data model — Task 1 adds the union, the constant, the field, the default.
  - §4.1 types.ts — Task 1.
  - §4.2 settings.ts — Task 2.
  - §4.3 settingsTab.ts — Task 5.
  - §4.4 quickSwitcherHook.ts — Task 3.
  - §4.5 main.ts — Task 4.
  - §5.1 unit tests — Task 2.
  - §5.2 manual smoke rows — Task 6.
  - §6 error handling — covered by `normalizeSettings` fallback in Task 2.
  - §7 out of scope — observed (no free-text input, no per-vault override, no display change).

- **Type consistency:** `TriggerPrefix`, `VALID_PREFIXES`, and the dropdown labels all reference the same 6 characters in the same order across all tasks. The hook parameter is typed as plain `string` (not `TriggerPrefix`) because the hook itself doesn't need the narrower type — the validation already happened upstream in `normalizeSettings`. This matches the existing pattern (`emptyStateMode` is also `string`-typed at consumption sites).

- **No placeholders.** All step bodies contain exact code or exact commands.

- **Atomic feature commit:** Tasks 1–4 ship together because the build is broken between them; Tasks 5 and 6 are each independently shippable on top.
