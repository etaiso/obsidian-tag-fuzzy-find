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
    const row = el.createDiv({ cls: "tag-fuzzy-find-note-row" });
    row.createSpan({ text: item.file.basename, cls: "tag-fuzzy-find-note-title" });
    const parent = item.file.parent?.path;
    if (parent && parent !== "/") {
      row.createSpan({ text: ` — ${parent}`, cls: "tag-fuzzy-find-note-path" });
    }
  }

  async onChooseSuggestion(item: RankedFile, evt: MouseEvent | KeyboardEvent): Promise<void> {
    if ((item.file as { deleted?: boolean }).deleted) {
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
        cls: "tag-fuzzy-find-empty",
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
