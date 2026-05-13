import { App, WorkspaceWindow } from "obsidian";

export type QuickSwitcherReroute = (initialQueryAfterPrefix: string) => void;

/**
 * Install a document-level 'input' capture listener that detects when the
 * user has typed `triggerPrefix` as the first character in the built-in
 * Quick Switcher prompt. When that happens we close the built-in modal and
 * invoke the reroute callback with the text after the prefix.
 *
 * The listener is installed on the main document and on each popout
 * window's document, so the hook fires regardless of which window the
 * Quick Switcher was opened in.
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
      console.warn("[tag-fuzzy-find] quick-switcher hook disabled after error", err);
      return;
    }

    // Call reroute outside the DOM-inspection try/catch so that downstream
    // errors don't disable the hook. They'll surface in the console but the
    // next prefix keypress will still be intercepted.
    try {
      reroute(queryAfterPrefix);
    } catch (err) {
      console.warn("[tag-fuzzy-find] reroute callback threw", err);
    }
  };

  const attachedDocs = new Set<Document>();
  const attach = (doc: Document) => {
    if (attachedDocs.has(doc)) return;
    try {
      doc.addEventListener("input", handler, true);
      attachedDocs.add(doc);
    } catch (err) {
      console.warn("[tag-fuzzy-find] quick-switcher hook unavailable on document", err);
    }
  };

  attach(activeDocument);
  const windowOpenRef = app.workspace.on(
    "window-open",
    (_win: WorkspaceWindow, window: Window) => attach(window.document),
  );

  return () => {
    app.workspace.offref(windowOpenRef);
    for (const doc of attachedDocs) {
      try {
        doc.removeEventListener("input", handler, true);
      } catch {
        // Document may already be torn down (popout closed); ignore.
      }
    }
    attachedDocs.clear();
  };
}
