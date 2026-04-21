import { App } from "obsidian";

export type QuickSwitcherReroute = (initialQueryAfterHash: string) => void;

/**
 * Install a document-level 'input' capture listener that detects when the
 * user has typed '#' as the first character in the built-in Quick Switcher
 * prompt. When that happens we close the built-in modal and invoke the
 * reroute callback with the text after the '#'.
 *
 * Returns an uninstaller. DOM-inspection errors (e.g. Obsidian changes the
 * switcher internals) permanently disable the hook for the session; errors
 * thrown by the `reroute` callback are logged but do NOT disable the hook.
 */
export function installQuickSwitcherHook(app: App, reroute: QuickSwitcherReroute): () => void {
  let disabled = false;

  const handler = (evt: Event) => {
    if (disabled) return;

    let queryAfterHash: string;
    try {
      const target = evt.target as HTMLElement | null;
      if (!(target instanceof HTMLInputElement)) return;

      // The built-in Quick Switcher prompt lives inside a `.prompt` container
      // with a `.prompt-input-container` wrapping the input. This check keeps
      // us from hijacking unrelated inputs.
      if (!target.closest(".prompt .prompt-input-container")) return;

      const value = target.value;
      if (!value.startsWith("#")) return;

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

      queryAfterHash = value.slice(1);
    } catch (err) {
      disabled = true;
      console.warn("[tag-finder] quick-switcher hook disabled after error", err);
      return;
    }

    // Call reroute outside the DOM-inspection try/catch so that downstream
    // errors don't disable the hook. They'll surface in the console but the
    // next '#' keypress will still be intercepted.
    try {
      reroute(queryAfterHash);
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
