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
